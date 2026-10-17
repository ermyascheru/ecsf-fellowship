import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { query } from '../../config/db.js';

const familyCreateSchema = z.object({
  familyCode: z.string().min(1, 'Family code is required'),
  familyName: z.string().min(2, 'Family name is required'),
  memberCapacity: z.number().int().min(0, 'Capacity must be non-negative'),
});

const familyUpdateSchema = z.object({
  familyCode: z.string().min(1, 'Family code is required'),
  familyName: z.string().min(2, 'Family name is required'),
  memberCapacity: z.number().int().min(0, 'Capacity must be non-negative'),
  isActive: z.boolean().default(true),
});

const assignRoleSchema = z.object({
  personId: z.number().int().positive('Person ID is required'),
  role: z.enum(['DAD', 'MOM', 'MEMBER']),
  allowCapacityOverride: z.boolean().default(false),
  overrideReason: z.string().optional().nullable(),
});

const endAssignmentSchema = z.object({
  endReason: z.string().min(1, 'End reason is required'),
});

export async function getFamilies(req: Request, res: Response, next: NextFunction) {
  try {
    const search = (req.query.search as string || '').trim();
    const status = req.query.status as string; // ALL, BELOW_CAPACITY, AT_CAPACITY, OVER_CAPACITY

    const conditions: string[] = ['1=1'];
    const params: any[] = [];

    if (search) {
      params.push(`%${search}%`);
      const idx = params.length;
      conditions.push(`(f.family_name ILIKE $${idx} OR f.family_code ILIKE $${idx})`);
    }

    if (status && status !== 'ALL') {
      params.push(status);
      conditions.push(`fcs.capacity_status = $${params.length}`);
    }

    const whereClause = conditions.join(' AND ');

    const result = await query(
      `SELECT
        f.family_id,
        f.family_code,
        f.family_name,
        f.member_capacity,
        f.is_active,
        frc.active_dads_count,
        frc.active_moms_count,
        frc.active_members_count,
        frc.total_active_people_count,
        fcs.remaining_spaces,
        fcs.capacity_status,
        CASE
          WHEN fcs.capacity_status = 'OVER_CAPACITY' THEN 'Over capacity'
          WHEN fcs.capacity_status = 'AT_CAPACITY' THEN 'At capacity'
          WHEN frc.active_members_count = 0 THEN 'Below target'
          ELSE 'On track'
        END as display_status,
        (
          SELECT STRING_AGG(p.full_name || ' (' || fa.role || ')', ', ')
          FROM family_assignments fa
          JOIN people p ON fa.person_id = p.person_id
          WHERE fa.family_id = f.family_id AND fa.role IN ('DAD', 'MOM') AND fa.end_date IS NULL
        ) as leadership_summary
      FROM families f
      JOIN vw_family_role_counts frc ON f.family_id = frc.family_id
      JOIN vw_family_capacity_status fcs ON f.family_id = fcs.family_id
      WHERE ${whereClause}
      ORDER BY f.family_name ASC`,
      params
    );

    res.json({
      families: result.rows.map((r) => ({
        familyId: Number(r.family_id),
        familyCode: r.family_code,
        familyName: r.family_name,
        memberCapacity: Number(r.member_capacity),
        isActive: r.is_active,
        activeDadsCount: Number(r.active_dads_count || 0),
        activeMomsCount: Number(r.active_moms_count || 0),
        activeMembersCount: Number(r.active_members_count || 0),
        totalActivePeopleCount: Number(r.total_active_people_count || 0),
        remainingSpaces: Number(r.remaining_spaces),
        capacityStatus: r.capacity_status,
        displayStatus: r.display_status,
        leadershipSummary: r.leadership_summary || 'No assigned leadership',
      })),
    });
  } catch (err) {
    next(err);
  }
}

export async function getFamilyById(req: Request, res: Response, next: NextFunction) {
  try {
    const familyId = parseInt(req.params.id, 10);
    if (isNaN(familyId)) {
      return res.status(400).json({ error: 'Invalid family ID.' });
    }

    const familyRes = await query(
      `SELECT
        f.family_id,
        f.family_code,
        f.family_name,
        f.member_capacity,
        f.is_active,
        f.created_at,
        f.updated_at,
        fcs.active_member_count,
        fcs.remaining_spaces,
        fcs.capacity_status,
        creator.username as created_by_username
      FROM families f
      JOIN vw_family_capacity_status fcs ON f.family_id = fcs.family_id
      LEFT JOIN fellowship_accounts creator ON f.created_by = creator.account_id
      WHERE f.family_id = $1`,
      [familyId]
    );

    if (familyRes.rows.length === 0) {
      return res.status(404).json({ error: 'Family not found.' });
    }

    const family = familyRes.rows[0];

    // Leaders (Dad and Mom)
    const leadersRes = await query(
      `SELECT
        fa.assignment_id,
        fa.role,
        fa.start_date,
        p.person_id,
        p.full_name,
        p.phone,
        p.email,
        s.student_id,
        s.university_student_id
      FROM family_assignments fa
      JOIN people p ON fa.person_id = p.person_id
      LEFT JOIN students s ON p.person_id = s.person_id
      WHERE fa.family_id = $1 AND fa.role IN ('DAD', 'MOM') AND fa.end_date IS NULL
      ORDER BY fa.role ASC, p.full_name ASC`,
      [familyId]
    );

    // Active Ordinary Members
    const membersRes = await query(
      `SELECT
        fa.assignment_id,
        fa.role,
        fa.start_date,
        p.person_id,
        p.full_name,
        p.phone,
        p.email,
        s.student_id,
        s.university_student_id,
        s.gender,
        d.department_name,
        ast.stage_name as academic_stage,
        ast.year_number as academic_year,
        gc.classification_name as gc_classification,
        s.participation_status
      FROM family_assignments fa
      JOIN people p ON fa.person_id = p.person_id
      LEFT JOIN students s ON p.person_id = s.person_id
      LEFT JOIN departments d ON s.department_id = d.department_id
      LEFT JOIN academic_stages ast ON s.academic_stage_id = ast.academic_stage_id
      LEFT JOIN gc_classifications gc ON s.gc_classification_id = gc.gc_classification_id
      WHERE fa.family_id = $1 AND fa.role = 'MEMBER' AND fa.end_date IS NULL
      ORDER BY p.full_name ASC`,
      [familyId]
    );

    // Assignment History (ended)
    const historyRes = await query(
      `SELECT
        fa.assignment_id,
        fa.role,
        fa.start_date,
        fa.end_date,
        fa.end_reason,
        p.person_id,
        p.full_name,
        p.phone,
        assigner.username as assigned_by_username,
        ender.username as ended_by_username
      FROM family_assignments fa
      JOIN people p ON fa.person_id = p.person_id
      JOIN fellowship_accounts assigner ON fa.assigned_by = assigner.account_id
      LEFT JOIN fellowship_accounts ender ON fa.ended_by = ender.account_id
      WHERE fa.family_id = $1 AND fa.end_date IS NOT NULL
      ORDER BY fa.start_date DESC`,
      [familyId]
    );

    res.json({
      family: {
        familyId: Number(family.family_id),
        familyCode: family.family_code,
        familyName: family.family_name,
        memberCapacity: Number(family.member_capacity),
        isActive: family.is_active,
        activeMemberCount: Number(family.active_member_count),
        remainingSpaces: Number(family.remaining_spaces),
        capacityStatus: family.capacity_status,
        createdByUsername: family.created_by_username,
        createdAt: family.created_at,
        updatedAt: family.updated_at,
      },
      leaders: leadersRes.rows.map((l) => ({
        assignmentId: Number(l.assignment_id),
        role: l.role,
        startDate: l.start_date,
        personId: Number(l.person_id),
        fullName: l.full_name,
        phone: l.phone,
        email: l.email,
        studentId: l.student_id ? Number(l.student_id) : null,
        universityStudentId: l.university_student_id,
      })),
      members: membersRes.rows.map((m) => ({
        assignmentId: Number(m.assignment_id),
        role: m.role,
        startDate: m.start_date,
        personId: Number(m.person_id),
        fullName: m.full_name,
        phone: m.phone,
        email: m.email,
        studentId: m.student_id ? Number(m.student_id) : null,
        universityStudentId: m.university_student_id,
        gender: m.gender,
        departmentName: m.department_name,
        academicStage: m.academic_stage,
        academicYear: m.academic_year !== null ? Number(m.academic_year) : null,
        gcClassification: m.gc_classification,
        participationStatus: m.participation_status,
      })),
      history: historyRes.rows.map((h) => ({
        assignmentId: Number(h.assignment_id),
        role: h.role,
        startDate: h.start_date,
        endDate: h.end_date,
        endReason: h.end_reason,
        personId: Number(h.person_id),
        fullName: h.full_name,
        phone: h.phone,
        assignedByUsername: h.assigned_by_username,
        endedByUsername: h.ended_by_username,
      })),
    });
  } catch (err) {
    next(err);
  }
}

export async function createFamily(req: Request, res: Response, next: NextFunction) {
  try {
    const data = familyCreateSchema.parse(req.body);
    const creatorAccountId = req.user!.accountId;

    const result = await query(
      `INSERT INTO families (family_code, family_name, member_capacity, created_by)
       VALUES ($1, $2, $3, $4)
       RETURNING family_id, family_code, family_name, member_capacity, is_active, created_at`,
      [data.familyCode.trim(), data.familyName.trim(), data.memberCapacity, creatorAccountId]
    );

    res.status(201).json({
      message: 'Family created successfully.',
      family: result.rows[0],
    });
  } catch (err) {
    next(err);
  }
}

export async function updateFamily(req: Request, res: Response, next: NextFunction) {
  try {
    const familyId = parseInt(req.params.id, 10);
    if (isNaN(familyId)) {
      return res.status(400).json({ error: 'Invalid family ID.' });
    }

    const data = familyUpdateSchema.parse(req.body);

    const result = await query(
      `UPDATE families
       SET family_code = $1, family_name = $2, member_capacity = $3, is_active = $4, updated_at = CURRENT_TIMESTAMP
       WHERE family_id = $5
       RETURNING family_id, family_code, family_name, member_capacity, is_active, updated_at`,
      [data.familyCode.trim(), data.familyName.trim(), data.memberCapacity, data.isActive, familyId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Family not found.' });
    }

    res.json({
      message: 'Family updated successfully.',
      family: result.rows[0],
    });
  } catch (err) {
    next(err);
  }
}

export async function assignMemberToFamily(req: Request, res: Response, next: NextFunction) {
  try {
    const familyId = parseInt(req.params.id, 10);
    if (isNaN(familyId)) {
      return res.status(400).json({ error: 'Invalid family ID.' });
    }

    const data = assignRoleSchema.parse(req.body);
    const assignedBy = req.user!.accountId;

    // Call stored procedure fn_assign_family_role
    const result = await query(
      `SELECT fn_assign_family_role($1, $2, $3, $4, $5, $6) as assignment_id`,
      [
        familyId,
        data.personId,
        data.role,
        assignedBy,
        data.allowCapacityOverride,
        data.overrideReason?.trim() || null,
      ]
    );

    res.status(201).json({
      message: `Role ${data.role} assigned successfully.`,
      assignmentId: Number(result.rows[0].assignment_id),
    });
  } catch (err) {
    next(err);
  }
}

export async function endAssignment(req: Request, res: Response, next: NextFunction) {
  try {
    const assignmentId = parseInt(req.params.id, 10);
    if (isNaN(assignmentId)) {
      return res.status(400).json({ error: 'Invalid assignment ID.' });
    }

    const { endReason } = endAssignmentSchema.parse(req.body);
    const endedBy = req.user!.accountId;

    await query(
      `SELECT fn_end_family_assignment($1, $2, $3)`,
      [assignmentId, endedBy, endReason.trim()]
    );

    res.json({ message: 'Assignment ended successfully.' });
  } catch (err) {
    next(err);
  }
}
