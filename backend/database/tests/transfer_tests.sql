-- ============================================================================
-- FTVTI ECSF Fellowship Student & Family Management System
-- Test Suite 2: Transfer Workflow & Capacity Enforcement Tests
-- File: database/tests/transfer_tests.sql
-- ============================================================================

\echo '----------------------------------------------------------------------'
\echo 'RUNNING TEST SUITE 2: TRANSFER WORKFLOW & CAPACITY ENFORCEMENT TESTS'
\echo '----------------------------------------------------------------------'

DO $$
DECLARE
    v_test_failed BOOLEAN := FALSE;
    v_new_student_id BIGINT;
    v_new_person_id BIGINT;
    v_transfer_id BIGINT;
    v_old_assignment_id BIGINT;
    v_new_assignment_id BIGINT;
    v_active_count INTEGER;
    v_status transfer_status_enum;
    v_error_msg TEXT;
BEGIN
    -- Setup temporary student for testing transfers
    INSERT INTO people (full_name, phone, email)
    VALUES ('Transfer Test Student', '+251-911-999801', 'transfer.student@test.example.org')
    RETURNING person_id INTO v_new_person_id;

    INSERT INTO students (person_id, university_student_id, gender, participation_status, created_by)
    VALUES (v_new_person_id, 'FTVTI/TEST/001', 'MALE', 'ACTIVE', 1)
    RETURNING student_id INTO v_new_student_id;

    -- Assign student as MEMBER in Ebenezer (Family 2)
    INSERT INTO family_assignments (family_id, person_id, role, start_date, end_date, assigned_by)
    VALUES (2, v_new_person_id, 'MEMBER', CURRENT_DATE - INTERVAL '10 days', NULL, 1)
    RETURNING assignment_id INTO v_old_assignment_id;

    RAISE NOTICE '>>> TEST 2.1: Transfer to the same family must be rejected';
    v_test_failed := FALSE;
    BEGIN
        PERFORM fn_request_student_transfer(v_new_student_id, 2, 2, 'Attempting transfer to same family');
        v_test_failed := TRUE;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'TEST 2.1 PASSED: Transfer to same family was rejected (%).', SQLERRM;
    END;

    IF v_test_failed THEN
        RAISE EXCEPTION 'TEST 2.1 FAILED: Transfer to same family was erroneously permitted.';
    END IF;

    RAISE NOTICE '>>> TEST 2.2: Submit valid transfer request to Bethel (Family 1)';
    -- Bethel is currently at capacity (4/4 members)
    v_transfer_id := fn_request_student_transfer(
        v_new_student_id,
        1, -- to Bethel (Capacity 4, Active members 4)
        2, -- requested by Leader Ruth
        'Student requests transfer to Bethel to join peer study group.'
    );

    IF v_transfer_id IS NULL THEN
        RAISE EXCEPTION 'TEST 2.2 FAILED: Valid transfer request could not be created.';
    END IF;
    RAISE NOTICE 'TEST 2.2 PASSED: Transfer request #% successfully created.', v_transfer_id;

    RAISE NOTICE '>>> TEST 2.3: Second pending transfer request for the same student must be rejected';
    v_test_failed := FALSE;
    BEGIN
        PERFORM fn_request_student_transfer(v_new_student_id, 4, 2, 'Attempting duplicate pending transfer');
        v_test_failed := TRUE;
    EXCEPTION WHEN unique_violation THEN
        RAISE NOTICE 'TEST 2.3 PASSED: Second pending transfer was rejected by partial unique index.';
    END;

    IF v_test_failed THEN
        RAISE EXCEPTION 'TEST 2.3 FAILED: Duplicate pending transfer request was erroneously allowed.';
    END IF;

    RAISE NOTICE '>>> TEST 2.4: Non-admin (FELLOWSHIP_LEADER) cannot approve a transfer';
    v_test_failed := FALSE;
    BEGIN
        -- Leader Ruth (Account ID 2) attempts to approve transfer
        PERFORM fn_approve_transfer_request(v_transfer_id, 2, 'Leader approving transfer');
        v_test_failed := TRUE;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'TEST 2.4 PASSED: Non-admin approval rejected with error: %', SQLERRM;
    END;

    IF v_test_failed THEN
        RAISE EXCEPTION 'TEST 2.4 FAILED: Fellowship leader was improperly permitted to approve transfer.';
    END IF;

    RAISE NOTICE '>>> TEST 2.5: Normal capacity enforcement (Hard Limit) rejects transfer to full family';
    v_test_failed := FALSE;
    BEGIN
        -- Admin Samuel (Account ID 1) attempts standard approval without override
        PERFORM fn_approve_transfer_request(
            v_transfer_id,
            1,
            'Standard approval attempt',
            FALSE, -- allow_capacity_override = FALSE
            NULL
        );
        v_test_failed := TRUE;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'TEST 2.5 PASSED: Hard capacity limit enforced: %', SQLERRM;
    END;

    IF v_test_failed THEN
        RAISE EXCEPTION 'TEST 2.5 FAILED: Capacity limit was bypassed without override flag!';
    END IF;

    RAISE NOTICE '>>> TEST 2.6: Capacity override without a reason must be rejected';
    v_test_failed := FALSE;
    BEGIN
        -- Admin attempts override with blank reason
        PERFORM fn_approve_transfer_request(
            v_transfer_id,
            1,
            'Approval with missing override reason',
            TRUE,  -- allow_capacity_override = TRUE
            '   '  -- Empty reason
        );
        v_test_failed := TRUE;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'TEST 2.6 PASSED: Blank override reason rejected: %', SQLERRM;
    END;

    IF v_test_failed THEN
        RAISE EXCEPTION 'TEST 2.6 FAILED: Capacity override succeeded without a valid reason!';
    END IF;

    RAISE NOTICE '>>> TEST 2.7: Authorized administrative capacity override succeeds';
    -- Admin provides explicit override flag AND valid non-empty reason
    PERFORM fn_approve_transfer_request(
        v_transfer_id,
        1,
        'Executive committee decision',
        TRUE,
        'Special pastoral mentorship arrangement authorized by Campus Director.'
    );

    -- Verify transfer record status and override fields
    SELECT status, is_capacity_override, capacity_override_reason
    INTO v_status, v_test_failed, v_error_msg
    FROM transfer_requests
    WHERE transfer_id = v_transfer_id;

    IF v_status <> 'APPROVED' OR v_test_failed <> TRUE THEN
        RAISE EXCEPTION 'TEST 2.7 FAILED: Transfer was not properly marked approved with override.';
    END IF;

    -- Verify old assignment in Ebenezer closed
    IF NOT EXISTS (
        SELECT 1
        FROM family_assignments
        WHERE assignment_id = v_old_assignment_id
          AND end_date IS NOT NULL
          AND ended_by = 1
    ) THEN
        RAISE EXCEPTION 'TEST 2.7 FAILED: Prior assignment was not closed atomically.';
    END IF;

    -- Verify new active assignment in Bethel (Family 1)
    SELECT assignment_id INTO v_new_assignment_id
    FROM family_assignments
    WHERE person_id = v_new_person_id
      AND family_id = 1
      AND role = 'MEMBER'
      AND end_date IS NULL;

    IF v_new_assignment_id IS NULL THEN
        RAISE EXCEPTION 'TEST 2.7 FAILED: New active assignment in destination family was not created.';
    END IF;

    -- Verify destination family (Bethel) now has 5 active members (OVER_CAPACITY)
    SELECT COUNT(*) INTO v_active_count
    FROM family_assignments
    WHERE family_id = 1 AND role = 'MEMBER' AND end_date IS NULL;

    IF v_active_count <> 5 THEN
        RAISE EXCEPTION 'TEST 2.7 FAILED: Expected 5 active members in Bethel, found %', v_active_count;
    END IF;

    RAISE NOTICE 'TEST 2.7 PASSED: Authorized override approved atomically. Member count is now % (Override reason: %).',
        v_active_count, v_error_msg;

    RAISE NOTICE '>>> TEST 2.8: Rejected transfer does not modify family assignments';
    -- Create another transfer request for same student to Zion (Family 4)
    v_transfer_id := fn_request_student_transfer(
        v_new_student_id,
        4, -- Zion
        2,
        'Transfer request to test rejection workflow'
    );

    -- Reject by Admin
    PERFORM fn_reject_transfer_request(v_transfer_id, 1, 'Transfer denied due to family balance.');

    -- Verify transfer status
    SELECT status INTO v_status
    FROM transfer_requests
    WHERE transfer_id = v_transfer_id;

    IF v_status <> 'REJECTED' THEN
        RAISE EXCEPTION 'TEST 2.8 FAILED: Transfer status should be REJECTED.';
    END IF;

    -- Verify student is STILL active MEMBER of Bethel (Family 1)
    IF NOT EXISTS (
        SELECT 1
        FROM family_assignments
        WHERE person_id = v_new_person_id
          AND family_id = 1
          AND role = 'MEMBER'
          AND end_date IS NULL
    ) THEN
        RAISE EXCEPTION 'TEST 2.8 FAILED: Rejected transfer altered existing family assignment!';
    END IF;

    RAISE NOTICE 'TEST 2.8 PASSED: Rejected transfer preserved existing membership intact.';

    RAISE NOTICE '----------------------------------------------------------------------';
    RAISE NOTICE 'ALL SUITE 2 TRANSFER & CAPACITY TESTS COMPLETED SUCCESSFULLY!';
    RAISE NOTICE '----------------------------------------------------------------------';
END$$;
