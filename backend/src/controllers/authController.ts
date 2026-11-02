import { Request, Response, NextFunction } from 'express';
import { authService, AuthResult, UserResponse } from '../services/authService';
import { registerSchema, loginSchema } from '../validators/authValidators';
import { AuthenticatedRequest, APIResponse } from '../types';
import { AppError } from '../middleware/errorHandler';

export class AuthController {
  async register(
    req: Request,
    res: Response<APIResponse<AuthResult>>,
    next: NextFunction
  ): Promise<void> {
    try {
      const parsedData = registerSchema.safeParse(req.body);
      if (!parsedData.success) {
        const errorMessages = parsedData.error.errors.map((e) => e.message).join(', ');
        throw new AppError(`Validation error: ${errorMessages}`, 400);
      }

      const result = await authService.register(parsedData.data);
      res.status(201).json({
        success: true,
        message: 'User registered successfully',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async login(
    req: Request,
    res: Response<APIResponse<AuthResult>>,
    next: NextFunction
  ): Promise<void> {
    try {
      const parsedData = loginSchema.safeParse(req.body);
      if (!parsedData.success) {
        const errorMessages = parsedData.error.errors.map((e) => e.message).join(', ');
        throw new AppError(`Validation error: ${errorMessages}`, 400);
      }

      const result = await authService.login(parsedData.data);
      res.status(200).json({
        success: true,
        message: 'Logged in successfully',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async logout(
    _req: Request,
    res: Response<APIResponse<null>>,
    next: NextFunction
  ): Promise<void> {
    try {
      res.status(200).json({
        success: true,
        message: 'Logged out successfully',
        data: null,
      });
    } catch (error) {
      next(error);
    }
  }

  async getMe(
    req: AuthenticatedRequest,
    res: Response<APIResponse<UserResponse>>,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.user?.id) {
        throw new AppError('Authentication required.', 401);
      }

      const user = await authService.getCurrentUser(req.user.id);
      res.status(200).json({
        success: true,
        data: user,
      });
    } catch (error) {
      next(error);
    }
  }
}

export const authController = new AuthController();
