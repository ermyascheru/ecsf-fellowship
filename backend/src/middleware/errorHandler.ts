import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';

export function errorHandler(
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) {
  console.error('Unhandled API Error:', {
    method: req.method,
    url: req.originalUrl,
    message: err.message,
    code: err.code,
    detail: err.detail,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
  });

  // Zod request schema validation error
  if (err instanceof ZodError) {
    return res.status(400).json({
      error: 'Validation failed',
      details: err.errors.map((e) => ({
        field: e.path.join('.'),
        message: e.message,
      })),
    });
  }

  // PostgreSQL Unique Constraint Violation
  if (err.code === '23505') {
    let message = 'A record with these unique details already exists.';
    if (err.constraint === 'uq_people_email_lower') {
      message = 'This email address is already in use by another person.';
    } else if (err.constraint === 'uq_students_university_id_upper') {
      message = 'This university student ID is already assigned to another student.';
    } else if (err.constraint === 'uq_fellowship_accounts_username_lower') {
      message = 'This username is already taken.';
    } else if (err.constraint === 'uq_families_code') {
      message = 'This family code is already in use.';
    } else if (err.constraint === 'uq_families_name') {
      message = 'This family name already exists.';
    } else if (err.constraint === 'uq_person_active_member') {
      message = 'This person already has an active ordinary MEMBER assignment in another family.';
    } else if (err.constraint === 'uq_person_active_role_per_family') {
      message = 'This person already holds this active role in this family.';
    } else if (err.constraint === 'uq_student_single_pending_transfer') {
      message = 'This student already has an active pending transfer request.';
    }

    return res.status(409).json({ error: message, detail: err.detail });
  }

  // PostgreSQL Foreign Key Violation
  if (err.code === '23503') {
    return res.status(400).json({
      error: 'Referenced entity does not exist or cannot be deleted due to existing records.',
      detail: err.detail,
    });
  }

  // PostgreSQL Check Constraint Violation
  if (err.code === '23514') {
    let message = 'Constraint validation failed on input values.';
    if (err.constraint === 'chk_family_capacity_non_negative') {
      message = 'Family capacity cannot be negative.';
    } else if (err.constraint === 'chk_transfers_different_families') {
      message = 'Source and destination families cannot be the same.';
    } else if (err.constraint === 'chk_transfers_override_fields') {
      message = 'Capacity override requires an explicit reason and authorizer.';
    }

    return res.status(400).json({ error: message, detail: err.detail });
  }

  // Custom User/Business Exceptions from PL/pgSQL
  if (err.code === 'P0001') {
    return res.status(400).json({
      error: err.message || 'Operation rejected by business rules.',
    });
  }

  // Default fallback
  res.status(err.status || 500).json({
    error: err.message || 'An internal server error occurred.',
  });
}
