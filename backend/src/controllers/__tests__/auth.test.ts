import request from 'supertest';
import bcrypt from 'bcryptjs';
import app from '../../app';
import User from '../../models/User';
import { generateToken, verifyToken } from '../../utils/token';
import { authService } from '../../services/authService';
import { authenticate, authorize } from '../../middleware/auth';
import { AuthenticatedRequest } from '../../types';
import { registerSchema, loginSchema } from '../../validators/authValidators';

describe('Phase 3: Authentication & Authorization Test Suite', () => {
  describe('Zod Validation Schemas', () => {
    it('should validate correct registration payload', () => {
      const valid = {
        name: 'Jane Doe',
        email: 'jane@example.com',
        password: 'password123',
        role: 'manager',
      };
      const result = registerSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('should reject registration with invalid email or short password', () => {
      const invalid = {
        name: 'J',
        email: 'not-an-email',
        password: '123',
      };
      const result = registerSchema.safeParse(invalid);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors.length).toBeGreaterThanOrEqual(3);
      }
    });

    it('should validate correct login payload', () => {
      const valid = {
        email: 'jane@example.com',
        password: 'password123',
      };
      const result = loginSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('should reject login with empty password or bad email', () => {
      const invalid = {
        email: 'bad-email',
        password: '',
      };
      const result = loginSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });
  });

  describe('JWT Token Utilities', () => {
    const userPayload = {
      id: '507f1f77bcf86cd799439011',
      email: 'test@inventory.ai',
      role: 'admin' as const,
    };

    it('should generate a valid JWT token and verify it correctly', () => {
      const token = generateToken(userPayload);
      expect(typeof token).toBe('string');

      const verified = verifyToken(token);
      expect(verified.id).toBe(userPayload.id);
      expect(verified.email).toBe(userPayload.email);
      expect(verified.role).toBe(userPayload.role);
    });

    it('should throw an error when verifying an invalid token', () => {
      expect(() => verifyToken('invalid.token.here')).toThrow();
    });
  });

  describe('Authentication & Authorization Middleware', () => {
    it('should return 401 if Authorization header is missing', () => {
      const req = { headers: {} } as AuthenticatedRequest;
      const res = {} as any;
      let nextError: any;
      const next = (err?: any) => {
        nextError = err;
      };

      authenticate(req, res, next);
      expect(nextError).toBeDefined();
      expect(nextError.statusCode).toBe(401);
    });

    it('should return 401 if Authorization header is not Bearer', () => {
      const req = {
        headers: { authorization: 'Basic 12345' },
      } as unknown as AuthenticatedRequest;
      const res = {} as any;
      let nextError: any;
      const next = (err?: any) => {
        nextError = err;
      };

      authenticate(req, res, next);
      expect(nextError).toBeDefined();
      expect(nextError.statusCode).toBe(401);
    });

    it('should successfully set req.user when valid token provided', () => {
      const token = generateToken({
        id: '507f1f77bcf86cd799439011',
        email: 'user@test.com',
        role: 'manager',
      });

      const req = {
        headers: { authorization: `Bearer ${token}` },
      } as AuthenticatedRequest;
      const res = {} as any;
      let nextCalled = false;
      const next = () => {
        nextCalled = true;
      };

      authenticate(req, res, next);
      expect(nextCalled).toBe(true);
      expect(req.user).toBeDefined();
      expect(req.user?.role).toBe('manager');
    });

    it('should authorize allowed roles and forbid unallowed roles', () => {
      const reqAdmin = {
        user: { id: '1', email: 'admin@test.com', role: 'admin' },
      } as AuthenticatedRequest;
      const reqStaff = {
        user: { id: '2', email: 'staff@test.com', role: 'staff' },
      } as AuthenticatedRequest;

      const adminGuard = authorize('admin');
      let adminPassed = false;
      adminGuard(reqAdmin, {} as any, () => {
        adminPassed = true;
      });
      expect(adminPassed).toBe(true);

      let staffError: any;
      adminGuard(reqStaff, {} as any, (err?: any) => {
        staffError = err;
      });
      expect(staffError).toBeDefined();
      expect(staffError.statusCode).toBe(403);
    });
  });

  describe('Auth Service with Mocked Database Queries', () => {
    it('should throw 409 if registering with an existing email', async () => {
      jest.spyOn(User, 'findOne').mockResolvedValueOnce({
        _id: 'existing-id',
        email: 'exists@example.com',
      } as any);

      await expect(
        authService.register({
          name: 'Existing',
          email: 'exists@example.com',
          password: 'password123',
        })
      ).rejects.toThrow('A user with this email address already exists.');
    });

    it('should create user, hash password, and return user and token', async () => {
      jest.spyOn(User, 'findOne').mockResolvedValueOnce(null);
      const mockCreatedUser = {
        _id: { toString: () => '507f1f77bcf86cd799439011' },
        name: 'New User',
        email: 'new@example.com',
        role: 'staff',
        createdAt: new Date(),
      };
      jest.spyOn(User, 'create').mockResolvedValueOnce(mockCreatedUser as any);

      const result = await authService.register({
        name: 'New User',
        email: 'new@example.com',
        password: 'password123',
      });

      expect(result.user.email).toBe('new@example.com');
      expect(result.token).toBeDefined();
    });

    it('should throw 401 if login user does not exist', async () => {
      const mockQuery = {
        select: jest.fn().mockResolvedValueOnce(null),
      };
      jest.spyOn(User, 'findOne').mockReturnValueOnce(mockQuery as any);

      await expect(
        authService.login({
          email: 'notfound@example.com',
          password: 'password123',
        })
      ).rejects.toThrow('Invalid email or password.');
    });

    it('should throw 401 if login password does not match', async () => {
      const hashedPassword = await bcrypt.hash('correct_password', 10);
      const mockUser = {
        _id: { toString: () => '507f1f77bcf86cd799439011' },
        email: 'found@example.com',
        password: hashedPassword,
      };
      const mockQuery = {
        select: jest.fn().mockResolvedValueOnce(mockUser),
      };
      jest.spyOn(User, 'findOne').mockReturnValueOnce(mockQuery as any);

      await expect(
        authService.login({
          email: 'found@example.com',
          password: 'wrong_password',
        })
      ).rejects.toThrow('Invalid email or password.');
    });

    it('should login successfully with correct credentials', async () => {
      const hashedPassword = await bcrypt.hash('secret123', 10);
      const mockUser = {
        _id: { toString: () => '507f1f77bcf86cd799439011' },
        name: 'Valid User',
        email: 'valid@example.com',
        password: hashedPassword,
        role: 'manager',
        createdAt: new Date(),
      };
      const mockQuery = {
        select: jest.fn().mockResolvedValueOnce(mockUser),
      };
      jest.spyOn(User, 'findOne').mockReturnValueOnce(mockQuery as any);

      const result = await authService.login({
        email: 'valid@example.com',
        password: 'secret123',
      });

      expect(result.user.name).toBe('Valid User');
      expect(result.token).toBeDefined();
    });
  });

  describe('HTTP Endpoints Integration (Supertest)', () => {
    it('POST /api/auth/register should fail with 400 for invalid body', async () => {
      const res = await request(app).post('/api/auth/register').send({
        email: 'bad-email',
      });
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toContain('Validation error');
    });

    it('POST /api/auth/login should fail with 400 for invalid body', async () => {
      const res = await request(app).post('/api/auth/login').send({
        email: 'bad-email',
      });
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('POST /api/auth/logout should return 200 with success message', async () => {
      const res = await request(app).post('/api/auth/logout');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('Logged out successfully');
    });

    it('GET /api/auth/me should return 401 when no token is provided', async () => {
      const res = await request(app).get('/api/auth/me');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('GET /api/auth/me should return 200 and user data when valid token is provided', async () => {
      const token = generateToken({
        id: '507f1f77bcf86cd799439011',
        email: 'authme@test.com',
        role: 'admin',
      });

      jest.spyOn(User, 'findById').mockResolvedValueOnce({
        _id: { toString: () => '507f1f77bcf86cd799439011' },
        name: 'Auth Me',
        email: 'authme@test.com',
        role: 'admin',
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.email).toBe('authme@test.com');
      expect(res.body.data.role).toBe('admin');
    });
  });
});
