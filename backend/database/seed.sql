-- ============================================================================
-- FTVTI ECSF Fellowship Student & Family Management System
-- Fictional Demonstration and Testing Seed Data
-- File: database/seed.sql
-- ============================================================================

-- Disable notices during seed run
SET client_min_messages = warning;

-- ============================================================================
-- 1. DEPARTMENTS SEED DATA
-- ============================================================================
INSERT INTO departments (department_name, is_active) VALUES
    ('Information & Communication Technology', TRUE),
    ('Electrical & Electronics Technology', TRUE),
    ('Automotive Technology', TRUE),
    ('Manufacturing Technology', TRUE),
    ('Civil & Construction Technology', TRUE)
ON CONFLICT (department_name) DO NOTHING;

-- ============================================================================
-- 2. ACADEMIC STAGES (Remedial = 0 Year, First Year = 1 Year, etc.)
-- ============================================================================
INSERT INTO academic_stages (stage_name, year_number, display_order, is_active) VALUES
    ('Remedial (0 Year)', 0, 0, TRUE),
    ('First Year (1st Year)', 1, 1, TRUE),
    ('Second Year (2nd Year)', 2, 2, TRUE),
    ('Third Year (3rd Year)', 3, 3, TRUE),
    ('Fourth Year (4th Year)', 4, 4, TRUE),
    ('Fifth Year (5th Year)', 5, 5, TRUE)
ON CONFLICT (stage_name) DO UPDATE
SET year_number = EXCLUDED.year_number,
    display_order = EXCLUDED.display_order;

-- ============================================================================
-- 3. GC (GRADUATING CLASS) CLASSIFICATIONS
-- ============================================================================
INSERT INTO gc_classifications (classification_name, description, is_active) VALUES
    ('Graduating Class (GC)', 'Students currently in the final year of their specific academic curriculum.', TRUE),
    ('Non-Graduating (Non-GC)', 'Continuing students not yet eligible for graduating class status.', TRUE)
ON CONFLICT (classification_name) DO NOTHING;

-- ============================================================================
-- 4. PHYSICAL INDIVIDUALS (people)
-- Fictional dataset covering Administrators, Leaders, Dads, Moms, and Students
-- ============================================================================
INSERT INTO people (full_name, phone, email) VALUES
    -- 1: System Admin
    ('Samuel Kassa (Admin)', '+251-911-000001', 'admin.samuel@fellowship.example.org'),
    -- 2: Fellowship Leader 1
    ('Ruth Haile (Leader)', '+251-911-000002', 'ruth.haile@fellowship.example.org'),
    -- 3: Fellowship Leader 2
    ('Daniel Bekele (Leader)', '+251-911-000003', 'daniel.bekele@fellowship.example.org'),
    -- 4: Senior Non-Student Dad (Bethel Family Dad)
    ('Pastor Yohannes Tesfaye', '+251-911-000004', 'yohannes.tesfaye@community.example.org'),
    -- 5: Senior Non-Student Mom (Bethel Family Mom)
    ('Sister Martha Girma', '+251-911-000005', 'martha.girma@community.example.org'),
    -- 6: Student who also serves as Dad of Shiloh Family (Dual Role: Student + Family Dad)
    ('Dawit Tadesse (Student & Dad)', '+251-911-000006', 'dawit.tadesse@student.example.org'),
    -- 7: Student who is a MEMBER in Bethel Family and MOM in Ebenezer Family (Dual Family Role)
    ('Sara Solomon (Member & Mom)', '+251-911-000007', 'sara.solomon@student.example.org'),
    -- 8: Ebenezer Family Dad
    ('Elder Michael Alemu', '+251-911-000008', 'michael.alemu@community.example.org'),
    -- 9: Zion Family Dad
    ('Pastor Ephrem Mengistu', '+251-911-000009', 'ephrem.mengistu@community.example.org'),
    -- 10: Zion Family Mom
    ('Sister Hana Desta', '+251-911-000010', 'hana.desta@community.example.org'),
    -- 11-17: Regular Students
    ('Bereket Wolde', '+251-911-000011', 'bereket.wolde@student.example.org'),
    ('Hellen Negash', '+251-911-000012', 'hellen.negash@student.example.org'),
    ('Nahom Fikru', '+251-911-000013', 'nahom.fikru@student.example.org'),
    ('Liya Kebede', '+251-911-000014', 'liya.kebede@student.example.org'),
    ('Abel Tefera', '+251-911-000015', 'abel.tefera@student.example.org'),
    ('Eden Shimelis', '+251-911-000016', 'eden.shimelis@student.example.org'),
    ('Kaleb Mulugeta', '+251-911-000017', 'kaleb.mulugeta@student.example.org'),
    -- 18: Unassigned Student (No active family)
    ('Tsion Assefa (Unassigned)', '+251-911-000018', 'tsion.assefa@student.example.org'),
    -- 19: Incomplete Profile Student (Missing Stage, Dept, GC)
    ('Yonas Hailu (Incomplete Profile)', '+251-911-000019', 'yonas.hailu@student.example.org');

-- ============================================================================
-- 5. FELLOWSHIP PRIVILEGED ACCOUNTS (fellowship_accounts)
-- Notice: Dads, Moms, and regular members have NO accounts.
-- Only ADMIN and FELLOWSHIP_LEADER accounts exist.
-- Fictional PBKDF2/bcrypt placeholder hash used for seed demonstration.
-- ============================================================================
INSERT INTO fellowship_accounts (person_id, username, password_hash, role, is_active) VALUES
    -- Initial System Administrator
    (1, 'admin_samuel', '$2a$12$e86gXh8kLmNpQrStUvWxYzO1A2B3C4D5E6F7G8H9I0J1K2L3M4N5O', 'ADMIN', TRUE),
    -- Fellowship Leader 1
    (2, 'leader_ruth', '$2a$12$aB3c4D5e6F7g8H9i0J1k2L3m4N5o6P7q8R9s0T1u2V3w4X5y6Z7A8B', 'FELLOWSHIP_LEADER', TRUE),
    -- Fellowship Leader 2
    (3, 'leader_daniel', '$2a$12$zY9x8W7v6U5t4S3r2Q1p0O9n8M7l6K5j4I3h2G1f0E9d8C7b6A5Z4Y', 'FELLOWSHIP_LEADER', TRUE);

-- ============================================================================
-- 6. FAMILIES
-- Varied member capacities to test below-capacity, at-capacity, and over-capacity
-- ============================================================================
INSERT INTO families (family_code, family_name, member_capacity, is_active, created_by) VALUES
    ('FAM-BTH', 'Bethel Family', 4, TRUE, 1),      -- Capacity 4
    ('FAM-EBN', 'Ebenezer Family', 3, TRUE, 1),    -- Capacity 3
    ('FAM-SHL', 'Shiloh Family', 2, TRUE, 1),      -- Capacity 2
    ('FAM-ZON', 'Zion Family', 5, TRUE, 1);        -- Capacity 5

-- ============================================================================
-- 7. OPTIONAL SCOPING: fellowship_leader_family_access
-- ============================================================================
INSERT INTO fellowship_leader_family_access (account_id, family_id, granted_by) VALUES
    (2, 1, 1),  -- Ruth assigned to Bethel Family
    (2, 2, 1),  -- Ruth assigned to Ebenezer Family
    (3, 3, 1),  -- Daniel assigned to Shiloh Family
    (3, 4, 1);  -- Daniel assigned to Zion Family

-- ============================================================================
-- 8. STUDENTS
-- ============================================================================
INSERT INTO students (
    person_id,
    university_student_id,
    department_id,
    academic_stage_id,
    gc_classification_id,
    gender,
    enrollment_date,
    participation_status,
    participation_updated_by,
    created_by
) VALUES
    -- Dawit: 4th Year, GC, Male, ICT (Also Shiloh Dad)
    (6, 'FTVTI/2021/0101', 1, 5, 1, 'MALE', '2021-10-15', 'ACTIVE', 1, 1),
    -- Sara: 3rd Year, GC (3-yr program), Female, Garment/Manufacturing (Also Ebenezer Mom, Bethel Member)
    (7, 'FTVTI/2022/0202', 4, 4, 1, 'FEMALE', '2022-10-20', 'ACTIVE', 1, 1),
    -- Bereket: Remedial (0 Year), Non-GC, Male, ICT
    (11, 'FTVTI/2025/0301', 1, 1, 2, 'MALE', '2025-09-01', 'ACTIVE', 1, 1),
    -- Hellen: 1st Year (1 Year), Non-GC, Female, Electrical
    (12, 'FTVTI/2024/0402', 2, 2, 2, 'FEMALE', '2024-10-05', 'ACTIVE', 1, 1),
    -- Nahom: 2nd Year (2 Year), Non-GC, Male, Automotive
    (13, 'FTVTI/2023/0503', 3, 3, 2, 'MALE', '2023-10-10', 'ACTIVE', 1, 1),
    -- Liya: 3rd Year (3 Year), Non-GC, Female, Civil
    (14, 'FTVTI/2022/0604', 5, 4, 2, 'FEMALE', '2022-10-12', 'ACTIVE', 1, 1),
    -- Abel: 4th Year (4 Year), GC, Male, Electrical
    (15, 'FTVTI/2021/0705', 2, 5, 1, 'MALE', '2021-10-01', 'ACTIVE', 1, 1),
    -- Eden: 2nd Year (2 Year), Non-GC, Female, ICT
    (16, 'FTVTI/2023/0806', 1, 3, 2, 'FEMALE', '2023-10-15', 'INACTIVE', 1, 1),
    -- Kaleb: 1st Year (1 Year), Non-GC, Male, Civil
    (17, 'FTVTI/2024/0907', 5, 2, 2, 'MALE', '2024-10-25', 'ACTIVE', 1, 1),
    -- Tsion: Remedial (0 Year), Non-GC, Female, Automotive (Currently Unassigned to family)
    (18, 'FTVTI/2025/1008', 3, 1, 2, 'FEMALE', '2025-09-01', 'ACTIVE', 1, 1),
    -- Yonas: Incomplete Profile (Null dept, stage, gc)
    (19, NULL, NULL, NULL, NULL, 'MALE', '2025-09-01', 'ACTIVE', 1, 1);

-- ============================================================================
-- 9. FAMILY ASSIGNMENTS (Dads, Moms, Ordinary Members, Past History)
-- ============================================================================
INSERT INTO family_assignments (
    family_id,
    person_id,
    role,
    start_date,
    end_date,
    assigned_by,
    ended_by,
    end_reason
) VALUES
    -- BETHEL FAMILY (Capacity = 4)
    -- Active Dad (Non-student)
    (1, 4, 'DAD', '2023-09-01', NULL, 1, NULL, NULL),
    -- Active Mom (Non-student)
    (1, 5, 'MOM', '2023-09-01', NULL, 1, NULL, NULL),
    -- Active Members: Sara, Bereket, Hellen, Nahom (4 active members -> AT CAPACITY)
    (1, 7, 'MEMBER', '2023-10-01', NULL, 1, NULL, NULL),
    (1, 11, 'MEMBER', '2025-09-10', NULL, 1, NULL, NULL),
    (1, 12, 'MEMBER', '2024-10-15', NULL, 1, NULL, NULL),
    (1, 13, 'MEMBER', '2023-10-20', NULL, 1, NULL, NULL),

    -- EBENEZER FAMILY (Capacity = 3)
    -- Active Dad
    (2, 8, 'DAD', '2022-09-01', NULL, 1, NULL, NULL),
    -- Active Mom (Sara Solomon: Dual role -> Bethel Member & Ebenezer Mom!)
    (2, 7, 'MOM', '2024-09-01', NULL, 1, NULL, NULL),
    -- Former Mom in Ebenezer (Historical assignment preserved!)
    (2, 10, 'MOM', '2022-09-01', '2024-08-31', 1, 1, 'Graduated and relocated to Zion family'),
    -- Active Members: Liya, Abel (2 active members out of 3 capacity -> BELOW CAPACITY)
    (2, 14, 'MEMBER', '2022-10-15', NULL, 1, NULL, NULL),
    (2, 15, 'MEMBER', '2021-10-10', NULL, 1, NULL, NULL),

    -- SHILOH FAMILY (Capacity = 2)
    -- Active Dad (Dawit Tadesse: Dual role -> Student + Family Dad!)
    (3, 6, 'DAD', '2024-09-01', NULL, 1, NULL, NULL),
    -- Shiloh has no active Mom currently (Validating that families do not require both)
    -- Active Members: Eden, Kaleb (2 active members out of 2 capacity -> AT CAPACITY)
    (3, 16, 'MEMBER', '2023-10-20', NULL, 1, NULL, NULL),
    (3, 17, 'MEMBER', '2024-10-28', NULL, 1, NULL, NULL),

    -- ZION FAMILY (Capacity = 5)
    -- Active Dad
    (4, 9, 'DAD', '2024-09-01', NULL, 1, NULL, NULL),
    -- Active Mom
    (4, 10, 'MOM', '2024-09-01', NULL, 1, NULL, NULL),
    -- Currently 0 active ordinary members (BELOW CAPACITY, 5 spaces available)

    -- Historical assignment for Bereket (previously Member in Shiloh, ended when transferred)
    (3, 11, 'MEMBER', '2025-08-01', '2025-09-09', 1, 1, 'Transferred to Bethel Family');

-- ============================================================================
-- 10. TRANSFER REQUESTS (Completed, Rejected, and Pending Examples)
-- ============================================================================
INSERT INTO transfer_requests (
    student_id,
    from_family_id,
    to_family_id,
    requested_by,
    approved_by,
    status,
    reason,
    requested_at,
    decided_at,
    decision_note,
    is_capacity_override,
    capacity_override_reason,
    capacity_override_by,
    capacity_override_at
) VALUES
    -- Completed transfer (Bereket from Shiloh to Bethel)
    (
        3, -- Bereket Wolde (student_id = 3)
        3, -- from Shiloh
        1, -- to Bethel
        2, -- requested by Leader Ruth
        1, -- approved by Admin Samuel
        'APPROVED',
        'Schedule conflict with Shiloh family weekly prayer meeting.',
        CURRENT_TIMESTAMP - INTERVAL '30 days',
        CURRENT_TIMESTAMP - INTERVAL '29 days',
        'Approved after reviewing family meeting times.',
        FALSE,
        NULL,
        NULL,
        NULL
    ),
    -- Rejected transfer (Abel from Ebenezer to Bethel)
    (
        7, -- Abel Tefera (student_id = 7)
        2, -- from Ebenezer
        1, -- to Bethel
        3, -- requested by Leader Daniel
        1, -- decided by Admin Samuel
        'REJECTED',
        'Requested move to be with department coursemates.',
        CURRENT_TIMESTAMP - INTERVAL '15 days',
        CURRENT_TIMESTAMP - INTERVAL '14 days',
        'Rejected: Bethel is already at capacity; balance maintained in Ebenezer.',
        FALSE,
        NULL,
        NULL,
        NULL
    ),
    -- Active Pending transfer (Liya from Ebenezer to Zion)
    (
        6, -- Liya Kebede (student_id = 6)
        2, -- from Ebenezer
        4, -- to Zion
        2, -- requested by Leader Ruth
        NULL,
        'PENDING',
        'Dormitory relocation to Block 42 closer to Zion fellowship location.',
        CURRENT_TIMESTAMP - INTERVAL '2 days',
        NULL,
        NULL,
        FALSE,
        NULL,
        NULL,
        NULL
    );
