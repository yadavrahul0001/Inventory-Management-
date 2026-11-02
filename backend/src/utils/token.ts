import jwt from 'jsonwebtoken';
import config from '../config';
import { AuthenticatedUser } from '../types';

export const generateToken = (user: AuthenticatedUser): string => {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
    },
    config.jwtSecret,
    {
      expiresIn: config.jwtExpiresIn as jwt.SignOptions['expiresIn'],
    }
  );
};

export const verifyToken = (token: string): AuthenticatedUser => {
  const decoded = jwt.verify(token, config.jwtSecret) as AuthenticatedUser;
  return {
    id: decoded.id,
    email: decoded.email,
    role: decoded.role,
  };
};
