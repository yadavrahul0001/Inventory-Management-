import { Request, Response, NextFunction } from 'express';
import { APIResponse } from '../types';

export class AppError extends Error {
  public statusCode: number;
  public isOperational: boolean;

  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

export const errorHandler = (
  err: Error | AppError,
  _req: Request,
  res: Response<APIResponse>,
  _next: NextFunction
): void => {
  if (process.env.NODE_ENV !== 'test' || !(err instanceof AppError)) {
    console.error('Error:', err);
  }

  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      error: err.message,
    });
    return;
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    res.status(400).json({
      success: false,
      error: err.message,
    });
    return;
  }

  // Mongoose duplicate key error
  if (err.name === 'MongoServerError' && (err as unknown as Record<string, unknown>).code === 11000) {
    res.status(409).json({
      success: false,
      error: 'Duplicate field value. This record already exists.',
    });
    return;
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    res.status(401).json({
      success: false,
      error: 'Invalid token.',
    });
    return;
  }

  if (err.name === 'TokenExpiredError') {
    res.status(401).json({
      success: false,
      error: 'Token has expired.',
    });
    return;
  }

  // Default error
  res.status(500).json({
    success: false,
    error: 'Internal server error.',
  });
};
