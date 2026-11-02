import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { Eye, EyeOff, LogIn } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface LoginForm {
  email: string;
  password: string;
}

const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: Location })?.from?.pathname ?? '/';

  const [showPassword, setShowPassword] = React.useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>();

  const fillCredentials = (email: string, pass: string) => {
    setValue('email', email, { shouldValidate: true });
    setValue('password', pass, { shouldValidate: true });
  };

  const onSubmit = async (data: LoginForm) => {
    try {
      await login(data.email, data.password);
      toast.success('Welcome back!');
      navigate(from, { replace: true });
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Login failed. Please check your credentials.';
      toast.error(message);
    }
  };

  return (
    <div className="p-8">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Sign in</h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Enter your credentials to access the dashboard
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
        {/* Email */}
        <div>
          <label htmlFor="email" className="label">
            Email address
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            className={`input ${errors.email ? 'border-red-500 focus:ring-red-500' : ''}`}
            {...register('email', {
              required: 'Email is required',
              pattern: { value: /^\S+@\S+\.\S+$/, message: 'Invalid email address' },
            })}
          />
          {errors.email && (
            <p className="mt-1 text-xs text-red-500">{errors.email.message}</p>
          )}
        </div>

        {/* Password */}
        <div>
          <label htmlFor="password" className="label">
            Password
          </label>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              className={`input pr-10 ${errors.password ? 'border-red-500 focus:ring-red-500' : ''}`}
              {...register('password', {
                required: 'Password is required',
                minLength: { value: 6, message: 'Password must be at least 6 characters' },
              })}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute inset-y-0 right-3 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {errors.password && (
            <p className="mt-1 text-xs text-red-500">{errors.password.message}</p>
          )}
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={isSubmitting}
          className="btn-primary flex w-full items-center justify-center gap-2"
        >
          {isSubmitting ? (
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
          ) : (
            <LogIn className="h-4 w-4" />
          )}
          {isSubmitting ? 'Signing in…' : 'Sign in'}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-gray-500 dark:text-gray-400">
        Don't have an account?{' '}
        <Link
          to="/register"
          className="font-medium text-primary-600 hover:text-primary-700 dark:text-primary-400"
        >
          Create one
        </Link>
      </p>

      {/* Demo credentials hint */}
      <div className="mt-5 rounded-lg border border-blue-100 bg-blue-50/70 p-3.5 dark:border-blue-900/30 dark:bg-blue-900/20">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-semibold text-blue-800 dark:text-blue-300">Quick Demo Logins</p>
          <span className="text-[11px] text-blue-500 dark:text-blue-400">Click to autofill</span>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() => fillCredentials('admin@inventory.ai', 'admin123')}
            className="rounded bg-blue-600 px-2 py-1 text-xs font-medium text-white shadow-sm hover:bg-blue-700 transition"
          >
            Admin
          </button>
          <button
            type="button"
            onClick={() => fillCredentials('manager@inventory.ai', 'manager123')}
            className="rounded bg-slate-600 px-2 py-1 text-xs font-medium text-white shadow-sm hover:bg-slate-700 transition"
          >
            Manager
          </button>
          <button
            type="button"
            onClick={() => fillCredentials('staff@inventory.ai', 'staff123')}
            className="rounded bg-slate-600 px-2 py-1 text-xs font-medium text-white shadow-sm hover:bg-slate-700 transition"
          >
            Staff
          </button>
        </div>
        <p className="mt-2 text-[11px] text-blue-600 dark:text-blue-400 text-center">
          Default password: <span className="font-mono font-semibold">admin123</span> / <span className="font-mono font-semibold">manager123</span>
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
