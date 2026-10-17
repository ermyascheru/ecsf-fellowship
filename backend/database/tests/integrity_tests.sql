-- ============================================================================
-- FTVTI ECSF Fellowship Student & Family Management System
-- Test Suite 1: Structural Integrity & Constraint Enforcement Tests
-- File: database/tests/integrity_tests.sql
-- ============================================================================

\echo '----------------------------------------------------------------------'
\echo 'RUNNING TEST SUITE 1: INTEGRITY AND CONSTRAINT TESTS'
\echo '----------------------------------------------------------------------'

DO $$
DECLARE
    v_test_failed BOOLEAN := FALSE;
    v_error_msg TEXT;
BEGIN
    RAISE NOTICE '>>> TEST 1.1: Person can be both a student and a family DAD';
    -- Person 6 (Dawit Tadesse) is enrolled in students AND has an active DAD assignment in Shiloh.
    IF NOT EXISTS (
        SELECT 1
        FROM students s
        JOIN family_assignments fa ON s.person_id = fa.person_id
        WHERE fa.person_id = 6 AND fa.role = 'DAD' AND fa.end_date IS NULL
    ) THEN
        RAISE EXCEPTION 'TEST 1.1 FAILED: Person 6 should be both student and active DAD.';
    END IF;
    RAISE NOTICE 'TEST 1.1 PASSED: Person is successfully both student and DAD.';

    RAISE NOTICE '>>> TEST 1.2: Person can be a MEMBER in Family A and a MOM in Family B';
    -- Person 7 (Sara Solomon) is active MEMBER in Bethel (Family 1) and active MOM in Ebenezer (Family 2).
    IF NOT EXISTS (
        SELECT 1
        FROM family_assignments fa1
        JOIN family_assignments fa2 ON fa1.person_id = fa2.person_id
        WHERE fa1.person_id = 7
          AND fa1.family_id = 1 AND fa1.role = 'MEMBER' AND fa1.end_date IS NULL
          AND fa2.family_id = 2 AND fa2.role = 'MOM' AND fa2.end_date IS NULL
    ) THEN
        RAISE EXCEPTION 'TEST 1.2 FAILED: Person 7 should be MEMBER in Family 1 and MOM in Family 2.';
    END IF;
    RAISE NOTICE 'TEST 1.2 PASSED: Person can hold MEMBER in Family A and MOM in Family B simultaneously.';

    RAISE NOTICE '>>> TEST 1.3: Prevent duplicate active MEMBER assignments across families';
    -- Attempt to assign Person 7 as active MEMBER in Family 3 while already active MEMBER in Family 1
    BEGIN
        INSERT INTO family_assignments (family_id, person_id, role, start_date, end_date, assigned_by)
        VALUES (3, 7, 'MEMBER', CURRENT_DATE, NULL, 1);
        v_test_failed := TRUE;
    EXCEPTION WHEN unique_violation THEN
        RAISE NOTICE 'TEST 1.3 PASSED: System correctly rejected second active MEMBER assignment (unique_violation).';
    END;

    IF v_test_failed THEN
        RAISE EXCEPTION 'TEST 1.3 FAILED: Duplicate active MEMBER assignment was erroneously accepted.';
    END IF;

    RAISE NOTICE '>>> TEST 1.4: Prevent duplicate university_student_id';
    v_test_failed := FALSE;
    BEGIN
        INSERT INTO people (full_name, phone, email) VALUES ('Duplicate Student ID Tester', '+251-911-999901', 'dup.id@example.org');
        INSERT INTO students (person_id, university_student_id, gender, participation_status, created_by)
        VALUES (
            (SELECT person_id FROM people WHERE email = 'dup.id@example.org'),
            'FTVTI/2021/0101', -- Already belongs to Dawit
            'MALE',
            'ACTIVE',
            1
        );
        v_test_failed := TRUE;
    EXCEPTION WHEN unique_violation THEN
        RAISE NOTICE 'TEST 1.4 PASSED: Duplicate university student ID was correctly rejected.';
    END;

    IF v_test_failed THEN
        RAISE EXCEPTION 'TEST 1.4 FAILED: Duplicate university student ID was erroneously accepted.';
    END IF;

    RAISE NOTICE '>>> TEST 1.5: Prevent duplicate non-null emails case-insensitively';
    v_test_failed := FALSE;
    BEGIN
        -- Existing email: admin.samuel@fellowship.example.org
        INSERT INTO people (full_name, phone, email)
        VALUES ('Uppercase Email Person', '+251-911-999902', 'ADMIN.SAMUEL@FELLOWSHIP.EXAMPLE.ORG');
        v_test_failed := TRUE;
    EXCEPTION WHEN unique_violation THEN
        RAISE NOTICE 'TEST 1.5 PASSED: Case-insensitive duplicate email was correctly rejected.';
    END;

    IF v_test_failed THEN
        RAISE EXCEPTION 'TEST 1.5 FAILED: Duplicate email was erroneously allowed.';
    END IF;

    RAISE NOTICE '>>> TEST 1.6: Multiple NULL emails are permitted';
    BEGIN
        INSERT INTO people (full_name, phone, email) VALUES ('Null Email Person 1', '+251-911-999903', NULL);
        INSERT INTO people (full_name, phone, email) VALUES ('Null Email Person 2', '+251-911-999904', NULL);
        RAISE NOTICE 'TEST 1.6 PASSED: Multiple NULL emails were correctly permitted.';
    EXCEPTION WHEN OTHERS THEN
        RAISE EXCEPTION 'TEST 1.6 FAILED: Multiple NULL emails raised an error: %', SQLERRM;
    END;

    RAISE NOTICE '>>> TEST 1.7: Family capacity must be non-negative';
    v_test_failed := FALSE;
    BEGIN
        INSERT INTO families (family_code, family_name, member_capacity)
        VALUES ('FAM-NEG', 'Negative Family', -5);
        v_test_failed := TRUE;
    EXCEPTION WHEN check_violation THEN
        RAISE NOTICE 'TEST 1.7 PASSED: Negative capacity rejected via CHECK constraint.';
    END;

    IF v_test_failed THEN
        RAISE EXCEPTION 'TEST 1.7 FAILED: Negative capacity was erroneously accepted.';
    END IF;

    RAISE NOTICE '>>> TEST 1.8: Remedial must be 0 Year';
    IF NOT EXISTS (
        SELECT 1
        FROM academic_stages
        WHERE stage_name LIKE 'Remedial%' AND year_number = 0
    ) THEN
        RAISE EXCEPTION 'TEST 1.8 FAILED: Remedial must have year_number = 0.';
    END IF;
    RAISE NOTICE 'TEST 1.8 PASSED: Remedial is correctly configured as 0 Year.';

    RAISE NOTICE '>>> TEST 1.9: Manual GC classification independent of academic stage';
    -- Verify Sara is 3rd Year and GC
    IF NOT EXISTS (
        SELECT 1
        FROM students s
        JOIN academic_stages ast ON s.academic_stage_id = ast.academic_stage_id
        JOIN gc_classifications gc ON s.gc_classification_id = gc.gc_classification_id
        WHERE s.person_id = 7
          AND ast.year_number = 3
          AND gc.classification_name = 'Graduating Class (GC)'
    ) THEN
        RAISE EXCEPTION 'TEST 1.9 FAILED: Student in 3rd year should be supported as GC independently of year.';
    END IF;
    RAISE NOTICE 'TEST 1.9 PASSED: GC classification is independent of academic stage.';

    RAISE NOTICE '>>> TEST 1.10: ON DELETE RESTRICT prevents accidental deletion of historical records';
    v_test_failed := FALSE;
    BEGIN
        -- Family 1 (Bethel) has active assignments and students, cannot be deleted
        DELETE FROM families WHERE family_id = 1;
        v_test_failed := TRUE;
    EXCEPTION WHEN foreign_key_violation THEN
        RAISE NOTICE 'TEST 1.10 PASSED: Deleting family with active assignments blocked by foreign key restriction.';
    END;

    IF v_test_failed THEN
        RAISE EXCEPTION 'TEST 1.10 FAILED: Family with active records was deleted!';
    END IF;

    RAISE NOTICE '>>> TEST 1.11: Scoped leader access table rejects ADMIN accounts';
    v_test_failed := FALSE;
    BEGIN
        -- Account 1 is ADMIN, cannot be scoped in fellowship_leader_family_access
        INSERT INTO fellowship_leader_family_access (account_id, family_id, granted_by)
        VALUES (1, 1, 1);
        v_test_failed := TRUE;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'TEST 1.11 PASSED: ADMIN account scoping rejected (%).', SQLERRM;
    END;

    IF v_test_failed THEN
        RAISE EXCEPTION 'TEST 1.11 FAILED: ADMIN account was improperly scoped in leader access table.';
    END IF;

    RAISE NOTICE '----------------------------------------------------------------------';
    RAISE NOTICE 'ALL SUITE 1 INTEGRITY TESTS COMPLETED SUCCESSFULLY!';
    RAISE NOTICE '----------------------------------------------------------------------';
END$$;
