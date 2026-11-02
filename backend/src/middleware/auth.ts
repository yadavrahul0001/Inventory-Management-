import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types';
import { verifyToken } from '../utils/token';
import { AppError } from './errorHandler';

export const authenticate = (
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
): void => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError('Authentication required. Please provide a valid Bearer token.', 401);
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      throw new AppError('Authentication token missing.', 401);
    }

    const user = verifyToken(token);
    req.user = user;
    next();
  } catch (error) {
    if (error instanceof AppError) {
      next(error);
      return;
    }
    next(new AppError('Invalid or expired authentication token.', 401));
  }
};

export const authorize = (...roles: Array<'admin' | 'manager' | 'staff'>) => {
  return (req: AuthenticatedRequest, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(new AppError('User not authenticated.', 401));
      return;
    }

    if (!roles.includes(req.user.role)) {
      next(
        new AppError(
          `Access forbidden: role '${req.user.role}' is not authorized to access this resource.`,
          403
        )
      );
      return;
    }

    next();
  };
};
