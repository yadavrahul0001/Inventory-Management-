import bcrypt from 'bcryptjs';
import User from '../models/User';
import { RegisterInput, LoginInput } from '../validators/authValidators';
import { generateToken } from '../utils/token';
import { AppError } from '../middleware/errorHandler';

export interface UserResponse {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'manager' | 'staff';
  createdAt: Date;
  updatedAt?: Date;
}

export interface AuthResult {
  user: UserResponse;
  token: string;
}

export class AuthService {
  async register(input: RegisterInput): Promise<AuthResult> {
    const existingUser = await User.findOne({ email: input.email });
    if (existingUser) {
      throw new AppError('A user with this email address already exists.', 409);
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(input.password, salt);

    const user = await User.create({
      name: input.name,
      email: input.email,
      password: hashedPassword,
      role: input.role || 'staff',
    });

    const userResponse: UserResponse = {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt,
    };

    const token = generateToken({
      id: userResponse.id,
      email: userResponse.email,
      role: userResponse.role,
    });

    return { user: userResponse, token };
  }

  async login(input: LoginInput): Promise<AuthResult> {
    const user = await User.findOne({ email: input.email }).select('+password');
    if (!user) {
      throw new AppError('Invalid email or password.', 401);
    }

    const isMatch = await bcrypt.compare(input.password, user.password);
    if (!isMatch) {
      throw new AppError('Invalid email or password.', 401);
    }

    const userResponse: UserResponse = {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt,
    };

    const token = generateToken({
      id: userResponse.id,
      email: userResponse.email,
      role: userResponse.role,
    });

    return { user: userResponse, token };
  }

  async getCurrentUser(userId: string): Promise<UserResponse> {
    const user = await User.findById(userId);
    if (!user) {
      throw new AppError('User profile not found.', 404);
    }

    return {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}

export const authService = new AuthService();
