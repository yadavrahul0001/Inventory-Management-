import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { Eye, EyeOff, UserPlus } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface RegisterForm {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  role: 'admin' | 'manager' | 'staff';
}

const RegisterPage: React.FC = () => {
  const { register: authRegister } = useAuth();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = React.useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<RegisterForm>({ defaultValues: { role: 'staff' } });

  const password = watch('password');

  const onSubmit = async (data: RegisterForm) => {
    try {
      await authRegister(data.name, data.email, data.password, data.role);
      toast.success('Account created! Welcome aboard.');
      navigate('/');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Registration failed.';
      toast.error(message);
    }
  };

  return (
    <div className="p-8">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Create account</h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Fill in the details below to get started
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        {/* Name */}
        <div>
          <label htmlFor="name" className="label">Full name</label>
          <input
            id="name"
            type="text"
            autoComplete="name"
            className={`input ${errors.name ? 'border-red-500' : ''}`}
            {...register('name', { required: 'Name is required', minLength: { value: 2, message: 'Name must be at least 2 characters' } })}
          />
          {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name.message}</p>}
        </div>

        {/* Email */}
        <div>
          <label htmlFor="reg-email" className="label">Email address</label>
          <input
            id="reg-email"
            type="email"
            autoComplete="email"
            className={`input ${errors.email ? 'border-red-500' : ''}`}
            {...register('email', {
              required: 'Email is required',
              pattern: { value: /^\S+@\S+\.\S+$/, message: 'Invalid email address' },
            })}
          />
          {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email.message}</p>}
        </div>

        {/* Role */}
        <div>
          <label htmlFor="role" className="label">Role</label>
          <select id="role" className="input" {...register('role')}>
            <option value="staff">Staff</option>
            <option value="manager">Manager</option>
            <option value="admin">Admin</option>
          </select>
        </div>

        {/* Password */}
        <div>
          <label htmlFor="reg-password" className="label">Password</label>
          <div className="relative">
            <input
              id="reg-password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              className={`input pr-10 ${errors.password ? 'border-red-500' : ''}`}
              {...register('password', {
                required: 'Password is required',
                minLength: { value: 6, message: 'At least 6 characters required' },
              })}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute inset-y-0 right-3 flex items-center text-gray-400 hover:text-gray-600"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {errors.password && <p className="mt-1 text-xs text-red-500">{errors.password.message}</p>}
        </div>

        {/* Confirm password */}
        <div>
          <label htmlFor="confirm-password" className="label">Confirm password</label>
          <input
            id="confirm-password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="new-password"
            className={`input ${errors.confirmPassword ? 'border-red-500' : ''}`}
            {...register('confirmPassword', {
              required: 'Please confirm your password',
              validate: (v) => v === password || 'Passwords do not match',
            })}
          />
          {errors.confirmPassword && <p className="mt-1 text-xs text-red-500">{errors.confirmPassword.message}</p>}
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={isSubmitting}
          className="btn-primary flex w-full items-center justify-center gap-2 !mt-2"
        >
          {isSubmitting ? (
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
          ) : (
            <UserPlus className="h-4 w-4" />
          )}
          {isSubmitting ? 'Creating account…' : 'Create account'}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-gray-500 dark:text-gray-400">
        Already have an account?{' '}
        <Link to="/login" className="font-medium text-primary-600 hover:text-primary-700 dark:text-primary-400">
          Sign in
        </Link>
      </p>
    </div>
  );
};

export default RegisterPage;
