-- ============================================================================
-- FTVTI ECSF Fellowship Student & Family Management System
-- Canonical Reporting Queries (Reports 1 to 14)
-- File: database/reports.sql
-- ============================================================================

-- ============================================================================
-- REPORT 1: Total Students Count
-- ============================================================================
SELECT
    COUNT(*) AS total_students
FROM students;

-- ============================================================================
-- REPORT 2: Active and Inactive Students
-- ============================================================================
SELECT
    participation_status,
    COUNT(*) AS student_count,
    ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER (), 2) AS percentage
FROM students
GROUP BY participation_status
ORDER BY participation_status ASC;

-- ============================================================================
-- REPORT 3: Students Grouped by Academic Stage (Remedial = 0 Year)
-- ============================================================================
SELECT
    COALESCE(ast.year_number, -1) AS academic_year_number,
    COALESCE(ast.stage_name, 'Unassigned Stage') AS academic_stage_name,
    COUNT(s.student_id) AS total_students,
    COUNT(s.student_id) FILTER (WHERE s.participation_status = 'ACTIVE') AS active_students,
    COUNT(s.student_id) FILTER (WHERE s.participation_status = 'INACTIVE') AS inactive_students
FROM students s
LEFT JOIN academic_stages ast ON s.academic_stage_id = ast.academic_stage_id
GROUP BY ast.year_number, ast.stage_name, ast.display_order
ORDER BY ast.display_order NULLS LAST, ast.year_number NULLS LAST;

-- ============================================================================
-- REPORT 4: Students Grouped by GC (Graduating Class) Classification
-- ============================================================================
SELECT
    COALESCE(gc.classification_name, 'Unassigned GC Status') AS gc_classification,
    COUNT(s.student_id) AS total_students,
    COUNT(s.student_id) FILTER (WHERE s.participation_status = 'ACTIVE') AS active_students,
    COUNT(s.student_id) FILTER (WHERE s.participation_status = 'INACTIVE') AS inactive_students
FROM students s
LEFT JOIN gc_classifications gc ON s.gc_classification_id = gc.gc_classification_id
GROUP BY gc.classification_name
ORDER BY total_students DESC, gc.classification_name ASC;

-- ============================================================================
-- REPORT 5: Students Grouped by Department
-- ============================================================================
SELECT
    COALESCE(d.department_name, 'Unassigned Department') AS department_name,
    COUNT(s.student_id) AS total_students,
    COUNT(s.student_id) FILTER (WHERE s.participation_status = 'ACTIVE') AS active_students,
    COUNT(s.student_id) FILTER (WHERE s.participation_status = 'INACTIVE') AS inactive_students
FROM students s
LEFT JOIN departments d ON s.department_id = d.department_id
GROUP BY d.department_name
ORDER BY total_students DESC;

-- ============================================================================
-- REPORT 6: Students with No Active Ordinary Family Membership
-- ============================================================================
SELECT
    s.student_id,
    s.university_student_id,
    p.full_name,
    p.phone,
    p.email,
    s.gender,
    ast.stage_name AS academic_stage,
    ast.year_number AS academic_year,
    gc.classification_name AS gc_classification,
    d.department_name,
    s.participation_status
FROM students s
JOIN people p ON s.person_id = p.person_id
LEFT JOIN academic_stages ast ON s.academic_stage_id = ast.academic_stage_id
LEFT JOIN gc_classifications gc ON s.gc_classification_id = gc.gc_classification_id
LEFT JOIN departments d ON s.department_id = d.department_id
WHERE NOT EXISTS (
    SELECT 1
    FROM family_assignments fa
    WHERE fa.person_id = s.person_id
      AND fa.role = 'MEMBER'
      AND fa.end_date IS NULL
)
ORDER BY p.full_name ASC;

-- ============================================================================
-- REPORT 7: Each Family's DAD, MOM, and MEMBER Counts
-- ============================================================================
SELECT
    f.family_id,
    f.family_code,
    f.family_name,
    COUNT(fa.assignment_id) FILTER (WHERE fa.role = 'DAD' AND fa.end_date IS NULL) AS active_dads,
    COUNT(fa.assignment_id) FILTER (WHERE fa.role = 'MOM' AND fa.end_date IS NULL) AS active_moms,
    COUNT(fa.assignment_id) FILTER (WHERE fa.role = 'MEMBER' AND fa.end_date IS NULL) AS active_members,
    COUNT(fa.assignment_id) FILTER (WHERE fa.end_date IS NULL) AS total_active_people
FROM families f
LEFT JOIN family_assignments fa ON f.family_id = fa.family_id
GROUP BY f.family_id, f.family_code, f.family_name
ORDER BY f.family_name ASC;

-- ============================================================================
-- REPORT 8: Each Family's Active Ordinary Member Count, Capacity, Remaining Spaces
-- ============================================================================
SELECT
    f.family_id,
    f.family_code,
    f.family_name,
    f.member_capacity,
    COUNT(fa.assignment_id) FILTER (WHERE fa.role = 'MEMBER' AND fa.end_date IS NULL) AS active_members,
    f.member_capacity - COUNT(fa.assignment_id) FILTER (WHERE fa.role = 'MEMBER' AND fa.end_date IS NULL) AS remaining_spaces
FROM families f
LEFT JOIN family_assignments fa ON f.family_id = fa.family_id
GROUP BY f.family_id, f.family_code, f.family_name, f.member_capacity
ORDER BY f.family_name ASC;

-- ============================================================================
-- REPORT 9: Families Grouped by Capacity Category (BELOW, AT, OVER)
-- ============================================================================
WITH family_stats AS (
    SELECT
        f.family_id,
        f.family_code,
        f.family_name,
        f.member_capacity,
        COUNT(fa.assignment_id) FILTER (WHERE fa.role = 'MEMBER' AND fa.end_date IS NULL) AS active_members,
        CASE
            WHEN COUNT(fa.assignment_id) FILTER (WHERE fa.role = 'MEMBER' AND fa.end_date IS NULL) < f.member_capacity THEN 'BELOW_CAPACITY'
            WHEN COUNT(fa.assignment_id) FILTER (WHERE fa.role = 'MEMBER' AND fa.end_date IS NULL) = f.member_capacity THEN 'AT_CAPACITY'
            ELSE 'OVER_CAPACITY'
        END AS capacity_category
    FROM families f
    LEFT JOIN family_assignments fa ON f.family_id = fa.family_id
    GROUP BY f.family_id, f.family_code, f.family_name, f.member_capacity
)
SELECT
    capacity_category,
    COUNT(*) AS family_count,
    STRING_AGG(family_name || ' (' || active_members || '/' || member_capacity || ')', ', ' ORDER BY family_name) AS families_list
FROM family_stats
GROUP BY capacity_category
ORDER BY capacity_category ASC;

-- ============================================================================
-- REPORT 10: Family Membership & Leadership History for an Individual Person
-- Parameter: :target_person_id (Demonstrated below with person_id = 1)
-- ============================================================================
SELECT
    fa.assignment_id,
    p.person_id,
    p.full_name,
    f.family_id,
    f.family_code,
    f.family_name,
    fa.role,
    fa.start_date,
    fa.end_date,
    CASE WHEN fa.end_date IS NULL THEN 'ACTIVE' ELSE 'COMPLETED' END AS assignment_status,
    assigner.username AS assigned_by_username,
    ender.username AS ended_by_username,
    fa.end_reason
FROM family_assignments fa
JOIN people p ON fa.person_id = p.person_id
JOIN families f ON fa.family_id = f.family_id
JOIN fellowship_accounts assigner ON fa.assigned_by = assigner.account_id
LEFT JOIN fellowship_accounts ender ON fa.ended_by = ender.account_id
WHERE fa.person_id = 1  -- Replace with target person_id as parameterized input
ORDER BY fa.start_date DESC, fa.assignment_id DESC;

-- ============================================================================
-- REPORT 11: Transfer Request History with Requester, Approver, & Override Info
-- ============================================================================
SELECT
    tr.transfer_id,
    stu_p.full_name AS student_name,
    s.university_student_id,
    COALESCE(ff.family_name, '[Unassigned]') AS source_family,
    tf.family_name AS destination_family,
    tr.status,
    tr.reason AS transfer_reason,
    tr.requested_at,
    req_acc.username AS requested_by_user,
    tr.decided_at,
    app_acc.username AS decided_by_user,
    tr.decision_note,
    tr.is_capacity_override,
    tr.capacity_override_reason,
    ovr_acc.username AS override_authorized_by
FROM transfer_requests tr
JOIN students s ON tr.student_id = s.student_id
JOIN people stu_p ON s.person_id = stu_p.person_id
LEFT JOIN families ff ON tr.from_family_id = ff.family_id
JOIN families tf ON tr.to_family_id = tf.family_id
JOIN fellowship_accounts req_acc ON tr.requested_by = req_acc.account_id
LEFT JOIN fellowship_accounts app_acc ON tr.approved_by = app_acc.account_id
LEFT JOIN fellowship_accounts ovr_acc ON tr.capacity_override_by = ovr_acc.account_id
ORDER BY tr.requested_at DESC;

-- ============================================================================
-- REPORT 12: Current Student List for Each Family
-- ============================================================================
SELECT
    f.family_code,
    f.family_name,
    fa.role,
    p.full_name,
    s.university_student_id,
    p.phone,
    d.department_name,
    ast.stage_name AS academic_stage,
    ast.year_number AS academic_year,
    gc.classification_name AS gc_classification,
    s.participation_status
FROM families f
JOIN family_assignments fa ON f.family_id = fa.family_id AND fa.end_date IS NULL
JOIN people p ON fa.person_id = p.person_id
LEFT JOIN students s ON p.person_id = s.person_id
LEFT JOIN departments d ON s.department_id = d.department_id
LEFT JOIN academic_stages ast ON s.academic_stage_id = ast.academic_stage_id
LEFT JOIN gc_classifications gc ON s.gc_classification_id = gc.gc_classification_id
ORDER BY f.family_name ASC, fa.role DESC, p.full_name ASC;

-- ============================================================================
-- REPORT 13: Student Records with Missing Department, Stage, or GC Classification
-- ============================================================================
SELECT
    s.student_id,
    s.university_student_id,
    p.full_name,
    p.phone,
    p.email,
    CASE WHEN s.department_id IS NULL THEN 'MISSING' ELSE d.department_name END AS department_status,
    CASE WHEN s.academic_stage_id IS NULL THEN 'MISSING' ELSE ast.stage_name END AS stage_status,
    CASE WHEN s.gc_classification_id IS NULL THEN 'MISSING' ELSE gc.classification_name END AS gc_status,
    s.participation_status
FROM students s
JOIN people p ON s.person_id = p.person_id
LEFT JOIN departments d ON s.department_id = d.department_id
LEFT JOIN academic_stages ast ON s.academic_stage_id = ast.academic_stage_id
LEFT JOIN gc_classifications gc ON s.gc_classification_id = gc.gc_classification_id
WHERE s.department_id IS NULL
   OR s.academic_stage_id IS NULL
   OR s.gc_classification_id IS NULL
ORDER BY p.full_name ASC;

-- ============================================================================
-- REPORT 14: Family Leadership History (DAD and MOM Role Transitions)
-- ============================================================================
SELECT
    f.family_code,
    f.family_name,
    fa.role AS leadership_role,
    p.full_name AS leader_name,
    p.phone AS leader_phone,
    fa.start_date,
    fa.end_date,
    CASE WHEN fa.end_date IS NULL THEN 'CURRENT' ELSE 'PAST' END AS status,
    assigner.username AS appointed_by,
    ender.username AS relieved_by,
    fa.end_reason
FROM family_assignments fa
JOIN families f ON fa.family_id = f.family_id
JOIN people p ON fa.person_id = p.person_id
JOIN fellowship_accounts assigner ON fa.assigned_by = assigner.account_id
LEFT JOIN fellowship_accounts ender ON fa.ended_by = ender.account_id
WHERE fa.role IN ('DAD', 'MOM')
ORDER BY f.family_name ASC, fa.role ASC, fa.start_date DESC;
