export type AccountRole = 'ADMIN' | 'FELLOWSHIP_LEADER';
export type FamilyRole = 'DAD' | 'MOM' | 'MEMBER';
export type ParticipationStatus = 'ACTIVE' | 'INACTIVE';
export type TransferStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
export type Gender = 'MALE' | 'FEMALE';
export type CapacityStatus = 'BELOW_CAPACITY' | 'AT_CAPACITY' | 'OVER_CAPACITY';

export interface User {
  accountId: number;
  personId: number;
  username: string;
  role: AccountRole;
  fullName: string;
  phone: string;
  email: string | null;
}

export interface StudentListItem {
  studentId: number;
  personId: number;
  fullName: string;
  phone: string;
  email: string | null;
  gender: Gender;
  universityStudentId: string | null;
  departmentId: number | null;
  departmentName: string | null;
  academicStageId: number | null;
  stageName: string | null;
  yearNumber: number | null;
  gcClassificationId: number | null;
  gcClassificationName: string | null;
  participationStatus: ParticipationStatus;
  enrollmentDate: string | null;
  createdAt: string;
  familyId: number | null;
  familyName: string | null;
  familyCode: string | null;
  familyRole: FamilyRole | null;
}

export interface StudentDetail {
  student: {
    studentId: number;
    personId: number;
    fullName: string;
    phone: string;
    email: string | null;
    gender: Gender;
    universityStudentId: string | null;
    departmentId: number | null;
    departmentName: string | null;
    academicStageId: number | null;
    stageName: string | null;
    yearNumber: number | null;
    gcClassificationId: number | null;
    gcClassificationName: string | null;
    participationStatus: ParticipationStatus;
    participationUpdatedAt: string;
    participationUpdatedByName: string | null;
    enrollmentDate: string | null;
    createdAt: string;
    updatedAt: string;
  };
  activeAssignments: Array<{
    assignmentId: number;
    familyId: number;
    familyCode: string;
    familyName: string;
    role: FamilyRole;
    startDate: string;
    assignedByUsername: string;
  }>;
  assignmentHistory: Array<{
    assignmentId: number;
    familyId: number;
    familyCode: string;
    familyName: string;
    role: FamilyRole;
    startDate: string;
    endDate: string;
    endReason: string | null;
    assignedByUsername: string;
    endedByUsername: string | null;
  }>;
  transferHistory: Array<{
    transferId: number;
    fromFamilyId: number | null;
    fromFamilyName: string | null;
    toFamilyId: number;
    toFamilyName: string;
    status: TransferStatus;
    reason: string;
    requestedAt: string;
    requestedByName: string;
    decidedAt: string | null;
    approvedByName: string | null;
    decisionNote: string | null;
    isCapacityOverride: boolean;
    capacityOverrideReason: string | null;
  }>;
}

export interface FamilyListItem {
  familyId: number;
  familyCode: string;
  familyName: string;
  memberCapacity: number;
  isActive: boolean;
  activeDadsCount: number;
  activeMomsCount: number;
  activeMembersCount: number;
  totalActivePeopleCount: number;
  remainingSpaces: number;
  capacityStatus: CapacityStatus;
  displayStatus: string;
  leadershipSummary: string;
}

export interface FamilyDetail {
  family: {
    familyId: number;
    familyCode: string;
    familyName: string;
    memberCapacity: number;
    isActive: boolean;
    activeMemberCount: number;
    remainingSpaces: number;
    capacityStatus: CapacityStatus;
    createdByUsername: string | null;
    createdAt: string;
    updatedAt: string;
  };
  leaders: Array<{
    assignmentId: number;
    role: FamilyRole;
    startDate: string;
    personId: number;
    fullName: string;
    phone: string;
    email: string | null;
    studentId: number | null;
    universityStudentId: string | null;
  }>;
  members: Array<{
    assignmentId: number;
    role: FamilyRole;
    startDate: string;
    personId: number;
    fullName: string;
    phone: string;
    email: string | null;
    studentId: number | null;
    universityStudentId: string | null;
    gender: Gender;
    departmentName: string | null;
    academicStage: string | null;
    academicYear: number | null;
    gcClassification: string | null;
    participationStatus: ParticipationStatus;
  }>;
  history: Array<{
    assignmentId: number;
    role: FamilyRole;
    startDate: string;
    endDate: string;
    endReason: string | null;
    personId: number;
    fullName: string;
    phone: string;
    assignedByUsername: string;
    endedByUsername: string | null;
  }>;
}

export interface TransferItem {
  transferId: number;
  studentId: number;
  studentName: string;
  universityStudentId: string | null;
  fromFamilyId: number | null;
  fromFamilyName: string;
  fromFamilyCode: string | null;
  toFamilyId: number;
  toFamilyName: string;
  toFamilyCode: string;
  destinationCapacity: number;
  destinationCurrentMembers: number;
  status: TransferStatus;
  reason: string;
  requestedAt: string;
  requestedByUsername: string;
  requestedByName: string;
  decidedAt: string | null;
  decisionNote: string | null;
  approvedByUsername: string | null;
  approvedByName: string | null;
  isCapacityOverride: boolean;
  capacityOverrideReason: string | null;
  capacityOverrideByUsername: string | null;
  capacityOverrideAt: string | null;
}

export interface DashboardStats {
  totalStudents: number;
  activeStudents: number;
  inactiveStudents: number;
  activePercentage: number;
  totalFamilies: number;
  gcStudents: number;
  remedialStudents: number;
  unassignedStudents: number;
  pendingTransfers: number;
  familiesOverCapacity: number;
  familiesAtCapacity: number;
  familiesBelowCapacity: number;
}
