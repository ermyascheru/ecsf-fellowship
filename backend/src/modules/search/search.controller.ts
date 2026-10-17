import { Request, Response, NextFunction } from 'express';
import { query } from '../../config/db.js';

interface NavigationItem {
  title: string;
  category: string;
  path: string;
  description: string;
}

const APP_NAVIGATION: NavigationItem[] = [
  { title: 'Dashboard', category: 'Navigation', path: '/dashboard', description: 'Overview, key fellowship stats, and stage distribution' },
  { title: 'Students Directory', category: 'Students', path: '/students', description: 'Browse, filter, and search all enrolled fellowship students' },
  { title: 'Add New Student', category: 'Students', path: '/students/new', description: 'Register a new fellowship student' },
  { title: 'Families Directory', category: 'Families', path: '/families', description: 'View all fellowship family units, capacities, and health' },
  { title: 'Create Family', category: 'Families', path: '/families/new', description: 'Add a new fellowship family unit and set capacity limit' },
  { title: 'People Directory', category: 'People', path: '/people', description: 'Unified identity directory of students, leaders, and staff' },
  { title: 'Transfer Requests', category: 'Transfers', path: '/transfers', description: 'Review, approve, or reject student family transfer requests' },
  { title: 'Reports Catalog', category: 'Reports', path: '/reports', description: 'Browse and export all analytical fellowship reports' },
  { title: 'Family Summary Report', category: 'Reports', path: '/reports/family-summary', description: 'Family capacity, leader assignments, and health status' },
  { title: 'Student Roster Report', category: 'Reports', path: '/reports/students', description: 'Full student roster with department and stage' },
  { title: 'Academic Stages Report', category: 'Reports', path: '/reports/academic-stages', description: 'Students grouped by academic stage (Remedial Year 0 to Senior)' },
  { title: 'Department Breakdown Report', category: 'Reports', path: '/reports/departments', description: 'Student distribution across campus departments' },
  { title: 'Participation Report', category: 'Reports', path: '/reports/participation', description: 'Fellowship engagement, Active vs Inactive participants' },
  { title: 'Family Capacity Report', category: 'Reports', path: '/reports/family-capacity', description: 'Capacity utilization and override audit records' },
  { title: 'Unassigned Students Report', category: 'Reports', path: '/reports/unassigned-students', description: 'Students currently without active family membership' },
  { title: 'Leadership History Report', category: 'Reports', path: '/reports/leadership-history', description: 'Historical appointments of Family Dads and Moms' },
  { title: 'User Accounts', category: 'Admin', path: '/accounts', description: 'Administrator-only user account management and family access' },
  { title: 'System Settings', category: 'Admin', path: '/settings', description: 'Manage campus departments, academic stages, and GC classifications' },
];

export async function globalSearch(req: Request, res: Response, next: NextFunction) {
  try {
    const q = ((req.query.q as string) || '').trim();
    if (!q || q.length < 2) {
      return res.json({
        query: q,
        students: [],
        families: [],
        people: [],
        pages: [],
        totalResults: 0,
      });
    }

    const searchPattern = `%${q}%`;

    // 1. Search Students
    const studentsRes = await query(
      `SELECT
        s.student_id,
        s.university_student_id,
        p.full_name,
        p.phone,
        p.email,
        d.department_name,
        ast.stage_name as academic_stage,
        gc.classification_name as gc_classification,
        f.family_name,
        f.family_id,
        s.participation_status
      FROM students s
      JOIN people p ON s.person_id = p.person_id
      LEFT JOIN departments d ON s.department_id = d.department_id
      LEFT JOIN academic_stages ast ON s.academic_stage_id = ast.academic_stage_id
      LEFT JOIN gc_classifications gc ON s.gc_classification_id = gc.gc_classification_id
      LEFT JOIN family_assignments fa ON s.person_id = fa.person_id AND fa.role = 'MEMBER' AND fa.end_date IS NULL
      LEFT JOIN families f ON fa.family_id = f.family_id
      WHERE p.full_name ILIKE $1
         OR s.university_student_id ILIKE $1
         OR p.phone ILIKE $1
         OR p.email ILIKE $1
      ORDER BY
        CASE WHEN p.full_name ILIKE $2 THEN 1 ELSE 2 END,
        p.full_name ASC
      LIMIT 6`,
      [searchPattern, `${q}%`]
    );

    // 2. Search Families
    const familiesRes = await query(
      `SELECT
        f.family_id,
        f.family_code,
        f.family_name,
        f.member_capacity,
        fcs.active_member_count,
        fcs.capacity_status
      FROM families f
      LEFT JOIN vw_family_capacity_status fcs ON f.family_id = fcs.family_id
      WHERE f.family_name ILIKE $1 OR f.family_code ILIKE $1
      ORDER BY f.family_name ASC
      LIMIT 5`,
      [searchPattern]
    );

    // 3. Search People
    const peopleRes = await query(
      `SELECT
        p.person_id,
        p.full_name,
        p.phone,
        p.email,
        s.student_id,
        (
          SELECT STRING_AGG(fa.role::text, ', ')
          FROM family_assignments fa
          WHERE fa.person_id = p.person_id AND fa.end_date IS NULL
        ) as family_roles,
        (
          SELECT role
          FROM fellowship_accounts fa
          WHERE fa.person_id = p.person_id
        ) as account_role
      FROM people p
      LEFT JOIN students s ON p.person_id = s.person_id
      WHERE p.full_name ILIKE $1
         OR p.phone ILIKE $1
         OR p.email ILIKE $1
      ORDER BY p.full_name ASC
      LIMIT 5`,
      [searchPattern]
    );

    // 4. Search Pages & Features
    const queryLower = q.toLowerCase();
    const matchedPages = APP_NAVIGATION.filter(
      (item) =>
        item.title.toLowerCase().includes(queryLower) ||
        item.description.toLowerCase().includes(queryLower) ||
        item.category.toLowerCase().includes(queryLower)
    ).slice(0, 4);

    const students = studentsRes.rows.map((s) => ({
      studentId: Number(s.student_id),
      universityStudentId: s.university_student_id,
      fullName: s.full_name,
      phone: s.phone,
      email: s.email,
      departmentName: s.department_name,
      academicStage: s.academic_stage,
      gcClassification: s.gc_classification,
      familyName: s.family_name,
      familyId: s.family_id ? Number(s.family_id) : null,
      participationStatus: s.participation_status,
    }));

    const families = familiesRes.rows.map((f) => ({
      familyId: Number(f.family_id),
      familyCode: f.family_code,
      familyName: f.family_name,
      memberCapacity: Number(f.member_capacity),
      activeMemberCount: Number(f.active_member_count || 0),
      capacityStatus: f.capacity_status || 'ON_TRACK',
    }));

    const people = peopleRes.rows.map((p) => ({
      personId: Number(p.person_id),
      fullName: p.full_name,
      phone: p.phone,
      email: p.email,
      studentId: p.student_id ? Number(p.student_id) : null,
      familyRoles: p.family_roles ? p.family_roles.split(', ') : [],
      accountRole: p.account_role,
    }));

    const totalResults = students.length + families.length + people.length + matchedPages.length;

    res.json({
      query: q,
      students,
      families,
      people,
      pages: matchedPages,
      totalResults,
    });
  } catch (err) {
    next(err);
  }
}
