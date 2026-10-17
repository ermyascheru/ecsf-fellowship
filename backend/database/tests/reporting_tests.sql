-- ============================================================================
-- FTVTI ECSF Fellowship Student & Family Management System
-- Test Suite 3: Reporting Views & Queries Validation Tests
-- File: database/tests/reporting_tests.sql
-- ============================================================================

\echo '----------------------------------------------------------------------'
\echo 'RUNNING TEST SUITE 3: REPORTING VIEWS VALIDATION TESTS'
\echo '----------------------------------------------------------------------'

DO $$
DECLARE
    v_total_students INTEGER;
    v_remedial_count INTEGER;
    v_gc_count INTEGER;
    v_unassigned_count INTEGER;
    v_missing_data_count INTEGER;
    v_over_capacity_count INTEGER;
    v_leadership_history_count INTEGER;
BEGIN
    RAISE NOTICE '>>> TEST 3.1: Validating vw_student_participation_summary (Reports 1 & 2)';
    SELECT total_students INTO v_total_students FROM vw_student_participation_summary;
    IF v_total_students < 10 THEN
        RAISE EXCEPTION 'TEST 3.1 FAILED: Expected at least 10 students, got %', v_total_students;
    END IF;
    RAISE NOTICE 'TEST 3.1 PASSED: Total students reported: %', v_total_students;

    RAISE NOTICE '>>> TEST 3.2: Validating vw_students_by_academic_stage (Report 3 - Remedial = 0 Year)';
    SELECT total_students INTO v_remedial_count
    FROM vw_students_by_academic_stage
    WHERE year_number = 0;

    IF v_remedial_count < 1 THEN
        RAISE EXCEPTION 'TEST 3.2 FAILED: Expected at least 1 Remedial student in year 0.';
    END IF;
    RAISE NOTICE 'TEST 3.2 PASSED: Remedial correctly represented as 0 Year with % students.', v_remedial_count;

    RAISE NOTICE '>>> TEST 3.3: Validating vw_students_by_gc_classification (Report 4 - Independent GC)';
    SELECT total_students INTO v_gc_count
    FROM vw_students_by_gc_classification
    WHERE gc_classification = 'Graduating Class (GC)';

    IF v_gc_count < 2 THEN
        RAISE EXCEPTION 'TEST 3.3 FAILED: Expected at least 2 GC students, got %', v_gc_count;
    END IF;
    RAISE NOTICE 'TEST 3.3 PASSED: Graduating Class (GC) classification verified with % students.', v_gc_count;

    RAISE NOTICE '>>> TEST 3.4: Validating vw_students_unassigned_to_family (Report 6)';
    SELECT COUNT(*) INTO v_unassigned_count FROM vw_students_unassigned_to_family;
    IF v_unassigned_count < 1 THEN
        RAISE EXCEPTION 'TEST 3.4 FAILED: Expected at least 1 unassigned student.';
    END IF;
    RAISE NOTICE 'TEST 3.4 PASSED: Unassigned students detected: %', v_unassigned_count;

    RAISE NOTICE '>>> TEST 3.5: Validating vw_family_capacity_status (Reports 8 & 9)';
    -- Check that capacity calculations and categories function properly
    IF NOT EXISTS (
        SELECT 1 FROM vw_family_capacity_status WHERE capacity_status IN ('BELOW_CAPACITY', 'AT_CAPACITY', 'OVER_CAPACITY')
    ) THEN
        RAISE EXCEPTION 'TEST 3.5 FAILED: Capacity status view missing categorized entries.';
    END IF;
    RAISE NOTICE 'TEST 3.5 PASSED: Family capacity status view operational.';

    RAISE NOTICE '>>> TEST 3.6: Validating vw_students_with_missing_data (Report 13)';
    SELECT COUNT(*) INTO v_missing_data_count FROM vw_students_with_missing_data;
    IF v_missing_data_count < 1 THEN
        RAISE EXCEPTION 'TEST 3.6 FAILED: Expected student with incomplete profile to be flagged.';
    END IF;
    RAISE NOTICE 'TEST 3.6 PASSED: Incomplete profiles detected: %', v_missing_data_count;

    RAISE NOTICE '>>> TEST 3.7: Validating vw_family_leadership_history (Report 14)';
    SELECT COUNT(*) INTO v_leadership_history_count FROM vw_family_leadership_history;
    IF v_leadership_history_count < 4 THEN
        RAISE EXCEPTION 'TEST 3.7 FAILED: Expected leadership history entries, got %', v_leadership_history_count;
    END IF;
    RAISE NOTICE 'TEST 3.7 PASSED: Family leadership history verified with % entries.', v_leadership_history_count;

    RAISE NOTICE '----------------------------------------------------------------------';
    RAISE NOTICE 'ALL SUITE 3 REPORTING TESTS COMPLETED SUCCESSFULLY!';
    RAISE NOTICE '----------------------------------------------------------------------';
END$$;
