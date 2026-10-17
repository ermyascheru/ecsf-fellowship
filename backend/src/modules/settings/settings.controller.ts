import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { query } from '../../config/db.js';

export async function getMetadata(req: Request, res: Response, next: NextFunction) {
  try {
    const departmentsRes = await query(
      `SELECT department_id, department_name FROM departments WHERE is_active = TRUE ORDER BY department_name ASC`
    );

    const stagesRes = await query(
      `SELECT academic_stage_id, stage_name, year_number, display_order
       FROM academic_stages
       WHERE is_active = TRUE
       ORDER BY display_order ASC, year_number ASC`
    );

    const gcRes = await query(
      `SELECT gc_classification_id, classification_name, description
       FROM gc_classifications
       WHERE is_active = TRUE
       ORDER BY gc_classification_id ASC`
    );

    const familiesRes = await query(
      `SELECT family_id, family_code, family_name, member_capacity
       FROM families
       WHERE is_active = TRUE
       ORDER BY family_name ASC`
    );

    res.json({
      departments: departmentsRes.rows.map((d) => ({
        id: Number(d.department_id),
        name: d.department_name,
      })),
      academicStages: stagesRes.rows.map((s) => ({
        id: Number(s.academic_stage_id),
        name: s.stage_name,
        yearNumber: Number(s.year_number),
        displayOrder: Number(s.display_order),
      })),
      gcClassifications: gcRes.rows.map((g) => ({
        id: Number(g.gc_classification_id),
        name: g.classification_name,
        description: g.description,
      })),
      families: familiesRes.rows.map((f) => ({
        id: Number(f.family_id),
        code: f.family_code,
        name: f.family_name,
        capacity: Number(f.member_capacity),
      })),
    });
  } catch (err) {
    next(err);
  }
}

export async function addDepartment(req: Request, res: Response, next: NextFunction) {
  try {
    const { name } = z.object({ name: z.string().min(2, 'Department name is required') }).parse(req.body);
    const result = await query(
      `INSERT INTO departments (department_name) VALUES ($1) RETURNING *`,
      [name.trim()]
    );
    res.status(201).json({ message: 'Department added.', department: result.rows[0] });
  } catch (err) {
    next(err);
  }
}

export async function addAcademicStage(req: Request, res: Response, next: NextFunction) {
  try {
    const { name, yearNumber, displayOrder } = z.object({
      name: z.string().min(2),
      yearNumber: z.number().int().min(0, 'Year number must be 0 (Remedial) or higher'),
      displayOrder: z.number().int().min(0),
    }).parse(req.body);

    const result = await query(
      `INSERT INTO academic_stages (stage_name, year_number, display_order)
       VALUES ($1, $2, $3) RETURNING *`,
      [name.trim(), yearNumber, displayOrder]
    );
    res.status(201).json({ message: 'Academic stage added.', stage: result.rows[0] });
  } catch (err) {
    next(err);
  }
}

export async function addGcClassification(req: Request, res: Response, next: NextFunction) {
  try {
    const { name, description } = z.object({
      name: z.string().min(2),
      description: z.string().optional().nullable(),
    }).parse(req.body);

    const result = await query(
      `INSERT INTO gc_classifications (classification_name, description)
       VALUES ($1, $2) RETURNING *`,
      [name.trim(), description?.trim() || null]
    );
    res.status(201).json({ message: 'GC classification added.', classification: result.rows[0] });
  } catch (err) {
    next(err);
  }
}
