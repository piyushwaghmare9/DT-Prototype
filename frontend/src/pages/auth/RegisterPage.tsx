import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff, ArrowRight, Loader, Check } from 'lucide-react';
import api from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import { useUIStore } from '../../store/uiStore';

const DEPARTMENTS = [
  'Computer Science', 'Information Technology', 'Electronics & Communication',
  'Electrical Engineering', 'Mechanical Engineering', 'Civil Engineering',
  'Chemical Engineering', 'MBA', 'MCA', 'BCA', 'Other',
];

const YEARS = ['1st Year', '2nd Year', '3rd Year', '4th Year', '5th Year', 'Postgraduate'];

const schema = z.object({
  full_name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  email: z.string().email('Enter a valid email'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Include at least one uppercase letter')
    .regex(/[0-9]/, 'Include at least one number'),
  department: z.string().min(1, 'Select your department'),
  academic_year: z.string().min(1, 'Select your year'),
});

type FormData = z.infer<typeof schema>;

function PasswordStrength({ password }: { password: string }) {
  const checks = [
    { label: '8+ characters', ok: password.length >= 8 },
    { label: 'Uppercase letter', ok: /[A-Z]/.test(password) },
    { label: 'Number', ok: /[0-9]/.test(password) },
  ];
  return (
    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.375rem', flexWrap: 'wrap' }}>
      {checks.map(({ label, ok }) => (
        <div key={label} style={{
          display: 'flex', alignItems: 'center', gap: '0.25rem',
          fontSize: '0.75rem',
          color: ok ? 'var(--cx-success)' : 'var(--cx-text-muted)',
        }}>
          <Check size={12} strokeWidth={3} />
          {label}
        </div>
      ))}
    </div>
  );
}

export default function RegisterPage() {
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const { setAuth } = useAuthStore();
  const { addToast } = useUIStore();
  const navigate = useNavigate();

  const { register, handleSubmit, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const password = watch('password', '');

  async function onSubmit(data: FormData) {
    setLoading(true);
    try {
      const res = await api.post('/auth/register', data);
      setAuth(res.data.user, res.data.access_token);
      addToast({ type: 'success', title: 'Welcome to CampusX! 🎉', message: "Let's set up your profile." });
      navigate('/onboarding');
    } catch (err: any) {
      const detail = err.response?.data?.detail;
      let msg = 'Please try again';
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
      addToast({ type: 'error', title: 'Registration failed', message: msg });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      minHeight: '100vh', background: 'linear-gradient(135deg, var(--cx-bg) 0%, #fff 50%, #f0ecff 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem',
    }}>
      <div style={{ width: '100%', maxWidth: 480 }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <Link to="/" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.625rem' }}>
            <div className="sidebar-logo-icon" style={{ width: 40, height: 40, fontSize: '1rem' }}>CX</div>
            <span style={{ fontWeight: 800, fontSize: '1.25rem', color: 'var(--cx-text)' }}>CampusX</span>
          </Link>
        </div>

        <div className="card" style={{ padding: '2rem' }}>
          <h2 style={{ marginBottom: '0.375rem' }}>Join your campus</h2>
          <p style={{ color: 'var(--cx-text-secondary)', marginBottom: '1.75rem' }}>
            Create your CampusX account in seconds
          </p>

          <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Full Name</label>
              <input
                {...register('full_name')}
                className={`form-input ${errors.full_name ? 'error' : ''}`}
                placeholder="Your full name"
              />
              {errors.full_name && <span className="form-error">{errors.full_name.message}</span>}
            </div>

            <div className="form-group">
              <label className="form-label">College Email</label>
              <input
                {...register('email')}
                type="email"
                className={`form-input ${errors.email ? 'error' : ''}`}
                placeholder="you@college.edu"
              />
              {errors.email && <span className="form-error">{errors.email.message}</span>}
            </div>

            <div className="grid-2" style={{ gap: '0.75rem' }}>
              <div className="form-group">
                <label className="form-label">Department</label>
                <select {...register('department')} className={`form-select ${errors.department ? 'error' : ''}`}>
                  <option value="">Select...</option>
                  {DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
                {errors.department && <span className="form-error">{errors.department.message}</span>}
              </div>

              <div className="form-group">
                <label className="form-label">Year</label>
                <select {...register('academic_year')} className={`form-select ${errors.academic_year ? 'error' : ''}`}>
                  <option value="">Select...</option>
                  {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
                </select>
                {errors.academic_year && <span className="form-error">{errors.academic_year.message}</span>}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  {...register('password')}
                  type={showPwd ? 'text' : 'password'}
                  className={`form-input ${errors.password ? 'error' : ''}`}
                  placeholder="••••••••"
                  style={{ paddingRight: '3rem' }}
                />
                <button type="button" onClick={() => setShowPwd(!showPwd)} style={{
                  position: 'absolute', right: '0.875rem', top: '50%', transform: 'translateY(-50%)',
                  color: 'var(--cx-text-muted)', background: 'none', border: 'none', cursor: 'pointer',
                }}>
                  {showPwd ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {password && <PasswordStrength password={password} />}
              {errors.password && <span className="form-error">{errors.password.message}</span>}
            </div>

            <button type="submit" className="btn btn-primary w-full" disabled={loading} style={{ marginTop: '0.5rem' }}>
              {loading ? <Loader size={18} style={{ animation: 'spin 1s linear infinite' }} /> : null}
              {loading ? 'Creating account...' : 'Create Account'}
              {!loading && <ArrowRight size={18} />}
            </button>
          </form>

          <div className="divider" />

          <p style={{ textAlign: 'center', color: 'var(--cx-text-secondary)', fontSize: '0.875rem' }}>
            By joining, you agree to our community guidelines and help keep CampusX safe.
          </p>

          <p style={{ textAlign: 'center', color: 'var(--cx-text-secondary)', marginTop: '0.75rem', fontSize: '0.9375rem' }}>
            Already have an account?{' '}
            <Link to="/login" style={{ color: 'var(--cx-primary)', fontWeight: 600 }}>Sign in</Link>
          </p>
        </div>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
