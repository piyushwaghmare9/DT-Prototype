import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Zap, Package, Users, Layers, Plus, ArrowRight, BookOpen, Trophy, Clock, Star } from 'lucide-react';
import api from '../services/api';
import { useAuthStore } from '../store/authStore';

function QuickAction({ icon, label, to, color, bg }: any) {
  return (
    <Link to={to} style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem',
      padding: '1.25rem 0.75rem',
      background: 'var(--cx-bg-card)',
      border: '1px solid var(--cx-border)',
      borderRadius: 'var(--cx-radius-lg)',
      textDecoration: 'none',
      transition: 'all 0.2s',
      cursor: 'pointer',
    }}
      onMouseOver={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'; (e.currentTarget as HTMLElement).style.boxShadow = 'var(--cx-shadow)'; }}
      onMouseOut={e => { (e.currentTarget as HTMLElement).style.transform = ''; (e.currentTarget as HTMLElement).style.boxShadow = ''; }}
    >
      <div style={{ width: 48, height: 48, background: bg, borderRadius: 'var(--cx-radius)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {icon}
      </div>
      <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--cx-text)', textAlign: 'center' }}>{label}</span>
    </Link>
  );
}

function SkeletonCard() {
  return (
    <div className="card" style={{ padding: '1.25rem' }}>
      <div className="skeleton" style={{ height: 16, width: '60%', marginBottom: '0.75rem' }} />
      <div className="skeleton" style={{ height: 12, width: '90%', marginBottom: '0.5rem' }} />
      <div className="skeleton" style={{ height: 12, width: '75%' }} />
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useAuthStore();

  const { data: recommendations, isLoading: recLoading } = useQuery({
    queryKey: ['recommendations'],
    queryFn: async () => {
      const res = await api.get('/graph/recommendations');
      return res.data.recommendations;
    },
  });

  const { data: exchangeData } = useQuery({
    queryKey: ['exchanges-pending'],
    queryFn: async () => {
      const res = await api.get('/exchanges/?status=pending');
      return res.data;
    },
  });

  const { data: rewards } = useQuery({
    queryKey: ['rewards-me'],
    queryFn: async () => {
      const res = await api.get('/rewards/me');
      return res.data;
    },
  });

  const firstName = user?.full_name?.split(' ')[0] || 'Student';
  const xpInLevel = (user?.xp ?? 0) % 100;
  const xpToNext = 100 - xpInLevel;

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto' }}>
      {/* Welcome */}
      <div style={{
        background: 'linear-gradient(135deg, var(--cx-primary) 0%, var(--cx-primary-dark) 100%)',
        borderRadius: 'var(--cx-radius-xl)',
        padding: '2rem',
        color: 'white',
        marginBottom: '1.5rem',
        position: 'relative',
        overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute', top: '-30px', right: '-30px',
          width: 200, height: 200,
          background: 'rgba(255,255,255,0.06)',
          borderRadius: '50%', pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute', bottom: '-50px', right: '80px',
          width: 150, height: 150,
          background: 'rgba(199,243,107,0.08)',
          borderRadius: '50%', pointerEvents: 'none',
        }} />

        <h2 style={{ color: 'white', marginBottom: '0.25rem', fontSize: '1.625rem' }}>
          Hey, {firstName}! 👋
        </h2>
        <p style={{ color: 'rgba(255,255,255,0.75)', marginBottom: '1.25rem' }}>
          Your next opportunity could be one connection away.
        </p>

        <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
          {[
            { label: 'Level', value: user?.level ?? 1, icon: '⭐' },
            { label: 'XP', value: `${user?.xp ?? 0}`, icon: '⚡' },
            { label: 'Credits', value: user?.skill_credits ?? 0, icon: '💎' },
            { label: 'Exchanges', value: user?.completed_exchanges ?? 0, icon: '🤝' },
          ].map(({ label, value, icon }) => (
            <div key={label}>
              <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.75rem', fontWeight: 500 }}>{icon} {label}</div>
              <div style={{ color: 'white', fontWeight: 800, fontSize: '1.375rem', lineHeight: 1 }}>{value}</div>
            </div>
          ))}
        </div>

        {!user?.onboarding_completed && (
          <Link
            to="/onboarding"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
              marginTop: '1.25rem',
              background: 'var(--cx-lime)', color: '#1a3606',
              padding: '0.5rem 1rem', borderRadius: 'var(--cx-radius-full)',
              fontWeight: 700, fontSize: '0.875rem',
            }}
          >
            Complete your profile <ArrowRight size={16} />
          </Link>
        )}
      </div>

      {/* Quick Actions */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h3 style={{ marginBottom: '0.875rem', fontSize: '1.0625rem' }}>Quick Actions</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '0.75rem' }}>
          <QuickAction icon={<Zap size={22} color="var(--cx-primary)" />} label="Teach a Skill" to="/skills" color="var(--cx-primary)" bg="var(--cx-primary-subtle)" />
          <QuickAction icon={<BookOpen size={22} color="var(--cx-sky)" />} label="Find a Mentor" to="/skills" color="var(--cx-sky)" bg="#e0f4ff" />
          <QuickAction icon={<Package size={22} color="var(--cx-coral)" />} label="List a Resource" to="/borrow" color="var(--cx-coral)" bg="#fff1ef" />
          <QuickAction icon={<Users size={22} color="#166534" />} label="Start a Project" to="/dream-team" color="#22C55E" bg="var(--cx-success-subtle)" />
          <QuickAction icon={<Layers size={22} color="#0c3a52" />} label="Explore Graph" to="/skill-graph" color="var(--cx-sky)" bg="#e0f4ff" />
          <QuickAction icon={<Trophy size={22} color="#92400E" />} label="View Quests" to="/quests" color="var(--cx-yellow)" bg="var(--cx-warning-subtle)" />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '1.5rem' }}>
        {/* Left column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Recommendations */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.875rem' }}>
              <h3 style={{ fontSize: '1.0625rem' }}>Recommended for You</h3>
              <Link to="/skills" className="btn btn-ghost btn-sm" style={{ color: 'var(--cx-primary)' }}>
                View all <ArrowRight size={14} />
              </Link>
            </div>

            {recLoading ? (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.875rem' }}>
                {[1, 2, 3, 4].map((i) => <SkeletonCard key={i} />)}
              </div>
            ) : recommendations?.length === 0 ? (
              <div className="card" style={{ padding: '2rem', textAlign: 'center' }}>
                <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🔍</div>
                <p style={{ color: 'var(--cx-text-secondary)' }}>
                  Complete your profile to get personalized recommendations!
                </p>
                <Link to="/onboarding" className="btn btn-primary btn-sm" style={{ marginTop: '0.875rem' }}>
                  Set up profile
                </Link>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '0.875rem' }}>
                {recommendations?.slice(0, 4).map((rec: any) => (
                  <div key={rec.id} className="card card-clickable" style={{ padding: '1.125rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                      <div className="badge" style={{
                        background: rec.type === 'skill_listing' ? 'var(--cx-primary-subtle)' : rec.type === 'project' ? 'var(--cx-error-subtle)' : 'var(--cx-success-subtle)',
                        color: rec.type === 'skill_listing' ? 'var(--cx-primary)' : rec.type === 'project' ? 'var(--cx-error)' : 'var(--cx-success)',
                      }}>
                        {rec.type === 'skill_listing' ? '⚡ Skill' : rec.type === 'project' ? '🚀 Project' : '👤 Student'}
                      </div>
                    </div>
                    <h5 style={{ marginBottom: '0.375rem', fontSize: '0.9375rem' }}>{rec.title}</h5>
                    <p style={{ fontSize: '0.8125rem', color: 'var(--cx-text-secondary)', lineHeight: 1.5 }}>
                      {rec.reason}
                    </p>
                    <Link
                      to={rec.type === 'skill_listing' ? '/skills' : rec.type === 'project' ? '/dream-team' : `/profile/${rec.id}`}
                      className="btn btn-secondary btn-sm"
                      style={{ marginTop: '0.75rem', width: '100%' }}
                    >
                      View <ArrowRight size={14} />
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Pending Requests */}
          {exchangeData && exchangeData.length > 0 && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.875rem' }}>
                <h3 style={{ fontSize: '1.0625rem' }}>Requests Needing Attention</h3>
                <Link to="/exchanges" className="btn btn-ghost btn-sm" style={{ color: 'var(--cx-primary)' }}>
                  View all <ArrowRight size={14} />
                </Link>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                {exchangeData.slice(0, 3).map((req: any) => (
                  <div key={req.id} className="card" style={{ padding: '1rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{
                      width: 40, height: 40, background: 'var(--cx-warning-subtle)', borderRadius: 'var(--cx-radius)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    }}>
                      <Clock size={20} color="var(--cx-warning)" />
                    </div>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: '0.9375rem' }} className="truncate">{req.listing_title}</div>
                      <div style={{ fontSize: '0.8125rem', color: 'var(--cx-text-secondary)' }}>
                        From {req.requester_name} · {req.request_type}
                      </div>
                    </div>
                    <span className="badge badge-warning">Pending</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right column — Stats + Quests */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* XP Progress */}
          <div className="card" style={{ padding: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <h5>Your Progress</h5>
              <span className="badge badge-primary">Lv. {user?.level ?? 1}</span>
            </div>
            <div className="progress-bar" style={{ marginBottom: '0.5rem' }}>
              <div className="progress-fill" style={{ width: `${xpInLevel}%` }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem', color: 'var(--cx-text-muted)' }}>
              <span>{xpInLevel} XP</span>
              <span>{xpToNext} to next level</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.625rem', marginTop: '1rem' }}>
              {[
                { label: 'Badges', value: user?.badges?.length ?? 0, emoji: '🏅' },
                { label: 'Credits', value: user?.skill_credits ?? 0, emoji: '💎' },
              ].map(({ label, value, emoji }) => (
                <div key={label} style={{
                  background: 'var(--cx-bg)', borderRadius: 'var(--cx-radius)',
                  padding: '0.75rem', textAlign: 'center',
                }}>
                  <div style={{ fontSize: '1.25rem' }}>{emoji}</div>
                  <div style={{ fontWeight: 800, fontSize: '1.25rem' }}>{value}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--cx-text-secondary)' }}>{label}</div>
                </div>
              ))}
            </div>

            <Link to="/quests" className="btn btn-secondary w-full btn-sm" style={{ marginTop: '1rem' }}>
              View Quests & Rewards
            </Link>
          </div>

          {/* Active Quests */}
          <div className="card" style={{ padding: '1.25rem' }}>
            <h5 style={{ marginBottom: '0.875rem' }}>Active Quests</h5>
            {rewards?.quests?.filter((q: any) => !q.completed).slice(0, 3).map((quest: any) => (
              <div key={quest.key} style={{
                padding: '0.75rem 0',
                borderBottom: '1px solid var(--cx-border)',
                display: 'flex', alignItems: 'center', gap: '0.75rem',
              }}>
                <span style={{ fontSize: '1.25rem' }}>{quest.icon}</span>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: '0.875rem' }} className="truncate">{quest.title}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--cx-text-muted)' }}>{quest.description}</div>
                </div>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--cx-primary)', whiteSpace: 'nowrap' }}>
                  +{quest.xp} XP
                </span>
              </div>
            )) || (
              <p style={{ color: 'var(--cx-text-muted)', fontSize: '0.875rem' }}>Loading quests...</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
