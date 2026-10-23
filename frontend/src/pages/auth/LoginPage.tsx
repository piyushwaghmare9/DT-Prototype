import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff, ArrowRight, Loader } from 'lucide-react';
import api from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import { useUIStore } from '../../store/uiStore';

const schema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(1, 'Password is required'),
});

type FormData = z.infer<typeof schema>;

export default function LoginPage() {
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const { setAuth } = useAuthStore();
  const { addToast } = useUIStore();
  const navigate = useNavigate();

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  async function onSubmit(data: FormData) {
    setLoading(true);
    try {
      const res = await api.post('/auth/login', data);
      setAuth(res.data.user, res.data.access_token);
      addToast({ type: 'success', title: `Welcome back, ${res.data.user.full_name.split(' ')[0]}!` });
      navigate(res.data.user.onboarding_completed ? '/dashboard' : '/onboarding');
    } catch (err: any) {
      const detail = err.response?.data?.detail;
      let msg = 'Check your credentials';
      if (!err.response) {
        msg = window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1'
          ? 'Backend server is unreachable. Please verify your backend API is deployed and VITE_API_BASE_URL is configured.'
          : 'Backend server is unreachable. Please ensure the backend is running on port 8000.';
      } else if (typeof detail === 'string') {
        msg = detail;
      } else if (Array.isArray(detail)) {
        msg = detail.map((d: any) => d.msg || d.message || JSON.stringify(d)).join(', ');
      } else if (detail && typeof detail === 'object') {
        msg = (detail as any).msg || (detail as any).message || JSON.stringify(detail);
      }
      addToast({ type: 'error', title: 'Login failed', message: msg });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      minHeight: '100vh', background: 'linear-gradient(135deg, var(--cx-bg) 0%, #fff 50%, #f0ecff 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem',
    }}>
      <div style={{ width: '100%', maxWidth: 440 }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <Link to="/" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.625rem' }}>
            <div className="sidebar-logo-icon" style={{ width: 40, height: 40, fontSize: '1rem' }}>CX</div>
            <span style={{ fontWeight: 800, fontSize: '1.25rem', color: 'var(--cx-text)' }}>CampusX</span>
          </Link>
        </div>

        <div className="card" style={{ padding: '2rem' }}>
          <h2 style={{ marginBottom: '0.375rem' }}>Welcome back</h2>
          <p style={{ color: 'var(--cx-text-secondary)', marginBottom: '1.75rem' }}>
            Sign in to your campus account
          </p>

          <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Email</label>
              <input
                {...register('email')}
                type="email"
                className={`form-input ${errors.email ? 'error' : ''}`}
                placeholder="your@college.edu"
                autoComplete="email"
              />
              {errors.email && <span className="form-error">{errors.email.message}</span>}
            </div>

            <div className="form-group">
              <label className="form-label">Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  {...register('password')}
                  type={showPwd ? 'text' : 'password'}
                  className={`form-input ${errors.password ? 'error' : ''}`}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  style={{ paddingRight: '3rem' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(!showPwd)}
                  style={{
                    position: 'absolute', right: '0.875rem', top: '50%', transform: 'translateY(-50%)',
                    color: 'var(--cx-text-muted)', background: 'none', border: 'none', cursor: 'pointer',
                  }}
                >
                  {showPwd ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {errors.password && <span className="form-error">{errors.password.message}</span>}
            </div>

            <button type="submit" className="btn btn-primary w-full" disabled={loading} style={{ marginTop: '0.5rem' }}>
              {loading ? <Loader size={18} style={{ animation: 'spin 1s linear infinite' }} /> : null}
              {loading ? 'Signing in...' : 'Sign In'}
              {!loading && <ArrowRight size={18} />}
            </button>
          </form>

          <div className="divider" />

          <p style={{ textAlign: 'center', color: 'var(--cx-text-secondary)', fontSize: '0.9375rem' }}>
            Don't have an account?{' '}
            <Link to="/register" style={{ color: 'var(--cx-primary)', fontWeight: 600 }}>
              Join CampusX
            </Link>
          </p>
        </div>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
