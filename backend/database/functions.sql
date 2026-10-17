-- ============================================================================
-- FTVTI ECSF Fellowship Student & Family Management System
-- Database Functions, Triggers, and Transfer Approval Workflow
-- File: database/functions.sql
-- ============================================================================

-- ============================================================================
-- 1. TRIGGER FUNCTIONS: UPDATED_AT TIMESTAMP
-- ============================================================================

CREATE OR REPLACE FUNCTION trg_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_people_updated_at ON people;
CREATE TRIGGER trg_people_updated_at
    BEFORE UPDATE ON people
    FOR EACH ROW
    EXECUTE FUNCTION trg_set_updated_at();

DROP TRIGGER IF EXISTS trg_students_updated_at ON students;
CREATE TRIGGER trg_students_updated_at
    BEFORE UPDATE ON students
    FOR EACH ROW
    EXECUTE FUNCTION trg_set_updated_at();

DROP TRIGGER IF EXISTS trg_families_updated_at ON families;
CREATE TRIGGER trg_families_updated_at
    BEFORE UPDATE ON families
    FOR EACH ROW
    EXECUTE FUNCTION trg_set_updated_at();

-- ============================================================================
-- 2. TRIGGER FUNCTION: SCOPED LEADER ACCOUNT VALIDATION
-- ============================================================================
-- Enforces that fellowship_leader_family_access can ONLY contain accounts
-- with role = 'FELLOWSHIP_LEADER'. ADMIN accounts are global and must not
-- be scoped to individual families.
-- ============================================================================
CREATE OR REPLACE FUNCTION trg_check_leader_family_access()
RETURNS TRIGGER AS $$
DECLARE
    v_role account_role_enum;
    v_is_active BOOLEAN;
BEGIN
    SELECT role, is_active INTO v_role, v_is_active
    FROM fellowship_accounts
    WHERE account_id = NEW.account_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Referenced account ID % does not exist.', NEW.account_id;
    END IF;

    IF v_is_active = FALSE THEN
        RAISE EXCEPTION 'Cannot grant family access to an inactive account (ID %).', NEW.account_id;
    END IF;

    IF v_role <> 'FELLOWSHIP_LEADER' THEN
        RAISE EXCEPTION 'Only accounts with role FELLOWSHIP_LEADER may be assigned family scopes. ADMIN accounts have system-wide authority and must not be restricted (Account ID %, Role %).', NEW.account_id, v_role;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_fellowship_leader_access_role_check ON fellowship_leader_family_access;
CREATE TRIGGER trg_fellowship_leader_access_role_check
    BEFORE INSERT OR UPDATE ON fellowship_leader_family_access
    FOR EACH ROW
    EXECUTE FUNCTION trg_check_leader_family_access();

-- ============================================================================
-- 3. AUDIT TRIGGER: STUDENT PARTICIPATION STATUS CHANGES
-- ============================================================================
CREATE OR REPLACE FUNCTION trg_audit_student_participation()
RETURNS TRIGGER AS $$
BEGIN
    IF (OLD.participation_status IS DISTINCT FROM NEW.participation_status) THEN
        NEW.participation_updated_at = CURRENT_TIMESTAMP;

        INSERT INTO audit_events (
            actor_account_id,
            entity_type,
            entity_id,
            action,
            old_values,
            new_values,
            notes
        ) VALUES (
            NEW.participation_updated_by,
            'STUDENT',
            NEW.student_id,
            'PARTICIPATION_CHANGED',
            jsonb_build_object('participation_status', OLD.participation_status),
            jsonb_build_object('participation_status', NEW.participation_status),
            'Student participation status manually updated.'
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_students_participation_audit ON students;
CREATE TRIGGER trg_students_participation_audit
    BEFORE UPDATE ON students
    FOR EACH ROW
    EXECUTE FUNCTION trg_audit_student_participation();

-- ============================================================================
-- 4. AUDIT TRIGGER: FAMILY CAPACITY CHANGES
-- ============================================================================
CREATE OR REPLACE FUNCTION trg_audit_family_capacity()
RETURNS TRIGGER AS $$
BEGIN
    IF (OLD.member_capacity IS DISTINCT FROM NEW.member_capacity) THEN
        INSERT INTO audit_events (
            actor_account_id,
            entity_type,
            entity_id,
            action,
            old_values,
            new_values,
            notes
        ) VALUES (
            NULL,
            'FAMILY',
            NEW.family_id,
            'CAPACITY_CHANGED',
            jsonb_build_object('member_capacity', OLD.member_capacity),
            jsonb_build_object('member_capacity', NEW.member_capacity),
            'Family member capacity adjusted.'
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_families_capacity_audit ON families;
CREATE TRIGGER trg_families_capacity_audit
    AFTER UPDATE ON families
    FOR EACH ROW
    EXECUTE FUNCTION trg_audit_family_capacity();

-- ============================================================================
-- 5. BUSINESS WORKFLOW: REQUEST STUDENT TRANSFER
-- ============================================================================
CREATE OR REPLACE FUNCTION fn_request_student_transfer(
    p_student_id BIGINT,
    p_to_family_id BIGINT,
    p_requested_by BIGINT,
    p_reason TEXT
)
RETURNS BIGINT AS $$
DECLARE
    v_requester_active BOOLEAN;
    v_person_id BIGINT;
    v_current_family_id BIGINT;
    v_to_family_active BOOLEAN;
    v_transfer_id BIGINT;
BEGIN
    -- 1. Validate requester account
    SELECT is_active INTO v_requester_active
    FROM fellowship_accounts
    WHERE account_id = p_requested_by;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Requester account ID % does not exist.', p_requested_by;
    END IF;

    IF v_requester_active = FALSE THEN
        RAISE EXCEPTION 'Inactive accounts cannot submit transfer requests.';
    END IF;

    -- 2. Validate destination family
    SELECT is_active INTO v_to_family_active
    FROM families
    WHERE family_id = p_to_family_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Destination family ID % does not exist.', p_to_family_id;
    END IF;

    IF v_to_family_active = FALSE THEN
        RAISE EXCEPTION 'Cannot transfer student to an inactive family (ID %).', p_to_family_id;
    END IF;

    -- 3. Fetch student & current active ordinary MEMBER assignment
    SELECT person_id INTO v_person_id
    FROM students
    WHERE student_id = p_student_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Student ID % does not exist.', p_student_id;
    END IF;

    SELECT family_id INTO v_current_family_id
    FROM family_assignments
    WHERE person_id = v_person_id
      AND role = 'MEMBER'
      AND end_date IS NULL;

    -- 4. Check that destination is not current family
    IF v_current_family_id IS NOT NULL AND v_current_family_id = p_to_family_id THEN
        RAISE EXCEPTION 'Student is already an active ordinary member of family ID %.', p_to_family_id;
    END IF;

    -- 5. Insert transfer request (Partial unique index will catch duplicate pending requests)
    INSERT INTO transfer_requests (
        student_id,
        from_family_id,
        to_family_id,
        requested_by,
        status,
        reason
    ) VALUES (
        p_student_id,
        v_current_family_id,
        p_to_family_id,
        p_requested_by,
        'PENDING',
        TRIM(p_reason)
    ) RETURNING transfer_id INTO v_transfer_id;

    -- 6. Log audit event
    INSERT INTO audit_events (
        actor_account_id,
        entity_type,
        entity_id,
        action,
        new_values,
        notes
    ) VALUES (
        p_requested_by,
        'TRANSFER_REQUEST',
        v_transfer_id,
        'INSERT',
        jsonb_build_object(
            'student_id', p_student_id,
            'from_family_id', v_current_family_id,
            'to_family_id', p_to_family_id,
            'reason', p_reason
        ),
        'Transfer request submitted.'
    );

    RETURN v_transfer_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 6. BUSINESS WORKFLOW: APPROVE TRANSFER REQUEST (ATOMIC & CONCURRENCY-SAFE)
-- ============================================================================
-- Enforces:
-- - ONLY ADMIN role may approve (Rule 11)
-- - Locks destination family to prevent concurrent capacity race conditions
-- - Normal capacity limit check
-- - Explicit administrative capacity override with mandatory reason & logging
-- - Validates source family matches student's current active MEMBER assignment
-- - Validates student has not been reassigned/transferred in the interim
-- - Closes old assignment and creates new active assignment in a single transaction
-- ============================================================================
CREATE OR REPLACE FUNCTION fn_approve_transfer_request(
    p_transfer_id BIGINT,
    p_admin_account_id BIGINT,
    p_decision_note TEXT DEFAULT NULL,
    p_allow_capacity_override BOOLEAN DEFAULT FALSE,
    p_override_reason TEXT DEFAULT NULL
)
RETURNS VOID AS $$
DECLARE
    v_admin_role account_role_enum;
    v_admin_active BOOLEAN;

    v_student_id BIGINT;
    v_req_from_family_id BIGINT;
    v_to_family_id BIGINT;
    v_status transfer_status_enum;

    v_person_id BIGINT;
    v_current_assignment_id BIGINT;
    v_current_family_id BIGINT;

    v_destination_capacity INTEGER;
    v_destination_active BOOLEAN;
    v_destination_name TEXT;
    v_current_member_count INTEGER;

    v_is_override BOOLEAN := FALSE;
    v_override_reason TEXT := NULL;
    v_override_by BIGINT := NULL;
    v_override_at TIMESTAMPTZ := NULL;
BEGIN
    -- Step 1: Authorization check — ONLY ADMIN accounts can approve transfers
    SELECT role, is_active INTO v_admin_role, v_admin_active
    FROM fellowship_accounts
    WHERE account_id = p_admin_account_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Admin account ID % not found.', p_admin_account_id;
    END IF;

    IF v_admin_active = FALSE THEN
        RAISE EXCEPTION 'Account ID % is inactive.', p_admin_account_id;
    END IF;

    IF v_admin_role <> 'ADMIN' THEN
        RAISE EXCEPTION 'Unauthorized: Only an administrator with role ADMIN can approve transfers (Account ID % has role %).', p_admin_account_id, v_admin_role;
    END IF;

    -- Step 2: Lock the transfer request row to guarantee isolated processing
    SELECT student_id, from_family_id, to_family_id, status
    INTO v_student_id, v_req_from_family_id, v_to_family_id, v_status
    FROM transfer_requests
    WHERE transfer_id = p_transfer_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Transfer request ID % not found.', p_transfer_id;
    END IF;

    IF v_status <> 'PENDING' THEN
        RAISE EXCEPTION 'Transfer request ID % is not PENDING (current status: %).', p_transfer_id, v_status;
    END IF;

    -- Step 3: Identify the student and their physical person_id
    SELECT person_id INTO v_person_id
    FROM students
    WHERE student_id = v_student_id;

    -- Step 4: Lock and verify the student's current active ordinary MEMBER assignment
    SELECT assignment_id, family_id
    INTO v_current_assignment_id, v_current_family_id
    FROM family_assignments
    WHERE person_id = v_person_id
      AND role = 'MEMBER'
      AND end_date IS NULL
    FOR UPDATE;

    -- Validate that source family matches the student's active assignment
    IF v_req_from_family_id IS NOT NULL THEN
        IF v_current_family_id IS NULL OR v_current_family_id <> v_req_from_family_id THEN
            RAISE EXCEPTION 'Integrity conflict: Student (ID %) current active family (ID %) does not match transfer source family (ID %). The student was modified or transferred after this request was created.',
                v_student_id, v_current_family_id, v_req_from_family_id;
        END IF;
    ELSE
        -- The request was submitted when student had no active family
        IF v_current_family_id IS NOT NULL THEN
            RAISE EXCEPTION 'Integrity conflict: Student (ID %) was unassigned when request was created, but now has an active family assignment (ID %).',
                v_student_id, v_current_family_id;
        END IF;
    END IF;

    -- Step 5: Lock destination family row and calculate capacity atomically
    SELECT member_capacity, is_active, family_name
    INTO v_destination_capacity, v_destination_active, v_destination_name
    FROM families
    WHERE family_id = v_to_family_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Destination family ID % not found.', v_to_family_id;
    END IF;

    IF v_destination_active = FALSE THEN
        RAISE EXCEPTION 'Destination family "%" (ID %) is inactive.', v_destination_name, v_to_family_id;
    END IF;

    -- Count active ordinary MEMBER assignments in the destination family
    SELECT COUNT(*) INTO v_current_member_count
    FROM family_assignments
    WHERE family_id = v_to_family_id
      AND role = 'MEMBER'
      AND end_date IS NULL;

    -- Capacity evaluation: check if adding 1 member would breach capacity
    IF v_current_member_count >= v_destination_capacity THEN
        IF p_allow_capacity_override = TRUE THEN
            -- Administrator explicit capacity override
            IF p_override_reason IS NULL OR LENGTH(TRIM(p_override_reason)) = 0 THEN
                RAISE EXCEPTION 'Capacity override rejected: An explicit, non-empty reason is mandatory when overriding family capacity limit.';
            END IF;

            v_is_override := TRUE;
            v_override_reason := TRIM(p_override_reason);
            v_override_by := p_admin_account_id;
            v_override_at := CURRENT_TIMESTAMP;
        ELSE
            -- Hard limit enforcement
            RAISE EXCEPTION 'Capacity violation: Destination family "%" has reached capacity (% active members out of % capacity). To override, pass p_allow_capacity_override = TRUE with an explicit reason.',
                v_destination_name, v_current_member_count, v_destination_capacity;
        END IF;
    END IF;

    -- Step 6: Atomic Transition — Close old assignment if one exists
    IF v_current_assignment_id IS NOT NULL THEN
        UPDATE family_assignments
        SET end_date = CURRENT_DATE,
            ended_by = p_admin_account_id,
            end_reason = 'Transferred to ' || v_destination_name || ' (Transfer Request #' || p_transfer_id || ')'
        WHERE assignment_id = v_current_assignment_id;
    END IF;

    -- Step 7: Atomic Transition — Create new active MEMBER assignment
    INSERT INTO family_assignments (
        family_id,
        person_id,
        role,
        start_date,
        end_date,
        assigned_by
    ) VALUES (
        v_to_family_id,
        v_person_id,
        'MEMBER',
        CURRENT_DATE,
        NULL,
        p_admin_account_id
    );

    -- Step 8: Update transfer request status and audit fields
    UPDATE transfer_requests
    SET status = 'APPROVED',
        approved_by = p_admin_account_id,
        decided_at = CURRENT_TIMESTAMP,
        decision_note = TRIM(p_decision_note),
        is_capacity_override = v_is_override,
        capacity_override_reason = v_override_reason,
        capacity_override_by = v_override_by,
        capacity_override_at = v_override_at
    WHERE transfer_id = p_transfer_id;

    -- Step 9: Audit log entry
    INSERT INTO audit_events (
        actor_account_id,
        entity_type,
        entity_id,
        action,
        old_values,
        new_values,
        notes
    ) VALUES (
        p_admin_account_id,
        'TRANSFER_REQUEST',
        p_transfer_id,
        CASE WHEN v_is_override THEN 'TRANSFER_OVERRIDE' ELSE 'TRANSFER_APPROVED' END,
        jsonb_build_object('status', 'PENDING', 'from_family_id', v_req_from_family_id),
        jsonb_build_object(
            'status', 'APPROVED',
            'to_family_id', v_to_family_id,
            'is_capacity_override', v_is_override,
            'capacity_override_reason', v_override_reason
        ),
        CASE
            WHEN v_is_override THEN 'Transfer approved with authorized administrative capacity override.'
            ELSE 'Transfer approved under standard capacity.'
        END
    );
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 7. BUSINESS WORKFLOW: REJECT TRANSFER REQUEST
-- ============================================================================
-- Enforces:
-- - ONLY ADMIN role may reject
-- - Rejection preserves full history
-- - Family membership remains completely unchanged
-- ============================================================================
CREATE OR REPLACE FUNCTION fn_reject_transfer_request(
    p_transfer_id BIGINT,
    p_admin_account_id BIGINT,
    p_decision_note TEXT DEFAULT NULL
)
RETURNS VOID AS $$
DECLARE
    v_admin_role account_role_enum;
    v_admin_active BOOLEAN;
    v_status transfer_status_enum;
BEGIN
    -- Check admin authorization
    SELECT role, is_active INTO v_admin_role, v_admin_active
    FROM fellowship_accounts
    WHERE account_id = p_admin_account_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Admin account ID % not found.', p_admin_account_id;
    END IF;

    IF v_admin_active = FALSE THEN
        RAISE EXCEPTION 'Account ID % is inactive.', p_admin_account_id;
    END IF;

    IF v_admin_role <> 'ADMIN' THEN
        RAISE EXCEPTION 'Unauthorized: Only an administrator with role ADMIN can reject transfers (Account ID % has role %).', p_admin_account_id, v_admin_role;
    END IF;

    -- Lock and check request status
    SELECT status INTO v_status
    FROM transfer_requests
    WHERE transfer_id = p_transfer_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Transfer request ID % not found.', p_transfer_id;
    END IF;

    IF v_status <> 'PENDING' THEN
        RAISE EXCEPTION 'Transfer request ID % is not PENDING (current status: %).', p_transfer_id, v_status;
    END IF;

    -- Mark rejected (assignments remain untouched)
    UPDATE transfer_requests
    SET status = 'REJECTED',
        approved_by = p_admin_account_id,
        decided_at = CURRENT_TIMESTAMP,
        decision_note = TRIM(p_decision_note)
    WHERE transfer_id = p_transfer_id;

    -- Audit log
    INSERT INTO audit_events (
        actor_account_id,
        entity_type,
        entity_id,
        action,
        old_values,
        new_values,
        notes
    ) VALUES (
        p_admin_account_id,
        'TRANSFER_REQUEST',
        p_transfer_id,
        'TRANSFER_REJECTED',
        jsonb_build_object('status', 'PENDING'),
        jsonb_build_object('status', 'REJECTED', 'decision_note', p_decision_note),
        'Transfer request rejected. Family assignments unaltered.'
    );
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 8. BUSINESS WORKFLOW: ASSIGN FAMILY ROLE (DIRECT ASSIGNMENT)
-- ============================================================================
-- Supports assigning DAD, MOM, or MEMBER roles.
-- When assigning MEMBER, capacity is locked and verified with override support.
-- ============================================================================
CREATE OR REPLACE FUNCTION fn_assign_family_role(
    p_family_id BIGINT,
    p_person_id BIGINT,
    p_role family_role_enum,
    p_assigned_by BIGINT,
    p_allow_capacity_override BOOLEAN DEFAULT FALSE,
    p_override_reason TEXT DEFAULT NULL
)
RETURNS BIGINT AS $$
DECLARE
    v_capacity INTEGER;
    v_is_active BOOLEAN;
    v_family_name TEXT;
    v_current_count INTEGER;
    v_new_assignment_id BIGINT;
BEGIN
    -- Verify family
    SELECT member_capacity, is_active, family_name
    INTO v_capacity, v_is_active, v_family_name
    FROM families
    WHERE family_id = p_family_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Family ID % not found.', p_family_id;
    END IF;

    IF v_is_active = FALSE THEN
        RAISE EXCEPTION 'Cannot assign person to inactive family "%".', v_family_name;
    END IF;

    -- If assigning ordinary MEMBER, check capacity
    IF p_role = 'MEMBER' THEN
        SELECT COUNT(*) INTO v_current_count
        FROM family_assignments
        WHERE family_id = p_family_id
          AND role = 'MEMBER'
          AND end_date IS NULL;

        IF v_current_count >= v_capacity THEN
            IF p_allow_capacity_override = FALSE THEN
                RAISE EXCEPTION 'Capacity exceeded: Family "%" has % of % active members.', v_family_name, v_current_count, v_capacity;
            ELSE
                IF p_override_reason IS NULL OR LENGTH(TRIM(p_override_reason)) = 0 THEN
                    RAISE EXCEPTION 'Capacity override requires an explicit, non-empty reason.';
                END IF;
            END IF;
        END IF;
    END IF;

    -- Insert assignment (constraints will enforce one active member role and no duplicate role in same family)
    INSERT INTO family_assignments (
        family_id,
        person_id,
        role,
        start_date,
        end_date,
        assigned_by
    ) VALUES (
        p_family_id,
        p_person_id,
        p_role,
        CURRENT_DATE,
        NULL,
        p_assigned_by
    ) RETURNING assignment_id INTO v_new_assignment_id;

    RETURN v_new_assignment_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 9. BUSINESS WORKFLOW: END FAMILY ASSIGNMENT
-- ============================================================================
CREATE OR REPLACE FUNCTION fn_end_family_assignment(
    p_assignment_id BIGINT,
    p_ended_by BIGINT,
    p_end_reason TEXT DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
    UPDATE family_assignments
    SET end_date = CURRENT_DATE,
        ended_by = p_ended_by,
        end_reason = TRIM(p_end_reason)
    WHERE assignment_id = p_assignment_id
      AND end_date IS NULL;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Active assignment ID % not found or already ended.', p_assignment_id;
    END IF;
END;
$$ LANGUAGE plpgsql;
