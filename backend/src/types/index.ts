export type AccountRole = 'ADMIN' | 'FELLOWSHIP_LEADER';
export type FamilyRole = 'DAD' | 'MOM' | 'MEMBER';
export type ParticipationStatus = 'ACTIVE' | 'INACTIVE';
export type TransferStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
export type Gender = 'MALE' | 'FEMALE';

export interface AuthUser {
  accountId: number;
  personId: number;
  username: string;
  role: AccountRole;
  fullName: string;
  phone: string;
  email: string | null;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export interface Person {
  person_id: number;
  full_name: string;
  phone: string;
  email: string | null;
  created_at: string;
  updated_at: string;
}

export interface StudentListItem {
  student_id: number;
  person_id: number;
  full_name: string;
  phone: string;
  email: string | null;
  gender: Gender;
  university_student_id: string | null;
  department_id: number | null;
  department_name: string | null;
  academic_stage_id: number | null;
  stage_name: string | null;
  year_number: number | null;
  gc_classification_id: number | null;
  gc_classification_name: string | null;
  family_id: number | null;
  family_name: string | null;
  family_code: string | null;
  family_role: FamilyRole | null;
  participation_status: ParticipationStatus;
  enrollment_date: string | null;
  created_at: string;
}

export interface FamilyListItem {
  family_id: number;
  family_code: string;
  family_name: string;
  member_capacity: number;
  is_active: boolean;
  active_dads_count: number;
  active_moms_count: number;
  active_members_count: number;
  total_active_people_count: number;
  remaining_spaces: number;
  capacity_status: 'BELOW_CAPACITY' | 'AT_CAPACITY' | 'OVER_CAPACITY';
}

export interface TransferRequestItem {
  transfer_id: number;
  student_id: number;
  student_name: string;
  university_student_id: string | null;
  from_family_id: number | null;
  from_family_name: string | null;
  from_family_code: string | null;
  to_family_id: number;
  to_family_name: string;
  to_family_code: string;
  status: TransferStatus;
  reason: string;
  requested_at: string;
  requested_by_username: string;
  requested_by_name: string;
  decided_at: string | null;
  decision_note: string | null;
  approved_by_username: string | null;
  approved_by_name: string | null;
  is_capacity_override: boolean;
  capacity_override_reason: string | null;
  capacity_override_by_username: string | null;
  capacity_override_at: string | null;
}
