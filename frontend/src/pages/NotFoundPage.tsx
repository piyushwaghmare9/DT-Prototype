import React from 'react';
import { Link } from 'react-router-dom';
import { Home, ArrowLeft } from 'lucide-react';

export default function NotFoundPage() {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--cx-bg)',
        padding: '2rem',
        textAlign: 'center',
      }}
    >
      <div className="card" style={{ maxWidth: 480, padding: '3rem 2rem', borderRadius: 'var(--cx-radius-xl)', boxShadow: 'var(--cx-shadow-lg)' }}>
        <div style={{ fontSize: '4.5rem', fontWeight: 800, color: 'var(--cx-primary)', lineHeight: 1, marginBottom: '1rem' }}>
          404
        </div>
        <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>🗺️</div>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.5rem', color: 'var(--cx-text)' }}>
          Off Campus Bounds
        </h2>
        <p style={{ color: 'var(--cx-text-secondary)', fontSize: '0.9375rem', lineHeight: 1.5, marginBottom: '2rem' }}>
          Looks like this page got lost between lectures or doesn't exist on CampusX yet.
        </p>

        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
          <Link to="/dashboard" className="btn btn-primary">
            <Home size={16} /> Return to Dashboard
          </Link>
          <Link to="/" className="btn btn-secondary">
            Go Home
          </Link>
        </div>
      </div>
    </div>
  );
}
