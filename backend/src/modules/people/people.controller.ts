import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { query } from '../../config/db.js';

const personSchema = z.object({
  fullName: z.string().min(2, 'Full name is required'),
  phone: z.string().min(7, 'Phone number is required'),
  email: z.string().email('Invalid email address').optional().nullable(),
});

export async function getPeople(req: Request, res: Response, next: NextFunction) {
  try {
    const page = Math.max(1, parseInt(req.query.page as string || '1', 10));
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit as string || '15', 10)));
    const offset = (page - 1) * limit;
    const search = (req.query.search as string || '').trim();

    const conditions: string[] = ['1=1'];
    const params: any[] = [];

    if (search) {
      params.push(`%${search}%`);
      const idx = params.length;
      conditions.push(`(p.full_name ILIKE $${idx} OR p.phone ILIKE $${idx} OR p.email ILIKE $${idx})`);
    }

    const whereClause = conditions.join(' AND ');

    const countRes = await query(
      `SELECT COUNT(*) as total FROM people p WHERE ${whereClause}`,
      params
    );
    const total = parseInt(countRes.rows[0]?.total || '0', 10);

    const dataRes = await query(
      `SELECT
        p.person_id,
        p.full_name,
        p.phone,
        p.email,
        p.created_at,
        p.updated_at,
        s.student_id,
        s.university_student_id,
        fa.account_id,
        fa.role as account_role,
        (
          SELECT JSON_AGG(json_build_object(
            'family_id', f.family_id,
            'family_name', f.family_name,
            'family_code', f.family_code,
            'role', asgn.role
          ))
          FROM family_assignments asgn
          JOIN families f ON asgn.family_id = f.family_id
          WHERE asgn.person_id = p.person_id AND asgn.end_date IS NULL
        ) as active_family_roles
      FROM people p
      LEFT JOIN students s ON p.person_id = s.person_id
      LEFT JOIN fellowship_accounts fa ON p.person_id = fa.person_id
      WHERE ${whereClause}
      ORDER BY p.full_name ASC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, offset]
    );

    res.json({
      people: dataRes.rows.map((r) => ({
        personId: Number(r.person_id),
        fullName: r.full_name,
        phone: r.phone,
        email: r.email,
        studentId: r.student_id ? Number(r.student_id) : null,
        universityStudentId: r.university_student_id,
        accountId: r.account_id ? Number(r.account_id) : null,
        accountRole: r.account_role,
        activeFamilyRoles: r.active_family_roles || [],
        createdAt: r.created_at,
        updatedAt: r.updated_at,
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

export async function getPersonById(req: Request, res: Response, next: NextFunction) {
  try {
    const personId = parseInt(req.params.id, 10);
    if (isNaN(personId)) {
      return res.status(400).json({ error: 'Invalid person ID.' });
    }

    const personRes = await query(
      `SELECT p.*, s.student_id, s.university_student_id, fa.account_id, fa.username, fa.role as account_role
       FROM people p
       LEFT JOIN students s ON p.person_id = s.person_id
       LEFT JOIN fellowship_accounts fa ON p.person_id = fa.person_id
       WHERE p.person_id = $1`,
      [personId]
    );

    if (personRes.rows.length === 0) {
      return res.status(404).json({ error: 'Person not found.' });
    }

    const person = personRes.rows[0];

    // Family assignments history
    const assignmentsRes = await query(
      `SELECT
        fa.assignment_id,
        fa.family_id,
        f.family_code,
        f.family_name,
        fa.role,
        fa.start_date,
        fa.end_date,
        fa.end_reason,
        assigner.username as assigned_by_username,
        ender.username as ended_by_username
      FROM family_assignments fa
      JOIN families f ON fa.family_id = f.family_id
      JOIN fellowship_accounts assigner ON fa.assigned_by = assigner.account_id
      LEFT JOIN fellowship_accounts ender ON fa.ended_by = ender.account_id
      WHERE fa.person_id = $1
      ORDER BY fa.start_date DESC`,
      [personId]
    );

    res.json({
      person: {
        personId: Number(person.person_id),
        fullName: person.full_name,
        phone: person.phone,
        email: person.email,
        studentId: person.student_id ? Number(person.student_id) : null,
        universityStudentId: person.university_student_id,
        accountId: person.account_id ? Number(person.account_id) : null,
        username: person.username,
        accountRole: person.account_role,
        createdAt: person.created_at,
        updatedAt: person.updated_at,
      },
      assignments: assignmentsRes.rows.map((a) => ({
        assignmentId: Number(a.assignment_id),
        familyId: Number(a.family_id),
        familyCode: a.family_code,
        familyName: a.family_name,
        role: a.role,
        startDate: a.start_date,
        endDate: a.end_date,
        isActive: a.end_date === null,
        endReason: a.end_reason,
        assignedByUsername: a.assigned_by_username,
        endedByUsername: a.ended_by_username,
      })),
    });
  } catch (err) {
    next(err);
  }
}

export async function createPerson(req: Request, res: Response, next: NextFunction) {
  try {
    const data = personSchema.parse(req.body);

    const result = await query(
      `INSERT INTO people (full_name, phone, email)
       VALUES ($1, $2, $3)
       RETURNING person_id, full_name, phone, email, created_at`,
      [data.fullName.trim(), data.phone.trim(), data.email ? data.email.trim() : null]
    );

    res.status(201).json({
      message: 'Person record created successfully.',
      person: result.rows[0],
    });
  } catch (err) {
    next(err);
  }
}

export async function updatePerson(req: Request, res: Response, next: NextFunction) {
  try {
    const personId = parseInt(req.params.id, 10);
    if (isNaN(personId)) {
      return res.status(400).json({ error: 'Invalid person ID.' });
    }

    const data = personSchema.parse(req.body);

    const result = await query(
      `UPDATE people
       SET full_name = $1, phone = $2, email = $3, updated_at = CURRENT_TIMESTAMP
       WHERE person_id = $4
       RETURNING person_id, full_name, phone, email, updated_at`,
      [data.fullName.trim(), data.phone.trim(), data.email ? data.email.trim() : null, personId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Person not found.' });
    }

    res.json({
      message: 'Person record updated successfully.',
      person: result.rows[0],
    });
  } catch (err) {
    next(err);
  }
}
