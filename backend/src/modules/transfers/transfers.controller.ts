import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { query } from '../../config/db.js';

const requestTransferSchema = z.object({
  studentId: z.number().int().positive('Student ID is required'),
  toFamilyId: z.number().int().positive('Destination family is required'),
  reason: z.string().min(5, 'A detailed reason is required (minimum 5 characters)'),
});

const approveTransferSchema = z.object({
  decisionNote: z.string().optional().nullable(),
  allowCapacityOverride: z.boolean().default(false),
  overrideReason: z.string().optional().nullable(),
});

const rejectTransferSchema = z.object({
  decisionNote: z.string().min(3, 'A rejection reason/note is required (minimum 3 characters)'),
});

export async function getTransfers(req: Request, res: Response, next: NextFunction) {
  try {
    const status = req.query.status as string; // ALL, PENDING, APPROVED, REJECTED, CANCELLED

    const conditions: string[] = ['1=1'];
    const params: any[] = [];

    if (status && status !== 'ALL') {
      params.push(status);
      conditions.push(`tr.status = $${params.length}`);
    }

    const whereClause = conditions.join(' AND ');

    // Counts for tabs (Pending, Approved, Rejected)
    const countsRes = await query(`
      SELECT
        COUNT(*) FILTER (WHERE status = 'PENDING') as pending_count,
        COUNT(*) FILTER (WHERE status = 'APPROVED') as approved_count,
        COUNT(*) FILTER (WHERE status = 'REJECTED') as rejected_count,
        COUNT(*) as total_count
      FROM transfer_requests
    `);
    const tabCounts = countsRes.rows[0];

    const result = await query(
      `SELECT
        tr.transfer_id,
        tr.student_id,
        stu_p.full_name as student_name,
        s.university_student_id,
        tr.from_family_id,
        ff.family_name as from_family_name,
        ff.family_code as from_family_code,
        tr.to_family_id,
        tf.family_name as to_family_name,
        tf.family_code as to_family_code,
        tf.member_capacity as destination_capacity,
        (
          SELECT COUNT(*) FROM family_assignments fa
          WHERE fa.family_id = tr.to_family_id AND fa.role = 'MEMBER' AND fa.end_date IS NULL
        ) as destination_current_members,
        tr.status,
        tr.reason,
        tr.requested_at,
        req_acc.username as requested_by_username,
        req_p.full_name as requested_by_name,
        tr.decided_at,
        tr.decision_note,
        app_acc.username as approved_by_username,
        app_p.full_name as approved_by_name,
        tr.is_capacity_override,
        tr.capacity_override_reason,
        ovr_acc.username as capacity_override_by_username,
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
      WHERE ${whereClause}
      ORDER BY
        CASE WHEN tr.status = 'PENDING' THEN 1 ELSE 2 END,
        tr.requested_at DESC`,
      params
    );

    res.json({
      tabCounts: {
        pending: parseInt(tabCounts.pending_count || '0', 10),
        approved: parseInt(tabCounts.approved_count || '0', 10),
        rejected: parseInt(tabCounts.rejected_count || '0', 10),
        total: parseInt(tabCounts.total_count || '0', 10),
      },
      transfers: result.rows.map((r) => ({
        transferId: Number(r.transfer_id),
        studentId: Number(r.student_id),
        studentName: r.student_name,
        universityStudentId: r.university_student_id,
        fromFamilyId: r.from_family_id ? Number(r.from_family_id) : null,
        fromFamilyName: r.from_family_name || 'Unassigned',
        fromFamilyCode: r.from_family_code,
        toFamilyId: Number(r.to_family_id),
        toFamilyName: r.to_family_name,
        toFamilyCode: r.to_family_code,
        destinationCapacity: Number(r.destination_capacity),
        destinationCurrentMembers: Number(r.destination_current_members || 0),
        status: r.status,
        reason: r.reason,
        requestedAt: r.requested_at,
        requestedByUsername: r.requested_by_username,
        requestedByName: r.requested_by_name,
        decidedAt: r.decided_at,
        decisionNote: r.decision_note,
        approvedByUsername: r.approved_by_username,
        approvedByName: r.approved_by_name,
        isCapacityOverride: r.is_capacity_override,
        capacityOverrideReason: r.capacity_override_reason,
        capacityOverrideByUsername: r.capacity_override_by_username,
        capacityOverrideAt: r.capacity_override_at,
      })),
    });
  } catch (err) {
    next(err);
  }
}

export async function getTransferById(req: Request, res: Response, next: NextFunction) {
  try {
    const transferId = parseInt(req.params.id, 10);
    if (isNaN(transferId)) {
      return res.status(400).json({ error: 'Invalid transfer ID.' });
    }

    const result = await query(
      `SELECT
        tr.transfer_id,
        tr.student_id,
        stu_p.full_name as student_name,
        stu_p.phone as student_phone,
        stu_p.email as student_email,
        s.university_student_id,
        s.gender,
        d.department_name,
        ast.stage_name as academic_stage,
        tr.from_family_id,
        ff.family_name as from_family_name,
        ff.family_code as from_family_code,
        tr.to_family_id,
        tf.family_name as to_family_name,
        tf.family_code as to_family_code,
        tf.member_capacity as destination_capacity,
        (
          SELECT COUNT(*) FROM family_assignments fa
          WHERE fa.family_id = tr.to_family_id AND fa.role = 'MEMBER' AND fa.end_date IS NULL
        ) as destination_current_members,
        tr.status,
        tr.reason,
        tr.requested_at,
        req_acc.username as requested_by_username,
        req_p.full_name as requested_by_name,
        tr.decided_at,
        tr.decision_note,
        app_acc.username as approved_by_username,
        app_p.full_name as approved_by_name,
        tr.is_capacity_override,
        tr.capacity_override_reason,
        ovr_acc.username as capacity_override_by_username,
        tr.capacity_override_at
      FROM transfer_requests tr
      JOIN students s ON tr.student_id = s.student_id
      JOIN people stu_p ON s.person_id = stu_p.person_id
      LEFT JOIN departments d ON s.department_id = d.department_id
      LEFT JOIN academic_stages ast ON s.academic_stage_id = ast.academic_stage_id
      LEFT JOIN families ff ON tr.from_family_id = ff.family_id
      JOIN families tf ON tr.to_family_id = tf.family_id
      JOIN fellowship_accounts req_acc ON tr.requested_by = req_acc.account_id
      JOIN people req_p ON req_acc.person_id = req_p.person_id
      LEFT JOIN fellowship_accounts app_acc ON tr.approved_by = app_acc.account_id
      LEFT JOIN people app_p ON app_acc.person_id = app_p.person_id
      LEFT JOIN fellowship_accounts ovr_acc ON tr.capacity_override_by = ovr_acc.account_id
      WHERE tr.transfer_id = $1`,
      [transferId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Transfer request not found.' });
    }

    const r = result.rows[0];
    res.json({
      transfer: {
        transferId: Number(r.transfer_id),
        studentId: Number(r.student_id),
        studentName: r.student_name,
        studentPhone: r.student_phone,
        studentEmail: r.student_email,
        universityStudentId: r.university_student_id,
        gender: r.gender,
        departmentName: r.department_name,
        academicStage: r.academic_stage,
        fromFamilyId: r.from_family_id ? Number(r.from_family_id) : null,
        fromFamilyName: r.from_family_name || 'Unassigned',
        fromFamilyCode: r.from_family_code,
        toFamilyId: Number(r.to_family_id),
        toFamilyName: r.to_family_name,
        toFamilyCode: r.to_family_code,
        destinationCapacity: Number(r.destination_capacity),
        destinationCurrentMembers: Number(r.destination_current_members || 0),
        status: r.status,
        reason: r.reason,
        requestedAt: r.requested_at,
        requestedByUsername: r.requested_by_username,
        requestedByName: r.requested_by_name,
        decidedAt: r.decided_at,
        decisionNote: r.decision_note,
        approvedByUsername: r.approved_by_username,
        approvedByName: r.approved_by_name,
        isCapacityOverride: r.is_capacity_override,
        capacityOverrideReason: r.capacity_override_reason,
        capacityOverrideByUsername: r.capacity_override_by_username,
        capacityOverrideAt: r.capacity_override_at,
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function createTransferRequest(req: Request, res: Response, next: NextFunction) {
  try {
    const data = requestTransferSchema.parse(req.body);
    const requestedBy = req.user!.accountId;

    // Call database function fn_request_student_transfer
    const result = await query(
      `SELECT fn_request_student_transfer($1, $2, $3, $4) as transfer_id`,
      [data.studentId, data.toFamilyId, requestedBy, data.reason.trim()]
    );

    const transferId = Number(result.rows[0].transfer_id);

    res.status(201).json({
      message: 'Transfer request submitted successfully.',
      transferId,
    });
  } catch (err) {
    next(err);
  }
}

export async function approveTransfer(req: Request, res: Response, next: NextFunction) {
  try {
    const transferId = parseInt(req.params.id, 10);
    if (isNaN(transferId)) {
      return res.status(400).json({ error: 'Invalid transfer ID.' });
    }

    const data = approveTransferSchema.parse(req.body);
    const adminAccountId = req.user!.accountId;

    // Call stored procedure fn_approve_transfer_request
    await query(
      `SELECT fn_approve_transfer_request($1, $2, $3, $4, $5)`,
      [
        transferId,
        adminAccountId,
        data.decisionNote?.trim() || null,
        data.allowCapacityOverride,
        data.overrideReason?.trim() || null,
      ]
    );

    res.json({
      message: data.allowCapacityOverride
        ? 'Transfer request approved with authorized capacity override.'
        : 'Transfer request approved successfully.',
    });
  } catch (err) {
    next(err);
  }
}

export async function rejectTransfer(req: Request, res: Response, next: NextFunction) {
  try {
    const transferId = parseInt(req.params.id, 10);
    if (isNaN(transferId)) {
      return res.status(400).json({ error: 'Invalid transfer ID.' });
    }

    const data = rejectTransferSchema.parse(req.body);
    const adminAccountId = req.user!.accountId;

    // Call stored procedure fn_reject_transfer_request
    await query(
      `SELECT fn_reject_transfer_request($1, $2, $3)`,
      [transferId, adminAccountId, data.decisionNote.trim()]
    );

    res.json({ message: 'Transfer request rejected successfully.' });
  } catch (err) {
    next(err);
  }
}
