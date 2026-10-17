import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { query } from '../../config/db.js';
import { ENV } from '../../config/env.js';

const loginSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(6, 'New password must be at least 6 characters'),
});

export async function login(req: Request, res: Response, next: NextFunction) {
  try {
    const { username, password } = loginSchema.parse(req.body);

    const result = await query(
      `SELECT fa.account_id, fa.person_id, fa.username, fa.password_hash,
              fa.role, fa.is_active, p.full_name, p.phone, p.email
       FROM fellowship_accounts fa
       JOIN people p ON fa.person_id = p.person_id
       WHERE LOWER(fa.username) = LOWER($1)`,
      [username.trim()]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid username or password.' });
    }

    const account = result.rows[0];

    if (!account.is_active) {
      return res.status(403).json({ error: 'Your account is deactivated. Contact an administrator.' });
    }

    const isMatch = await bcrypt.compare(password, account.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid username or password.' });
    }

    // Update last login timestamp
    await query(
      `UPDATE fellowship_accounts SET last_login_at = CURRENT_TIMESTAMP WHERE account_id = $1`,
      [account.account_id]
    );

    const token = jwt.sign(
      {
        accountId: Number(account.account_id),
        username: account.username,
        role: account.role,
      },
      ENV.JWT_SECRET,
      { expiresIn: (ENV.JWT_EXPIRES_IN || '24h') as any }
    );

    res.json({
      token,
      user: {
        accountId: Number(account.account_id),
        personId: Number(account.person_id),
        username: account.username,
        role: account.role,
        fullName: account.full_name,
        phone: account.phone,
        email: account.email,
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function getCurrentUser(req: Request, res: Response, next: NextFunction) {
  try {
    res.json({ user: req.user });
  } catch (err) {
    next(err);
  }
}

export async function changePassword(req: Request, res: Response, next: NextFunction) {
  try {
    const { currentPassword, newPassword } = changePasswordSchema.parse(req.body);
    const accountId = req.user!.accountId;

    const result = await query(
      `SELECT password_hash FROM fellowship_accounts WHERE account_id = $1`,
      [accountId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Account not found.' });
    }

    const isMatch = await bcrypt.compare(currentPassword, result.rows[0].password_hash);
    if (!isMatch) {
      return res.status(400).json({ error: 'Current password is incorrect.' });
    }

    const salt = await bcrypt.genSalt(10);
    const newHash = await bcrypt.hash(newPassword, salt);

    await query(
      `UPDATE fellowship_accounts SET password_hash = $1 WHERE account_id = $2`,
      [newHash, accountId]
    );

    res.json({ message: 'Password updated successfully.' });
  } catch (err) {
    next(err);
  }
}
