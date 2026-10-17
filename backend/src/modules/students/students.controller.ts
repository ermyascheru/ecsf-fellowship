import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { query, transaction } from '../../config/db.js';

const studentCreateSchema = z.object({
  fullName: z.string().min(2, 'Full name is required'),
  phone: z.string().min(7, 'Valid phone number is required'),
  email: z.string().email('Invalid email address').optional().nullable(),
  universityStudentId: z.string().optional().nullable(),
  departmentId: z.number().int().optional().nullable(),
  academicStageId: z.number().int().optional().nullable(),
  gcClassificationId: z.number().int().optional().nullable(),
  gender: z.enum(['MALE', 'FEMALE']),
  enrollmentDate: z.string().optional().nullable(),
  participationStatus: z.enum(['ACTIVE', 'INACTIVE']).default('ACTIVE'),
  familyId: z.number().int().optional().nullable(),
  familyRole: z.enum(['DAD', 'MOM', 'MEMBER']).default('MEMBER'),
});

const studentUpdateSchema = z.object({
  fullName: z.string().min(2, 'Full name is required'),
  phone: z.string().min(7, 'Valid phone number is required'),
  email: z.string().email('Invalid email address').optional().nullable(),
  universityStudentId: z.string().optional().nullable(),
  departmentId: z.number().int().optional().nullable(),
  academicStageId: z.number().int().optional().nullable(),
  gcClassificationId: z.number().int().optional().nullable(),
  gender: z.enum(['MALE', 'FEMALE']),
  enrollmentDate: z.string().optional().nullable(),
});

export async function getStudents(req: Request, res: Response, next: NextFunction) {
  try {
    const page = Math.max(1, parseInt(req.query.page as string || '1', 10));
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit as string || '10', 10)));
    const offset = (page - 1) * limit;

    const search = (req.query.search as string || '').trim();
    const academicYear = req.query.academicYear as string;
    const category = req.query.category as string; // GC or Non-GC
    const status = req.query.status as string; // ACTIVE or INACTIVE
    const departmentId = req.query.departmentId as string;
    const familyId = req.query.familyId as string;
    const gender = req.query.gender as string;

    const conditions: string[] = ['1=1'];
    const params: any[] = [];

    if (search) {
      params.push(`%${search}%`);
      const idx = params.length;
      conditions.push(`(
        p.full_name ILIKE $${idx} OR
        p.phone ILIKE $${idx} OR
        p.email ILIKE $${idx} OR
        s.university_student_id ILIKE $${idx}
      )`);
    }

    if (academicYear && academicYear !== 'ALL') {
      params.push(parseInt(academicYear, 10));
      conditions.push(`s.academic_stage_id = $${params.length}`);
    }

    if (category && category !== 'ALL') {
      params.push(parseInt(category, 10));
      conditions.push(`s.gc_classification_id = $${params.length}`);
    }

    if (status && status !== 'ALL') {
      params.push(status);
      conditions.push(`s.participation_status = $${params.length}`);
    }

    if (departmentId && departmentId !== 'ALL') {
      params.push(parseInt(departmentId, 10));
      conditions.push(`s.department_id = $${params.length}`);
    }

    if (gender && gender !== 'ALL') {
      params.push(gender);
      conditions.push(`s.gender = $${params.length}`);
    }

    if (familyId && familyId !== 'ALL') {
      params.push(parseInt(familyId, 10));
      conditions.push(`EXISTS (
        SELECT 1 FROM family_assignments fa
        WHERE fa.person_id = s.person_id AND fa.family_id = $${params.length} AND fa.end_date IS NULL
      )`);
    }

    const whereClause = conditions.join(' AND ');

    // Count total query
    const countResult = await query(
      `SELECT COUNT(*) as total
       FROM students s
       JOIN people p ON s.person_id = p.person_id
       LEFT JOIN academic_stages ast ON s.academic_stage_id = ast.academic_stage_id
       LEFT JOIN gc_classifications gc ON s.gc_classification_id = gc.gc_classification_id
       LEFT JOIN departments d ON s.department_id = d.department_id
       WHERE ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0]?.total || '0', 10);

    // Data query with active family assignment
    const dataQuery = `
      SELECT
        s.student_id,
        s.person_id,
        p.full_name,
        p.phone,
        p.email,
        s.gender,
        s.university_student_id,
        s.department_id,
        d.department_name,
        s.academic_stage_id,
        ast.stage_name,
        ast.year_number,
        s.gc_classification_id,
        gc.classification_name as gc_classification_name,
        s.participation_status,
        s.enrollment_date,
        s.created_at,
        curr_fa.family_id,
        curr_fam.family_name,
        curr_fam.family_code,
        curr_fa.role as family_role
      FROM students s
      JOIN people p ON s.person_id = p.person_id
      LEFT JOIN academic_stages ast ON s.academic_stage_id = ast.academic_stage_id
      LEFT JOIN gc_classifications gc ON s.gc_classification_id = gc.gc_classification_id
      LEFT JOIN departments d ON s.department_id = d.department_id
      LEFT JOIN LATERAL (
        SELECT fa.family_id, fa.role
        FROM family_assignments fa
        WHERE fa.person_id = s.person_id AND fa.end_date IS NULL
        ORDER BY CASE WHEN fa.role = 'MEMBER' THEN 1 ELSE 2 END
        LIMIT 1
      ) curr_fa ON true
      LEFT JOIN families curr_fam ON curr_fa.family_id = curr_fam.family_id
      WHERE ${whereClause}
      ORDER BY p.full_name ASC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `;

    const dataResult = await query(dataQuery, [...params, limit, offset]);

    res.json({
      students: dataResult.rows.map((r) => ({
        studentId: Number(r.student_id),
        personId: Number(r.person_id),
        fullName: r.full_name,
        phone: r.phone,
        email: r.email,
        gender: r.gender,
        universityStudentId: r.university_student_id,
        departmentId: r.department_id ? Number(r.department_id) : null,
        departmentName: r.department_name,
        academicStageId: r.academic_stage_id ? Number(r.academic_stage_id) : null,
        stageName: r.stage_name,
        yearNumber: r.year_number !== null ? Number(r.year_number) : null,
        gcClassificationId: r.gc_classification_id ? Number(r.gc_classification_id) : null,
        gcClassificationName: r.gc_classification_name,
        participationStatus: r.participation_status,
        enrollmentDate: r.enrollment_date,
        createdAt: r.created_at,
        familyId: r.family_id ? Number(r.family_id) : null,
        familyName: r.family_name,
        familyCode: r.family_code,
        familyRole: r.family_role,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function getStudentById(req: Request, res: Response, next: NextFunction) {
  try {
    const studentId = parseInt(req.params.id, 10);
    if (isNaN(studentId)) {
      return res.status(400).json({ error: 'Invalid student ID.' });
    }

    const studentRes = await query(
      `SELECT
        s.student_id,
        s.person_id,
        p.full_name,
        p.phone,
        p.email,
        s.gender,
        s.university_student_id,
        s.department_id,
        d.department_name,
        s.academic_stage_id,
        ast.stage_name,
        ast.year_number,
        s.gc_classification_id,
        gc.classification_name as gc_classification_name,
        s.participation_status,
        s.participation_updated_at,
        upd_p.full_name as participation_updated_by_name,
        s.enrollment_date,
        s.created_at,
        s.updated_at
      FROM students s
      JOIN people p ON s.person_id = p.person_id
      LEFT JOIN academic_stages ast ON s.academic_stage_id = ast.academic_stage_id
      LEFT JOIN gc_classifications gc ON s.gc_classification_id = gc.gc_classification_id
      LEFT JOIN departments d ON s.department_id = d.department_id
      LEFT JOIN fellowship_accounts upd_acc ON s.participation_updated_by = upd_acc.account_id
      LEFT JOIN people upd_p ON upd_acc.person_id = upd_p.person_id
      WHERE s.student_id = $1`,
      [studentId]
    );

    if (studentRes.rows.length === 0) {
      return res.status(404).json({ error: 'Student not found.' });
    }

    const student = studentRes.rows[0];

    // Fetch active family assignment(s)
    const activeAssignmentsRes = await query(
      `SELECT
        fa.assignment_id,
        fa.family_id,
        f.family_code,
        f.family_name,
        fa.role,
        fa.start_date,
        assigner_acc.username as assigned_by_username
      FROM family_assignments fa
      JOIN families f ON fa.family_id = f.family_id
      JOIN fellowship_accounts assigner_acc ON fa.assigned_by = assigner_acc.account_id
      WHERE fa.person_id = $1 AND fa.end_date IS NULL
      ORDER BY fa.start_date DESC`,
      [student.person_id]
    );

    // Fetch historical family assignments
    const historyRes = await query(
      `SELECT
        fa.assignment_id,
        fa.family_id,
        f.family_code,
        f.family_name,
        fa.role,
        fa.start_date,
        fa.end_date,
        fa.end_reason,
        assigner_acc.username as assigned_by_username,
        ender_acc.username as ended_by_username
      FROM family_assignments fa
      JOIN families f ON fa.family_id = f.family_id
      JOIN fellowship_accounts assigner_acc ON fa.assigned_by = assigner_acc.account_id
      LEFT JOIN fellowship_accounts ender_acc ON fa.ended_by = ender_acc.account_id
      WHERE fa.person_id = $1 AND fa.end_date IS NOT NULL
      ORDER BY fa.start_date DESC`,
      [student.person_id]
    );

    // Fetch student's transfer history
    const transferHistoryRes = await query(
      `SELECT
        tr.transfer_id,
        tr.from_family_id,
        ff.family_name as from_family_name,
        tr.to_family_id,
        tf.family_name as to_family_name,
        tr.status,
        tr.reason,
        tr.requested_at,
        req_p.full_name as requested_by_name,
        tr.decided_at,
        app_p.full_name as approved_by_name,
        tr.decision_note,
        tr.is_capacity_override,
        tr.capacity_override_reason
      FROM transfer_requests tr
      LEFT JOIN families ff ON tr.from_family_id = ff.family_id
      JOIN families tf ON tr.to_family_id = tf.family_id
      JOIN fellowship_accounts req_acc ON tr.requested_by = req_acc.account_id
      JOIN people req_p ON req_acc.person_id = req_p.person_id
      LEFT JOIN fellowship_accounts app_acc ON tr.approved_by = app_acc.account_id
      LEFT JOIN people app_p ON app_acc.person_id = app_p.person_id
      WHERE tr.student_id = $1
      ORDER BY tr.requested_at DESC`,
      [studentId]
    );

    res.json({
      student: {
        studentId: Number(student.student_id),
        personId: Number(student.person_id),
        fullName: student.full_name,
        phone: student.phone,
        email: student.email,
        gender: student.gender,
        universityStudentId: student.university_student_id,
        departmentId: student.department_id ? Number(student.department_id) : null,
        departmentName: student.department_name,
        academicStageId: student.academic_stage_id ? Number(student.academic_stage_id) : null,
        stageName: student.stage_name,
        yearNumber: student.year_number !== null ? Number(student.year_number) : null,
        gcClassificationId: student.gc_classification_id ? Number(student.gc_classification_id) : null,
        gcClassificationName: student.gc_classification_name,
        participationStatus: student.participation_status,
        participationUpdatedAt: student.participation_updated_at,
        participationUpdatedByName: student.participation_updated_by_name,
        enrollmentDate: student.enrollment_date,
        createdAt: student.created_at,
        updatedAt: student.updated_at,
      },
      activeAssignments: activeAssignmentsRes.rows.map((a) => ({
        assignmentId: Number(a.assignment_id),
        familyId: Number(a.family_id),
        familyCode: a.family_code,
        familyName: a.family_name,
        role: a.role,
        startDate: a.start_date,
        assignedByUsername: a.assigned_by_username,
      })),
      assignmentHistory: historyRes.rows.map((h) => ({
        assignmentId: Number(h.assignment_id),
        familyId: Number(h.family_id),
        familyCode: h.family_code,
        familyName: h.family_name,
        role: h.role,
        startDate: h.start_date,
        endDate: h.end_date,
        endReason: h.end_reason,
        assignedByUsername: h.assigned_by_username,
        endedByUsername: h.ended_by_username,
      })),
      transferHistory: transferHistoryRes.rows.map((t) => ({
        transferId: Number(t.transfer_id),
        fromFamilyId: t.from_family_id ? Number(t.from_family_id) : null,
        fromFamilyName: t.from_family_name,
        toFamilyId: Number(t.to_family_id),
        toFamilyName: t.to_family_name,
        status: t.status,
        reason: t.reason,
        requestedAt: t.requested_at,
        requestedByName: t.requested_by_name,
        decidedAt: t.decided_at,
        approvedByName: t.approved_by_name,
        decisionNote: t.decision_note,
        isCapacityOverride: t.is_capacity_override,
        capacityOverrideReason: t.capacity_override_reason,
      })),
    });
  } catch (err) {
    next(err);
  }
}

export async function createStudent(req: Request, res: Response, next: NextFunction) {
  try {
    const data = studentCreateSchema.parse(req.body);
    const creatorAccountId = req.user!.accountId;

    const newStudent = await transaction(async (client) => {
      // 1. Check if person already exists by email if non-null
      let personId: number;

      if (data.email) {
        const existingPersonRes = await client.query(
          `SELECT person_id FROM people WHERE LOWER(email) = LOWER($1)`,
          [data.email.trim()]
        );
        if (existingPersonRes.rows.length > 0) {
          personId = Number(existingPersonRes.rows[0].person_id);
          // Check if person already has a student record
          const existingStudentRes = await client.query(
            `SELECT student_id FROM students WHERE person_id = $1`,
            [personId]
          );
          if (existingStudentRes.rows.length > 0) {
            throw new Error('A student record already exists for this person.');
          }
        } else {
          const insertPersonRes = await client.query(
            `INSERT INTO people (full_name, phone, email)
             VALUES ($1, $2, $3) RETURNING person_id`,
            [data.fullName.trim(), data.phone.trim(), data.email.trim()]
          );
          personId = Number(insertPersonRes.rows[0].person_id);
        }
      } else {
        const insertPersonRes = await client.query(
          `INSERT INTO people (full_name, phone, email)
           VALUES ($1, $2, NULL) RETURNING person_id`,
          [data.fullName.trim(), data.phone.trim()]
        );
        personId = Number(insertPersonRes.rows[0].person_id);
      }

      // 2. Insert into students table
      const insertStudentRes = await client.query(
        `INSERT INTO students (
          person_id,
          university_student_id,
          department_id,
          academic_stage_id,
          gc_classification_id,
          gender,
          enrollment_date,
          participation_status,
          participation_updated_by,
          created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING student_id`,
        [
          personId,
          data.universityStudentId?.trim() || null,
          data.departmentId || null,
          data.academicStageId || null,
          data.gcClassificationId || null,
          data.gender,
          data.enrollmentDate || null,
          data.participationStatus,
          creatorAccountId,
          creatorAccountId,
        ]
      );
      const studentId = Number(insertStudentRes.rows[0].student_id);

      // 3. Optional initial family assignment via database function fn_assign_family_role
      if (data.familyId) {
        await client.query(
          `SELECT fn_assign_family_role($1, $2, $3, $4, FALSE, NULL)`,
          [data.familyId, personId, data.familyRole, creatorAccountId]
        );
      }

      return { studentId, personId };
    });

    res.status(201).json({
      message: 'Student created successfully.',
      ...newStudent,
    });
  } catch (err) {
    next(err);
  }
}

export async function updateStudent(req: Request, res: Response, next: NextFunction) {
  try {
    const studentId = parseInt(req.params.id, 10);
    if (isNaN(studentId)) {
      return res.status(400).json({ error: 'Invalid student ID.' });
    }

    const data = studentUpdateSchema.parse(req.body);

    await transaction(async (client) => {
      // Find person_id
      const studentRes = await client.query(
        `SELECT person_id FROM students WHERE student_id = $1`,
        [studentId]
      );

      if (studentRes.rows.length === 0) {
        throw new Error('Student not found.');
      }
      const personId = studentRes.rows[0].person_id;

      // Update person
      await client.query(
        `UPDATE people
         SET full_name = $1, phone = $2, email = $3, updated_at = CURRENT_TIMESTAMP
         WHERE person_id = $4`,
        [data.fullName.trim(), data.phone.trim(), data.email ? data.email.trim() : null, personId]
      );

      // Update student
      await client.query(
        `UPDATE students
         SET university_student_id = $1,
             department_id = $2,
             academic_stage_id = $3,
             gc_classification_id = $4,
             gender = $5,
             enrollment_date = $6,
             updated_at = CURRENT_TIMESTAMP
         WHERE student_id = $7`,
        [
          data.universityStudentId?.trim() || null,
          data.departmentId || null,
          data.academicStageId || null,
          data.gcClassificationId || null,
          data.gender,
          data.enrollmentDate || null,
          studentId,
        ]
      );
    });

    res.json({ message: 'Student updated successfully.' });
  } catch (err) {
    next(err);
  }
}

export async function updateParticipationStatus(req: Request, res: Response, next: NextFunction) {
  try {
    const studentId = parseInt(req.params.id, 10);
    if (isNaN(studentId)) {
      return res.status(400).json({ error: 'Invalid student ID.' });
    }

    const { status } = z.object({ status: z.enum(['ACTIVE', 'INACTIVE']) }).parse(req.body);
    const actorAccountId = req.user!.accountId;

    const result = await query(
      `UPDATE students
       SET participation_status = $1,
           participation_updated_by = $2,
           participation_updated_at = CURRENT_TIMESTAMP
       WHERE student_id = $3
       RETURNING student_id, participation_status`,
      [status, actorAccountId, studentId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Student not found.' });
    }

    res.json({
      message: `Student participation status updated to ${status}.`,
      studentId,
      participationStatus: status,
    });
  } catch (err) {
    next(err);
  }
}
