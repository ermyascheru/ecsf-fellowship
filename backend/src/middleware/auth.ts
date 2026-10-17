import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { ENV } from '../config/env.js';
import { query } from '../config/db.js';
import { AuthUser } from '../types/index.js';

export async function authenticateToken(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ')
    ? authHeader.slice(7)
    : null;

  if (!token) {
    return res.status(401).json({ error: 'Access token required. Please sign in.' });
  }

  try {
    const payload = jwt.verify(token, ENV.JWT_SECRET) as {
      accountId: number;
      username: string;
      role: string;
    };

    // Verify account still exists and is currently active
    const result = await query(
      `SELECT fa.account_id, fa.username, fa.role, fa.is_active, fa.person_id,
              p.full_name, p.phone, p.email
       FROM fellowship_accounts fa
       JOIN people p ON fa.person_id = p.person_id
       WHERE fa.account_id = $1`,
      [payload.accountId]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Account not found.' });
    }

    const row = result.rows[0];
    if (!row.is_active) {
      return res.status(403).json({ error: 'Account is deactivated. Contact administrator.' });
    }

    req.user = {
      accountId: Number(row.account_id),
      personId: Number(row.person_id),
      username: row.username,
      role: row.role,
      fullName: row.full_name,
      phone: row.phone,
      email: row.email,
    };

    next();
  } catch (err: any) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Session expired. Please sign in again.' });
    }
    return res.status(403).json({ error: 'Invalid authentication token.' });
  }
}

export function requireAdmin(
  req: Request,
  res: Response,
  next: NextFunction
) {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required.' });
  }

  if (req.user.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Forbidden: Administrator privileges required.' });
  }

  next();
}

export function requireLeaderOrAdmin(
  req: Request,
  res: Response,
  next: NextFunction
) {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required.' });
  }

  if (req.user.role !== 'ADMIN' && req.user.role !== 'FELLOWSHIP_LEADER') {
    return res.status(403).json({ error: 'Forbidden: Insufficient privileges.' });
  }

  next();
}

/**
 * Checks if a fellowship leader has scoped access to a specific family.
 * Administrators have global access and bypass this check.
 */
export async function checkFamilyScopedAccess(
  accountId: number,
  role: string,
  familyId: number
): Promise<boolean> {
  if (role === 'ADMIN') return true;

  const result = await query(
    `SELECT 1 FROM fellowship_leader_family_access
     WHERE account_id = $1 AND family_id = $2`,
    [accountId, familyId]
  );

  return result.rows.length > 0;
}
