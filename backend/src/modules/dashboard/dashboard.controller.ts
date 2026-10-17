import { Request, Response, NextFunction } from 'express';
import { query } from '../../config/db.js';

export async function getDashboardStats(req: Request, res: Response, next: NextFunction) {
  try {
    // 1. Student totals and participation
    const summaryRes = await query(`SELECT * FROM vw_student_participation_summary`);
    const summary = summaryRes.rows[0] || {
      total_students: 0,
      active_students: 0,
      inactive_students: 0,
      active_percentage: 0,
    };

    // 2. Total families
    const familiesCountRes = await query(`SELECT COUNT(*) AS total_families FROM families WHERE is_active = TRUE`);
    const totalFamilies = parseInt(familiesCountRes.rows[0]?.total_families || '0', 10);

    // 3. GC Students count
    const gcRes = await query(
      `SELECT COUNT(*) AS gc_students
       FROM students s
       JOIN gc_classifications gc ON s.gc_classification_id = gc.gc_classification_id
       WHERE gc.classification_name LIKE '%GC%' AND gc.classification_name NOT LIKE '%Non-GC%'`
    );
    const gcStudents = parseInt(gcRes.rows[0]?.gc_students || '0', 10);

    // 4. Remedial Students count (Year 0)
    const remedialRes = await query(
      `SELECT COUNT(*) AS remedial_students
       FROM students s
       JOIN academic_stages ast ON s.academic_stage_id = ast.academic_stage_id
       WHERE ast.year_number = 0`
    );
    const remedialStudents = parseInt(remedialRes.rows[0]?.remedial_students || '0', 10);

    // 5. Students without family
    const unassignedRes = await query(`SELECT COUNT(*) AS unassigned_count FROM vw_students_unassigned_to_family`);
    const unassignedStudents = parseInt(unassignedRes.rows[0]?.unassigned_count || '0', 10);

    // 6. Pending transfers count
    const pendingTransfersRes = await query(
      `SELECT COUNT(*) AS pending_count FROM transfer_requests WHERE status = 'PENDING'`
    );
    const pendingTransfers = parseInt(pendingTransfersRes.rows[0]?.pending_count || '0', 10);

    // 7. Family Capacity summary counts
    const capacityStatusRes = await query(
      `SELECT capacity_status, COUNT(*) as count
       FROM vw_family_capacity_status
       GROUP BY capacity_status`
    );

    let familiesOverCapacity = 0;
    let familiesAtCapacity = 0;
    let familiesBelowCapacity = 0;

    for (const row of capacityStatusRes.rows) {
      if (row.capacity_status === 'OVER_CAPACITY') familiesOverCapacity = parseInt(row.count, 10);
      if (row.capacity_status === 'AT_CAPACITY') familiesAtCapacity = parseInt(row.count, 10);
      if (row.capacity_status === 'BELOW_CAPACITY') familiesBelowCapacity = parseInt(row.count, 10);
    }

    res.json({
      totalStudents: parseInt(summary.total_students, 10),
      activeStudents: parseInt(summary.active_students, 10),
      inactiveStudents: parseInt(summary.inactive_students, 10),
      activePercentage: parseFloat(summary.active_percentage || '0'),
      totalFamilies,
      gcStudents,
      remedialStudents,
      unassignedStudents,
      pendingTransfers,
      familiesOverCapacity,
      familiesAtCapacity,
      familiesBelowCapacity,
    });
  } catch (err) {
    next(err);
  }
}

export async function getAcademicStageChartData(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await query(`
      SELECT
        COALESCE(ast.year_number, -1) as year_number,
        COALESCE(ast.stage_name, 'Unassigned') as stage_name,
        COUNT(s.student_id) as total,
        COUNT(s.student_id) FILTER (WHERE s.participation_status = 'ACTIVE') as active,
        COUNT(s.student_id) FILTER (WHERE s.participation_status = 'INACTIVE') as inactive
      FROM students s
      LEFT JOIN academic_stages ast ON s.academic_stage_id = ast.academic_stage_id
      GROUP BY ast.year_number, ast.stage_name, ast.display_order
      ORDER BY ast.display_order NULLS LAST, ast.year_number NULLS LAST
    `);

    // Also get GC count for chart
    const gcRes = await query(`
      SELECT COUNT(*) as gc_total
      FROM students s
      JOIN gc_classifications gc ON s.gc_classification_id = gc.gc_classification_id
      WHERE gc.classification_name LIKE '%GC%' AND gc.classification_name NOT LIKE '%Non-GC%'
    `);
    const gcTotal = parseInt(gcRes.rows[0]?.gc_total || '0', 10);

    const stages = result.rows.map((row) => ({
      yearNumber: parseInt(row.year_number, 10),
      stageName: row.stage_name.replace(/\s*\(.*?\)\s*/g, ''), // clean name like 'Remedial', 'First Year'
      total: parseInt(row.total, 10),
      active: parseInt(row.active, 10),
      inactive: parseInt(row.inactive, 10),
    }));

    res.json({
      stages,
      gcTotal,
    });
  } catch (err) {
    next(err);
  }
}

export async function getFamilyOverview(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await query(`
      SELECT
        family_id,
        family_code,
        family_name,
        configured_capacity as capacity,
        active_member_count as students,
        remaining_spaces,
        capacity_status,
        CASE
          WHEN capacity_status = 'OVER_CAPACITY' THEN 'Over capacity'
          WHEN capacity_status = 'AT_CAPACITY' THEN 'At capacity'
          WHEN active_member_count = 0 THEN 'Below target'
          ELSE 'On track'
        END as display_status
      FROM vw_family_capacity_status
      ORDER BY active_member_count DESC
      LIMIT 10
    `);

    res.json({
      families: result.rows.map((f) => ({
        familyId: Number(f.family_id),
        familyCode: f.family_code,
        familyName: f.family_name,
        capacity: Number(f.capacity),
        students: Number(f.students),
        remainingSpaces: Number(f.remaining_spaces),
        capacityStatus: f.capacity_status,
        displayStatus: f.display_status,
      })),
    });
  } catch (err) {
    next(err);
  }
}
