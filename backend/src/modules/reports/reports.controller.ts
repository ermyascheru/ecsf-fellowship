import { Request, Response, NextFunction } from 'express';
import { query } from '../../config/db.js';
import { exportToCSV, exportToExcel, exportToPDF, ColumnDefinition } from '../../services/export.service.js';

export function getReportCatalog(req: Request, res: Response) {
  res.json({
    reports: [
      {
        id: 'family-summary',
        title: 'Family Summary',
        description: 'Comprehensive overview of family sizes, capacity, leadership, and member lists.',
        category: 'Families',
        icon: 'Home',
      },
      {
        id: 'academic-stages',
        title: 'Students by Academic Stage',
        description: 'Student distribution grouped by academic progression year (Remedial = 0 Year).',
        category: 'Students',
        icon: 'BarChart2',
      },
      {
        id: 'departments',
        title: 'Students by Department',
        description: 'Departmental breakdown and category distributions across technical faculties.',
        category: 'Students',
        icon: 'Building',
      },
      {
        id: 'gc-classification',
        title: 'Graduating Class (GC) Designation',
        description: 'Independent tracking of final-year graduating students vs continuing students.',
        category: 'Students',
        icon: 'GraduationCap',
      },
      {
        id: 'participation',
        title: 'Active / Inactive Students',
        description: 'Fellowship meeting and activity participation tracking status.',
        category: 'Fellowship',
        icon: 'CheckCircle2',
      },
      {
        id: 'family-capacity',
        title: 'Family Capacity Alerts',
        description: 'Identification of families exceeding, reaching, or below configured member capacity.',
        category: 'Families',
        icon: 'AlertTriangle',
      },
      {
        id: 'unassigned-students',
        title: 'Students Without Family',
        description: 'Students currently lacking an active ordinary fellowship family assignment.',
        category: 'Families',
        icon: 'UserMinus',
      },
      {
        id: 'missing-data',
        title: 'Incomplete Student Profiles',
        description: 'Students missing academic department, academic stage, or GC classification.',
        category: 'Data Quality',
        icon: 'FileQuestion',
      },
      {
        id: 'leadership-history',
        title: 'Family Leadership History',
        description: 'Historical appointments, tenures, and departures of Family Dads and Moms.',
        category: 'Leadership',
        icon: 'History',
      },
      {
        id: 'transfer-history',
        title: 'Transfer Request & Decision History',
        description: 'Complete audit trail of all student family transfer applications and outcomes.',
        category: 'Transfers',
        icon: 'ArrowLeftRight',
      },
    ],
  });
}

// 1. Family Summary
export async function getFamilySummary(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await query(`
      SELECT
        f.family_id,
        f.family_code,
        f.family_name,
        f.member_capacity,
        fcs.active_member_count,
        fcs.remaining_spaces,
        fcs.capacity_status,
        (
          SELECT STRING_AGG(p.full_name, ', ')
          FROM family_assignments fa
          JOIN people p ON fa.person_id = p.person_id
          WHERE fa.family_id = f.family_id AND fa.role = 'DAD' AND fa.end_date IS NULL
        ) as dads,
        (
          SELECT STRING_AGG(p.full_name, ', ')
          FROM family_assignments fa
          JOIN people p ON fa.person_id = p.person_id
          WHERE fa.family_id = f.family_id AND fa.role = 'MOM' AND fa.end_date IS NULL
        ) as moms
      FROM families f
      JOIN vw_family_capacity_status fcs ON f.family_id = fcs.family_id
      ORDER BY f.family_name ASC
    `);

    res.json({ data: result.rows });
  } catch (err) {
    next(err);
  }
}

// 2. Academic Stages
export async function getAcademicStagesReport(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await query(`SELECT * FROM vw_students_by_academic_stage`);
    res.json({ data: result.rows });
  } catch (err) {
    next(err);
  }
}

// 3. GC Classification
export async function getGcClassificationReport(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await query(`SELECT * FROM vw_students_by_gc_classification`);
    res.json({ data: result.rows });
  } catch (err) {
    next(err);
  }
}

// 4. Departments
export async function getDepartmentsReport(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await query(`SELECT * FROM vw_students_by_department`);
    res.json({ data: result.rows });
  } catch (err) {
    next(err);
  }
}

// 5. Participation
export async function getParticipationReport(req: Request, res: Response, next: NextFunction) {
  try {
    const summary = await query(`SELECT * FROM vw_student_participation_summary`);
    const students = await query(`
      SELECT
        s.student_id,
        s.university_student_id,
        p.full_name,
        p.phone,
        p.email,
        s.participation_status,
        s.participation_updated_at,
        upd_p.full_name as updated_by_name
      FROM students s
      JOIN people p ON s.person_id = p.person_id
      LEFT JOIN fellowship_accounts upd_acc ON s.participation_updated_by = upd_acc.account_id
      LEFT JOIN people upd_p ON upd_acc.person_id = upd_p.person_id
      ORDER BY s.participation_status ASC, p.full_name ASC
    `);

    res.json({
      summary: summary.rows[0],
      data: students.rows,
    });
  } catch (err) {
    next(err);
  }
}

// 6. Family Capacity Alerts
export async function getFamilyCapacityAlerts(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await query(`SELECT * FROM vw_family_capacity_status ORDER BY active_member_count DESC`);
    res.json({ data: result.rows });
  } catch (err) {
    next(err);
  }
}

// 7. Unassigned Students
export async function getUnassignedStudents(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await query(`SELECT * FROM vw_students_unassigned_to_family`);
    res.json({ data: result.rows });
  } catch (err) {
    next(err);
  }
}

// 8. Incomplete Profiles
export async function getMissingDataReport(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await query(`SELECT * FROM vw_students_with_missing_data`);
    res.json({ data: result.rows });
  } catch (err) {
    next(err);
  }
}

// 9. Leadership History
export async function getLeadershipHistoryReport(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await query(`SELECT * FROM vw_family_leadership_history`);
    res.json({ data: result.rows });
  } catch (err) {
    next(err);
  }
}

// 10. Transfer History
export async function getTransferHistoryReport(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await query(`SELECT * FROM vw_transfer_request_history`);
    res.json({ data: result.rows });
  } catch (err) {
    next(err);
  }
}

// 11. Students Roster Report
export async function getStudentsReport(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await query(`
      SELECT
        s.student_id,
        s.university_student_id,
        p.full_name,
        p.phone,
        p.email,
        s.gender,
        d.department_name,
        ast.stage_name as academic_stage,
        COALESCE(gc.classification_name, 'None') as gc_classification,
        COALESCE(f.family_name, 'Unassigned') as family_name,
        s.participation_status
      FROM students s
      JOIN people p ON s.person_id = p.person_id
      LEFT JOIN departments d ON s.department_id = d.department_id
      LEFT JOIN academic_stages ast ON s.academic_stage_id = ast.academic_stage_id
      LEFT JOIN gc_classifications gc ON s.gc_classification_id = gc.gc_classification_id
      LEFT JOIN family_assignments fa ON s.person_id = fa.person_id AND fa.role = 'MEMBER' AND fa.end_date IS NULL
      LEFT JOIN families f ON fa.family_id = f.family_id
      ORDER BY p.full_name ASC
    `);
    res.json({ data: result.rows });
  } catch (err) {
    next(err);
  }
}

// Universal Report Export Handler
export async function exportReport(req: Request, res: Response, next: NextFunction) {
  try {
    const reportType = req.params.reportType;
    const format = (req.query.format as string || 'csv').toLowerCase();

    let queryText = '';
    let columns: ColumnDefinition[] = [];
    let title = 'FTVTI ECSF Fellowship Report';
    let filename = `ecsf_${reportType}_${Date.now()}`;

    switch (reportType) {
      case 'family-summary':
        title = 'Family Summary Report';
        columns = [
          { header: 'Family Code', key: 'family_code', width: 15 },
          { header: 'Family Name', key: 'family_name', width: 25 },
          { header: 'Dad(s)', key: 'dads', width: 25 },
          { header: 'Mom(s)', key: 'moms', width: 25 },
          { header: 'Active Members', key: 'active_member_count', width: 15 },
          { header: 'Capacity', key: 'member_capacity', width: 12 },
          { header: 'Available Spaces', key: 'remaining_spaces', width: 18 },
          { header: 'Status', key: 'capacity_status', width: 18 },
        ];
        queryText = `
          SELECT
            f.family_code,
            f.family_name,
            f.member_capacity,
            fcs.active_member_count,
            fcs.remaining_spaces,
            fcs.capacity_status,
            COALESCE((SELECT STRING_AGG(p.full_name, ', ') FROM family_assignments fa JOIN people p ON fa.person_id = p.person_id WHERE fa.family_id = f.family_id AND fa.role = 'DAD' AND fa.end_date IS NULL), 'None') as dads,
            COALESCE((SELECT STRING_AGG(p.full_name, ', ') FROM family_assignments fa JOIN people p ON fa.person_id = p.person_id WHERE fa.family_id = f.family_id AND fa.role = 'MOM' AND fa.end_date IS NULL), 'None') as moms
          FROM families f
          JOIN vw_family_capacity_status fcs ON f.family_id = fcs.family_id
          ORDER BY f.family_name ASC`;
        break;

      case 'academic-stages':
        title = 'Students by Academic Stage (Remedial = 0 Year)';
        columns = [
          { header: 'Year Number', key: 'year_number', width: 15 },
          { header: 'Stage Name', key: 'stage_name', width: 30 },
          { header: 'Total Students', key: 'total_students', width: 18 },
          { header: 'Active Students', key: 'active_students', width: 18 },
          { header: 'Inactive Students', key: 'inactive_students', width: 18 },
        ];
        queryText = `SELECT * FROM vw_students_by_academic_stage`;
        break;

      case 'departments':
        title = 'Students by Department';
        columns = [
          { header: 'Department Name', key: 'department_name', width: 35 },
          { header: 'Total Students', key: 'total_students', width: 18 },
          { header: 'Active Students', key: 'active_students', width: 18 },
          { header: 'Inactive Students', key: 'inactive_students', width: 18 },
        ];
        queryText = `SELECT * FROM vw_students_by_department`;
        break;

      case 'gc-classification':
        title = 'Graduating Class (GC) Designation Report';
        columns = [
          { header: 'Classification', key: 'gc_classification', width: 30 },
          { header: 'Total Students', key: 'total_students', width: 18 },
          { header: 'Active Students', key: 'active_students', width: 18 },
          { header: 'Inactive Students', key: 'inactive_students', width: 18 },
        ];
        queryText = `SELECT * FROM vw_students_by_gc_classification`;
        break;

      case 'unassigned-students':
        title = 'Students Without Active Family Assignment';
        columns = [
          { header: 'Student ID', key: 'university_student_id', width: 18 },
          { header: 'Full Name', key: 'full_name', width: 25 },
          { header: 'Phone', key: 'phone', width: 18 },
          { header: 'Gender', key: 'gender', width: 12 },
          { header: 'Department', key: 'department_name', width: 25 },
          { header: 'Academic Stage', key: 'academic_stage', width: 20 },
          { header: 'GC Status', key: 'gc_classification', width: 20 },
          { header: 'Participation', key: 'participation_status', width: 15 },
        ];
        queryText = `SELECT * FROM vw_students_unassigned_to_family`;
        break;

      case 'family-capacity':
        title = 'Family Capacity and Override Report';
        columns = [
          { header: 'Family Code', key: 'family_code', width: 15 },
          { header: 'Family Name', key: 'family_name', width: 25 },
          { header: 'Configured Capacity', key: 'configured_capacity', width: 20 },
          { header: 'Active Members', key: 'active_member_count', width: 18 },
          { header: 'Remaining Spaces', key: 'remaining_spaces', width: 18 },
          { header: 'Capacity Status', key: 'capacity_status', width: 18 },
        ];
        queryText = `SELECT * FROM vw_family_capacity_status`;
        break;

      case 'transfer-history':
        title = 'Transfer Request and Approval History';
        columns = [
          { header: 'ID', key: 'transfer_id', width: 10 },
          { header: 'Student', key: 'student_name', width: 25 },
          { header: 'From Family', key: 'from_family_name', width: 20 },
          { header: 'To Family', key: 'to_family_name', width: 20 },
          { header: 'Status', key: 'status', width: 15 },
          { header: 'Requested At', key: 'requested_at', width: 20 },
          { header: 'Requested By', key: 'requested_by_username', width: 18 },
          { header: 'Approved By', key: 'approved_by_username', width: 18 },
          { header: 'Capacity Override', key: 'is_capacity_override', width: 18 },
          { header: 'Override Reason', key: 'capacity_override_reason', width: 30 },
        ];
        queryText = `SELECT * FROM vw_transfer_request_history`;
        break;

      case 'students':
        title = 'Student Roster Report';
        columns = [
          { header: 'Student ID', key: 'university_student_id', width: 18 },
          { header: 'Full Name', key: 'full_name', width: 25 },
          { header: 'Phone', key: 'phone', width: 18 },
          { header: 'Email', key: 'email', width: 25 },
          { header: 'Gender', key: 'gender', width: 12 },
          { header: 'Department', key: 'department_name', width: 25 },
          { header: 'Academic Stage', key: 'academic_stage', width: 20 },
          { header: 'GC Status', key: 'gc_classification', width: 18 },
          { header: 'Family', key: 'family_name', width: 20 },
          { header: 'Participation', key: 'participation_status', width: 15 },
        ];
        queryText = `
          SELECT
            s.university_student_id,
            p.full_name,
            p.phone,
            p.email,
            s.gender,
            d.department_name,
            ast.stage_name as academic_stage,
            COALESCE(gc.classification_name, 'None') as gc_classification,
            COALESCE(f.family_name, 'Unassigned') as family_name,
            s.participation_status
          FROM students s
          JOIN people p ON s.person_id = p.person_id
          LEFT JOIN departments d ON s.department_id = d.department_id
          LEFT JOIN academic_stages ast ON s.academic_stage_id = ast.academic_stage_id
          LEFT JOIN gc_classifications gc ON s.gc_classification_id = gc.gc_classification_id
          LEFT JOIN family_assignments fa ON s.person_id = fa.person_id AND fa.role = 'MEMBER' AND fa.end_date IS NULL
          LEFT JOIN families f ON fa.family_id = f.family_id
          ORDER BY p.full_name ASC`;
        break;

      case 'participation':
        title = 'Student Fellowship Participation Report';
        columns = [
          { header: 'Student ID', key: 'university_student_id', width: 18 },
          { header: 'Full Name', key: 'full_name', width: 25 },
          { header: 'Phone', key: 'phone', width: 18 },
          { header: 'Email', key: 'email', width: 25 },
          { header: 'Participation', key: 'participation_status', width: 18 },
          { header: 'Last Updated', key: 'participation_updated_at', width: 22 },
        ];
        queryText = `
          SELECT
            s.university_student_id,
            p.full_name,
            p.phone,
            p.email,
            s.participation_status,
            s.participation_updated_at
          FROM students s
          JOIN people p ON s.person_id = p.person_id
          ORDER BY s.participation_status ASC, p.full_name ASC`;
        break;

      case 'leadership-history':
        title = 'Family Leadership History Report';
        columns = [
          { header: 'Family Code', key: 'family_code', width: 15 },
          { header: 'Family Name', key: 'family_name', width: 25 },
          { header: 'Role', key: 'role', width: 12 },
          { header: 'Leader Name', key: 'full_name', width: 25 },
          { header: 'Phone', key: 'phone', width: 18 },
          { header: 'Start Date', key: 'start_date', width: 15 },
          { header: 'End Date', key: 'end_date', width: 15 },
          { header: 'Status', key: 'assignment_status', width: 15 },
        ];
        queryText = `SELECT * FROM vw_family_leadership_history`;
        break;

      default:
        return res.status(404).json({ error: `Unknown report type: ${reportType}` });
    }

    const result = await query(queryText);
    const data = result.rows;

    if (format === 'excel') {
      return await exportToExcel(res, filename, title, columns, data);
    } else if (format === 'pdf') {
      return exportToPDF(res, filename, title, columns, data);
    } else {
      return exportToCSV(res, filename, columns, data);
    }
  } catch (err) {
    next(err);
  }
}
