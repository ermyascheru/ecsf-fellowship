-- ============================================================================
-- FTVTI ECSF Fellowship Student & Family Management System
-- Reporting Database Views
-- File: database/views.sql
-- ============================================================================

-- ============================================================================
-- VIEW 1 & 2: Student Totals, Active, and Inactive Breakdown
-- ============================================================================
CREATE OR REPLACE VIEW vw_student_participation_summary AS
SELECT
    COUNT(*) AS total_students,
    COUNT(*) FILTER (WHERE participation_status = 'ACTIVE') AS active_students,
    COUNT(*) FILTER (WHERE participation_status = 'INACTIVE') AS inactive_students,
    ROUND(
        100.0 * COUNT(*) FILTER (WHERE participation_status = 'ACTIVE') / NULLIF(COUNT(*), 0),
        2
    ) AS active_percentage
FROM students;

COMMENT ON VIEW vw_student_participation_summary IS 'System-wide summary of student counts and participation status.';

-- ============================================================================
-- VIEW 3: Students Grouped by Academic Stage (Remedial = 0 Year, etc.)
-- ============================================================================
CREATE OR REPLACE VIEW vw_students_by_academic_stage AS
SELECT
    COALESCE(ast.year_number, -1) AS year_number,
    COALESCE(ast.stage_name, 'Unassigned Academic Stage') AS stage_name,
    COUNT(s.student_id) AS total_students,
    COUNT(s.student_id) FILTER (WHERE s.participation_status = 'ACTIVE') AS active_students,
    COUNT(s.student_id) FILTER (WHERE s.participation_status = 'INACTIVE') AS inactive_students
FROM students s
LEFT JOIN academic_stages ast ON s.academic_stage_id = ast.academic_stage_id
GROUP BY ast.year_number, ast.stage_name, ast.display_order
ORDER BY ast.display_order NULLS LAST, ast.year_number NULLS LAST;

COMMENT ON VIEW vw_students_by_academic_stage IS 'Students categorized by academic stage, with Remedial sorted as 0 Year.';

-- ============================================================================
-- VIEW 4: Students Grouped by GC (Graduating Class) Classification
-- ============================================================================
CREATE OR REPLACE VIEW vw_students_by_gc_classification AS
SELECT
    COALESCE(gc.classification_name, 'Unassigned GC Classification') AS gc_classification,
    COUNT(s.student_id) AS total_students,
    COUNT(s.student_id) FILTER (WHERE s.participation_status = 'ACTIVE') AS active_students,
    COUNT(s.student_id) FILTER (WHERE s.participation_status = 'INACTIVE') AS inactive_students
FROM students s
LEFT JOIN gc_classifications gc ON s.gc_classification_id = gc.gc_classification_id
GROUP BY gc.classification_name
ORDER BY total_students DESC, gc.classification_name ASC;

COMMENT ON VIEW vw_students_by_gc_classification IS 'Students categorized by Graduating Class (GC) classification independent of academic year.';

-- ============================================================================
-- VIEW 5: Students Grouped by Department
-- ============================================================================
CREATE OR REPLACE VIEW vw_students_by_department AS
SELECT
    COALESCE(d.department_name, 'Unassigned Department') AS department_name,
    COUNT(s.student_id) AS total_students,
    COUNT(s.student_id) FILTER (WHERE s.participation_status = 'ACTIVE') AS active_students,
    COUNT(s.student_id) FILTER (WHERE s.participation_status = 'INACTIVE') AS inactive_students
FROM students s
LEFT JOIN departments d ON s.department_id = d.department_id
GROUP BY d.department_name
ORDER BY total_students DESC, d.department_name ASC;

COMMENT ON VIEW vw_students_by_department IS 'Distribution of fellowship students across university academic departments.';

-- ============================================================================
-- VIEW 6: Students with No Active Ordinary Family Membership
-- ============================================================================
CREATE OR REPLACE VIEW vw_students_unassigned_to_family AS
SELECT
    s.student_id,
    s.university_student_id,
    p.person_id,
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

COMMENT ON VIEW vw_students_unassigned_to_family IS 'Students currently lacking an active ordinary MEMBER assignment in any fellowship family.';

-- ============================================================================
-- VIEW 7: Each Family Role Counts (DAD, MOM, MEMBER)
-- ============================================================================
CREATE OR REPLACE VIEW vw_family_role_counts AS
SELECT
    f.family_id,
    f.family_code,
    f.family_name,
    f.is_active,
    COUNT(fa.assignment_id) FILTER (WHERE fa.role = 'DAD' AND fa.end_date IS NULL) AS active_dads_count,
    COUNT(fa.assignment_id) FILTER (WHERE fa.role = 'MOM' AND fa.end_date IS NULL) AS active_moms_count,
    COUNT(fa.assignment_id) FILTER (WHERE fa.role = 'MEMBER' AND fa.end_date IS NULL) AS active_members_count,
    COUNT(fa.assignment_id) FILTER (WHERE fa.end_date IS NULL) AS total_active_people_count
FROM families f
LEFT JOIN family_assignments fa ON f.family_id = fa.family_id
GROUP BY f.family_id, f.family_code, f.family_name, f.is_active
ORDER BY f.family_name ASC;

COMMENT ON VIEW vw_family_role_counts IS 'Count of active DAD, MOM, and ordinary MEMBER assignments per family.';

-- ============================================================================
-- VIEW 8 & 9: Family Active Members, Capacity, Remaining Spaces & Status
-- ============================================================================
CREATE OR REPLACE VIEW vw_family_capacity_status AS
SELECT
    f.family_id,
    f.family_code,
    f.family_name,
    f.is_active,
    f.member_capacity AS configured_capacity,
    COUNT(fa.assignment_id) FILTER (WHERE fa.role = 'MEMBER' AND fa.end_date IS NULL) AS active_member_count,
    f.member_capacity - COUNT(fa.assignment_id) FILTER (WHERE fa.role = 'MEMBER' AND fa.end_date IS NULL) AS remaining_spaces,
    CASE
        WHEN COUNT(fa.assignment_id) FILTER (WHERE fa.role = 'MEMBER' AND fa.end_date IS NULL) < f.member_capacity THEN 'BELOW_CAPACITY'
        WHEN COUNT(fa.assignment_id) FILTER (WHERE fa.role = 'MEMBER' AND fa.end_date IS NULL) = f.member_capacity THEN 'AT_CAPACITY'
        ELSE 'OVER_CAPACITY'
    END AS capacity_status
FROM families f
LEFT JOIN family_assignments fa ON f.family_id = fa.family_id
GROUP BY f.family_id, f.family_code, f.family_name, f.is_active, f.member_capacity
ORDER BY f.family_name ASC;

COMMENT ON VIEW vw_family_capacity_status IS 'Real-time capacity tracking comparing active ordinary members to configured limit.';

-- ============================================================================
-- VIEW 11: Transfer Request History with Requester, Approver, & Override Auditing
-- ============================================================================
CREATE OR REPLACE VIEW vw_transfer_request_history AS
SELECT
    tr.transfer_id,
    tr.student_id,
    stu_p.full_name AS student_name,
    s.university_student_id,
    tr.from_family_id,
    ff.family_name AS from_family_name,
    ff.family_code AS from_family_code,
    tr.to_family_id,
    tf.family_name AS to_family_name,
    tf.family_code AS to_family_code,
    tr.status,
    tr.reason,
    tr.requested_at,
    req_acc.username AS requested_by_username,
    req_p.full_name AS requested_by_name,
    tr.decided_at,
    tr.decision_note,
    app_acc.username AS approved_by_username,
    app_p.full_name AS approved_by_name,
    tr.is_capacity_override,
    tr.capacity_override_reason,
    ovr_acc.username AS capacity_override_by_username,
    tr.capacity_override_at
FROM transfer_requests tr
JOIN students s ON tr.student_id = s.student_id
JOIN people stu_p ON s.person_id = stu_p.person_id
LEFT JOIN families ff ON tr.from_family_id = ff.family_id
JOIN families tf ON tr.to_family_id = tf.family_id
JOIN fellowship_accounts req_acc ON tr.requested_by = req_acc.account_id
JOIN people req_p ON req_acc.person_id = req_p.person_id
LEFT JOIN fellowship_accounts app_acc ON tr.approved_by = app_acc.account_id
LEFT JOIN people app_p ON app_acc.person_id = app_p.person_id
LEFT JOIN fellowship_accounts ovr_acc ON tr.capacity_override_by = ovr_acc.account_id
ORDER BY tr.requested_at DESC;

COMMENT ON VIEW vw_transfer_request_history IS 'Detailed historical log of all family transfer requests and administrative outcomes.';

-- ============================================================================
-- VIEW 12: Current Student Roster by Family
-- ============================================================================
CREATE OR REPLACE VIEW vw_family_student_roster AS
SELECT
    f.family_id,
    f.family_code,
    f.family_name,
    fa.role AS assignment_role,
    fa.start_date AS assigned_date,
    p.person_id,
    p.full_name,
    p.phone,
    p.email,
    s.student_id,
    s.university_student_id,
    s.gender,
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

COMMENT ON VIEW vw_family_student_roster IS 'Current active roster of family members and leaders with complete student profiles.';

-- ============================================================================
-- VIEW 13: Students with Incomplete Profiles (Missing Dept, Stage, or GC)
-- ============================================================================
CREATE OR REPLACE VIEW vw_students_with_missing_data AS
SELECT
    s.student_id,
    s.university_student_id,
    p.person_id,
    p.full_name,
    p.phone,
    p.email,
    s.gender,
    s.department_id IS NULL AS is_missing_department,
    s.academic_stage_id IS NULL AS is_missing_academic_stage,
    s.gc_classification_id IS NULL AS is_missing_gc_classification,
    s.participation_status
FROM students s
JOIN people p ON s.person_id = p.person_id
WHERE s.department_id IS NULL
   OR s.academic_stage_id IS NULL
   OR s.gc_classification_id IS NULL
ORDER BY p.full_name ASC;

COMMENT ON VIEW vw_students_with_missing_data IS 'Data quality view identifying student records requiring profile completion.';

-- ============================================================================
-- VIEW 14: Family Leadership History (DAD and MOM Role Transitions)
-- ============================================================================
CREATE OR REPLACE VIEW vw_family_leadership_history AS
SELECT
    f.family_id,
    f.family_code,
    f.family_name,
    fa.assignment_id,
    fa.role AS leadership_role,
    p.person_id,
    p.full_name AS leader_name,
    p.phone AS leader_phone,
    fa.start_date,
    fa.end_date,
    CASE WHEN fa.end_date IS NULL THEN 'CURRENT_LEADER' ELSE 'FORMER_LEADER' END AS leadership_status,
    assigner_acc.username AS assigned_by_username,
    ender_acc.username AS ended_by_username,
    fa.end_reason
FROM family_assignments fa
JOIN families f ON fa.family_id = f.family_id
JOIN people p ON fa.person_id = p.person_id
JOIN fellowship_accounts assigner_acc ON fa.assigned_by = assigner_acc.account_id
LEFT JOIN fellowship_accounts ender_acc ON fa.ended_by = ender_acc.account_id
WHERE fa.role IN ('DAD', 'MOM')
ORDER BY f.family_name ASC, fa.role ASC, fa.start_date DESC;

COMMENT ON VIEW vw_family_leadership_history IS 'Chronological record of family dad and mom appointments and departures.';
