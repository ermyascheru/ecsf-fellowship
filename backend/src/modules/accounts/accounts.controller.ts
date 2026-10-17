import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { query } from '../../config/db.js';

const createAccountSchema = z.object({
  personId: z.number().int().positive('Person ID is required'),
  username: z.string().min(3, 'Username must be at least 3 characters'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  role: z.enum(['ADMIN', 'FELLOWSHIP_LEADER']),
});

const updateStatusSchema = z.object({
  isActive: z.boolean(),
});

const assignFamilyAccessSchema = z.object({
  familyId: z.number().int().positive('Family ID is required'),
});

export async function getAccounts(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await query(`
      SELECT
        fa.account_id,
        fa.person_id,
        fa.username,
        fa.role,
        fa.is_active,
        fa.created_at,
        fa.last_login_at,
        p.full_name,
        p.phone,
        p.email,
        (
          SELECT JSON_AGG(json_build_object(
            'family_id', f.family_id,
            'family_name', f.family_name,
            'family_code', f.family_code
          ))
          FROM fellowship_leader_family_access flfa
          JOIN families f ON flfa.family_id = f.family_id
          WHERE flfa.account_id = fa.account_id
        ) as assigned_families
      FROM fellowship_accounts fa
      JOIN people p ON fa.person_id = p.person_id
      ORDER BY fa.created_at DESC
    `);

    res.json({
      accounts: result.rows.map((a) => ({
        accountId: Number(a.account_id),
        personId: Number(a.person_id),
        username: a.username,
        role: a.role,
        isActive: a.is_active,
        fullName: a.full_name,
        phone: a.phone,
        email: a.email,
        assignedFamilies: a.assigned_families || [],
        createdAt: a.created_at,
        lastLoginAt: a.last_login_at,
      })),
    });
  } catch (err) {
    next(err);
  }
}

export async function createAccount(req: Request, res: Response, next: NextFunction) {
  try {
    const data = createAccountSchema.parse(req.body);

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(data.password, salt);

    const result = await query(
      `INSERT INTO fellowship_accounts (person_id, username, password_hash, role)
       VALUES ($1, $2, $3, $4)
       RETURNING account_id, person_id, username, role, is_active, created_at`,
      [data.personId, data.username.trim(), passwordHash, data.role]
    );

    res.status(201).json({
      message: 'Fellowship account created successfully.',
      account: result.rows[0],
    });
  } catch (err) {
    next(err);
  }
}

export async function updateAccountStatus(req: Request, res: Response, next: NextFunction) {
  try {
    const accountId = parseInt(req.params.id, 10);
    if (isNaN(accountId)) {
      return res.status(400).json({ error: 'Invalid account ID.' });
    }

    if (accountId === req.user!.accountId) {
      return res.status(400).json({ error: 'You cannot deactivate your own administrative account.' });
    }

    const { isActive } = updateStatusSchema.parse(req.body);

    const result = await query(
      `UPDATE fellowship_accounts
       SET is_active = $1
       WHERE account_id = $2
       RETURNING account_id, username, is_active`,
      [isActive, accountId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Account not found.' });
    }

    res.json({
      message: `Account status updated to ${isActive ? 'Active' : 'Deactivated'}.`,
      account: result.rows[0],
    });
  } catch (err) {
    next(err);
  }
}

export async function assignFamilyAccess(req: Request, res: Response, next: NextFunction) {
  try {
    const accountId = parseInt(req.params.id, 10);
    if (isNaN(accountId)) {
      return res.status(400).json({ error: 'Invalid account ID.' });
    }

    const { familyId } = assignFamilyAccessSchema.parse(req.body);
    const grantedBy = req.user!.accountId;

    await query(
      `INSERT INTO fellowship_leader_family_access (account_id, family_id, granted_by)
       VALUES ($1, $2, $3)
       ON CONFLICT (account_id, family_id) DO NOTHING`,
      [accountId, familyId, grantedBy]
    );

    res.status(201).json({ message: 'Family access assigned to fellowship leader.' });
  } catch (err) {
    next(err);
  }
}

export async function removeFamilyAccess(req: Request, res: Response, next: NextFunction) {
  try {
    const accountId = parseInt(req.params.id, 10);
    const familyId = parseInt(req.params.familyId, 10);

    await query(
      `DELETE FROM fellowship_leader_family_access
       WHERE account_id = $1 AND family_id = $2`,
      [accountId, familyId]
    );

    res.json({ message: 'Family access revoked.' });
  } catch (err) {
    next(err);
  }
}
