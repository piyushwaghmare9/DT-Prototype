import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  User as UserIcon,
  Award,
  Zap,
  BookOpen,
  Calendar,
  MessageSquare,
  Settings,
  ShieldCheck,
  Star,
  Clock,
  Sparkles,
  Loader,
} from 'lucide-react';
import api from '../services/api';
import { useAuthStore } from '../store/authStore';

export default function ProfilePage() {
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const { user: currentUser } = useAuthStore();

  const isMe = !id || id === 'me' || Boolean(currentUser && (id === currentUser.id || id === currentUser._id));

  const { data: profile, isLoading } = useQuery({
    queryKey: ['profile', id || 'me'],
    queryFn: async () => {
      if (isMe) {
        const res = await api.get('/users/me');
        return res.data;
      } else {
        const res = await api.get(`/users/${id}`);
        return res.data;
      }
    },
  });

  if (isLoading) {
    return (
      <div style={{ textAlign: 'center', padding: '5rem 1rem' }}>
        <Loader size={32} className="animate-spin" style={{ color: 'var(--cx-primary)', margin: '0 auto 1rem' }} />
        <p style={{ color: 'var(--cx-text-secondary)' }}>Loading profile...</p>
      </div>
    );
  }

  const p = profile || currentUser;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: 960, margin: '0 auto' }}>
      {/* Profile Header Card */}
      <div
        className="card"
        style={{
          padding: '2rem',
          position: 'relative',
          overflow: 'hidden',
          borderRadius: 'var(--cx-radius-xl)',
        }}
      >
        <div style={{ height: 80, margin: '-2rem -2rem 0 -2rem', background: 'linear-gradient(135deg, #6C4CF1, #71C8F7)' }} />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '1rem', marginTop: -40, position: 'relative' }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '1.25rem' }}>
            <div
              style={{
                width: 90,
                height: 90,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, var(--cx-primary), var(--cx-primary-dark))',
                color: 'white',
                border: '4px solid var(--cx-bg-card)',
                boxShadow: 'var(--cx-shadow)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '2rem',
                fontWeight: 800,
              }}
            >
              {p?.full_name?.slice(0, 2).toUpperCase() || 'U'}
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <h1 style={{ fontSize: '1.75rem', fontWeight: 800, margin: 0, color: 'var(--cx-text)' }}>
                  {p?.full_name}
                </h1>
                <span className="badge badge-success" style={{ fontSize: '0.75rem' }}>
                  <ShieldCheck size={13} style={{ marginRight: 2 }} /> Verified Student
                </span>
              </div>
              <p style={{ margin: '0.2rem 0 0', color: 'var(--cx-text-secondary)', fontSize: '0.9rem' }}>
                {p?.department || 'Engineering'} • {p?.academic_year || 'Year 2'}
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem' }}>
            {isMe ? (
              <button className="btn btn-secondary" onClick={() => navigate('/settings')}>
                <Settings size={16} /> Edit Profile & Preferences
              </button>
            ) : (
              <>
                <button className="btn btn-primary" onClick={() => navigate(`/messages?recipient=${p?.id}`)}>
                  <MessageSquare size={16} /> Send Message
                </button>
                <button className="btn btn-secondary" onClick={() => navigate('/skills')}>
                  <Zap size={16} /> Request Skill
                </button>
              </>
            )}
          </div>
        </div>

        {/* Bio */}
        {p?.bio && (
          <p style={{ marginTop: '1.5rem', color: 'var(--cx-text)', fontSize: '0.9375rem', lineHeight: 1.6, maxWidth: 700 }}>
            {p.bio}
          </p>
        )}

        {/* Badges / Stats strip */}
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginTop: '1.5rem', paddingTop: '1.25rem', borderTop: '1px solid var(--cx-border)' }}>
          <div className="badge badge-primary" style={{ padding: '0.4rem 0.75rem', fontSize: '0.8125rem' }}>
            ⚡ Level {p?.level || 1} ({p?.xp || 0} XP)
          </div>
          <div className="badge badge-warning" style={{ padding: '0.4rem 0.75rem', fontSize: '0.8125rem' }}>
            🪙 {p?.skill_credits || 10} Skill Credits
          </div>
          <div className="badge badge-success" style={{ padding: '0.4rem 0.75rem', fontSize: '0.8125rem' }}>
            🤝 {p?.completed_exchanges || 0} Exchanges Completed
          </div>
        </div>
      </div>

      {/* Grid: Skills Offered & Wanted */}
      <div className="grid-2" style={{ gap: '1.5rem' }}>
        {/* Skills Offered */}
        <div className="card" style={{ padding: '1.5rem' }}>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Zap size={18} color="var(--cx-primary)" />
            Skills Offered to Teach
          </h3>

          {!p?.skills_offered || p.skills_offered.length === 0 ? (
            <p style={{ color: 'var(--cx-text-muted)', fontSize: '0.875rem' }}>No skills listed yet.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {p.skills_offered.map((s: any, idx: number) => (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '0.75rem 1rem',
                    background: 'var(--cx-bg)',
                    borderRadius: 'var(--cx-radius)',
                    border: '1px solid var(--cx-border)',
                  }}
                >
                  <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{s.name || s}</span>
                  <span className="badge" style={{ background: 'var(--cx-primary-subtle)', color: 'var(--cx-primary)', fontSize: '0.75rem' }}>
                    {s.level || 'Intermediate'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Skills Wanted */}
        <div className="card" style={{ padding: '1.5rem' }}>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <BookOpen size={18} color="#0284C7" />
            Skills Wanted to Learn
          </h3>

          {!p?.skills_wanted || p.skills_wanted.length === 0 ? (
            <p style={{ color: 'var(--cx-text-muted)', fontSize: '0.875rem' }}>No learning wishlist specified.</p>
          ) : (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
              {p.skills_wanted.map((skill: string, idx: number) => (
                <span
                  key={idx}
                  className="badge"
                  style={{
                    padding: '0.5rem 0.85rem',
                    fontSize: '0.85rem',
                    background: '#E0F2FE',
                    color: '#0369A1',
                    borderRadius: 'var(--cx-radius-full)',
                  }}
                >
                  🎯 {skill}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Availability Schedule */}
      <div className="card" style={{ padding: '1.5rem' }}>
        <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Clock size={18} color="var(--cx-primary)" />
          Weekly Availability Schedule
        </h3>

        {!p?.availability || p.availability.length === 0 ? (
          <p style={{ color: 'var(--cx-text-muted)', fontSize: '0.875rem' }}>
            Flexible scheduling upon mutual request via messages.
          </p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.75rem' }}>
            {p.availability.map((slot: any, idx: number) => (
              <div
                key={idx}
                style={{
                  padding: '0.75rem 1rem',
                  background: 'var(--cx-bg)',
                  borderRadius: 'var(--cx-radius)',
                  border: '1px solid var(--cx-border)',
                }}
              >
                <div style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--cx-primary)' }}>{slot.day}</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--cx-text-secondary)', marginTop: '0.2rem' }}>
                  {slot.start_time} - {slot.end_time}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
