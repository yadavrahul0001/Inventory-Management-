import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import api from '../services/api';
import { User, AuthResponse, APIResponse } from '../types';
import toast from 'react-hot-toast';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string, role?: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('token'));
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Validate session and hydrate user profile on initial mount
  useEffect(() => {
    const initializeAuth = async () => {
      const storedToken = localStorage.getItem('token');
      if (!storedToken) {
        setIsLoading(false);
        return;
      }

      try {
        const response = await api.get<APIResponse<User>>('/auth/me');
        if (response.data.success && response.data.data) {
          setUser(response.data.data);
          setToken(storedToken);
        } else {
          logout();
        }
      } catch (error) {
        console.error('Session validation failed:', error);
        logout();
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, []);

  const login = async (email: string, password: string): Promise<void> => {
    try {
      const response = await api.post<APIResponse<AuthResponse>>('/auth/login', {
        email,
        password,
      });

      if (response.data.success && response.data.data) {
        const { user: userData, token: jwtToken } = response.data.data;
        setUser(userData);
        setToken(jwtToken);
        localStorage.setItem('token', jwtToken);
        localStorage.setItem('user', JSON.stringify(userData));
        toast.success(`Welcome back, ${userData.name}!`);
      }
    } catch (error: any) {
      toast.error(error.message || 'Login failed. Please check your credentials.');
      throw error;
    }
  };

  const register = async (
    name: string,
    email: string,
    password: string,
    role = 'staff'
  ): Promise<void> => {
    try {
      const response = await api.post<APIResponse<AuthResponse>>('/auth/register', {
        name,
        email,
        password,
        role,
      });

      if (response.data.success && response.data.data) {
        const { user: userData, token: jwtToken } = response.data.data;
        setUser(userData);
        setToken(jwtToken);
        localStorage.setItem('token', jwtToken);
        localStorage.setItem('user', JSON.stringify(userData));
        toast.success('Registration successful! Welcome to Inventory AI.');
      }
    } catch (error: any) {
      toast.error(error.message || 'Registration failed.');
      throw error;
    }
  };

  const logout = (): void => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    setToken(null);
    toast.success('You have been logged out.');
  };

  const refreshUser = async (): Promise<void> => {
    try {
      const response = await api.get<APIResponse<User>>('/auth/me');
      if (response.data.success && response.data.data) {
        setUser(response.data.data);
        localStorage.setItem('user', JSON.stringify(response.data.data));
      }
    } catch (error) {
      console.error('Failed to refresh user profile:', error);
    }
  };

  const value: AuthContextType = {
    user,
    token,
    isAuthenticated: !!token && !!user,
    isLoading,
    login,
    register,
    logout,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
