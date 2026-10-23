import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Trophy,
  Award,
  Zap,
  Sparkles,
  TrendingUp,
  CheckCircle2,
  Clock,
  Coins,
  Shield,
  Star,
  ChevronRight,
  Flame,
  Loader,
} from 'lucide-react';
import api from '../services/api';
import { useAuthStore } from '../store/authStore';

export default function QuestsPage() {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'quests' | 'badges' | 'leaderboard' | 'wallet'>('quests');

  // Load User Rewards Data
  const { data: rewards, isLoading: loadingRewards } = useQuery({
    queryKey: ['rewards-me'],
    queryFn: async () => {
      const res = await api.get('/rewards/me');
      return res.data;
    },
  });

  // Load Leaderboard
  const { data: leaderboardData, isLoading: loadingLeaderboard } = useQuery({
    queryKey: ['rewards-leaderboard'],
    queryFn: async () => {
      const res = await api.get('/rewards/leaderboard');
      return res.data?.leaderboard || [];
    },
  });

  const xp = rewards?.xp ?? user?.xp ?? 0;
  const level = rewards?.level ?? user?.level ?? 1;
  const xpInLevel = rewards?.xp_in_level ?? (xp % 100);
  const xpToNext = rewards?.xp_to_next ?? (100 - xpInLevel);
  const skillCredits = rewards?.skill_credits ?? user?.skill_credits ?? 10;
  const quests = rewards?.quests || [];
  const badges = rewards?.badges || [];
  const transactions = rewards?.transactions || [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Top Banner: Level & XP Stats Card */}
      <div
        className="card"
        style={{
          background: 'linear-gradient(135deg, #1A1235 0%, #2D1B69 50%, #4F35C8 100%)',
          color: '#FFFFFF',
          padding: '2rem',
          position: 'relative',
          overflow: 'hidden',
          borderRadius: 'var(--cx-radius-xl)',
          boxShadow: 'var(--cx-shadow-lg)',
        }}
      >
        <div style={{ position: 'relative', zIndex: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1.5rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '0.5rem' }}>
              <span className="badge" style={{ background: 'rgba(255, 255, 255, 0.15)', color: '#FFFFFF', backdropFilter: 'blur(10px)' }}>
                Level {level} Adventurer
              </span>
              <span className="badge" style={{ background: '#FFD76A', color: '#78350F', fontWeight: 800 }}>
                <Flame size={14} style={{ marginRight: 2 }} /> Campus Contributor
              </span>
            </div>

            <h1 style={{ fontSize: '2rem', fontWeight: 800, margin: '0.25rem 0', color: '#FFFFFF' }}>
              {user?.full_name}'s Quest Log
            </h1>
            <p style={{ color: 'rgba(255, 255, 255, 0.75)', margin: 0, fontSize: '0.9375rem', maxWidth: 480 }}>
              Earn XP by teaching peers, lending lab resources, and completing campus quests.
            </p>

            {/* XP Bar */}
            <div style={{ marginTop: '1.5rem', maxWidth: 450 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem', marginBottom: '0.4rem', color: 'rgba(255, 255, 255, 0.9)' }}>
                <span><b>{xpInLevel}</b> / 100 XP in Level {level}</span>
                <span><b>{xpToNext} XP</b> to Level {level + 1}</span>
              </div>
              <div style={{ height: 10, background: 'rgba(255, 255, 255, 0.2)', borderRadius: 9999, overflow: 'hidden' }}>
                <div
                  style={{
                    height: '100%',
                    width: `${Math.min(100, xpInLevel)}%`,
                    background: 'linear-gradient(90deg, #C7F36B, #6DFCC4)',
                    borderRadius: 9999,
                    transition: 'width 0.6s ease',
                  }}
                />
              </div>
            </div>
          </div>

          {/* Quick Stats Pill */}
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            <div
              style={{
                background: 'rgba(255, 255, 255, 0.1)',
                backdropFilter: 'blur(12px)',
                borderRadius: 'var(--cx-radius-lg)',
                padding: '1.25rem 1.5rem',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                textAlign: 'center',
                minWidth: 120,
              }}
            >
              <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#C7F36B' }}>{xp}</div>
              <div style={{ fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.7)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total XP</div>
            </div>

            <div
              style={{
                background: 'rgba(255, 255, 255, 0.1)',
                backdropFilter: 'blur(12px)',
                borderRadius: 'var(--cx-radius-lg)',
                padding: '1.25rem 1.5rem',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                textAlign: 'center',
                minWidth: 120,
              }}
            >
              <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#FFD76A' }}>{skillCredits}</div>
              <div style={{ fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.7)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Skill Credits</div>
            </div>
          </div>
        </div>

        {/* Decorative background glow circle */}
        <div
          style={{
            position: 'absolute',
            top: -80,
            right: -80,
            width: 300,
            height: 300,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(199, 243, 107, 0.25) 0%, transparent 70%)',
            pointerEvents: 'none',
          }}
        />
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid var(--cx-border)', paddingBottom: '0.5rem' }}>
        {[
          { id: 'quests', label: 'Active Quests', icon: Trophy },
          { id: 'badges', label: 'Badges Gallery', icon: Award },
          { id: 'leaderboard', label: 'Campus Leaderboard', icon: TrendingUp },
          { id: 'wallet', label: 'Credits & Wallet', icon: Coins },
        ].map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className="btn btn-ghost"
              style={{
                color: active ? 'var(--cx-primary)' : 'var(--cx-text-secondary)',
                borderBottom: active ? '2px solid var(--cx-primary)' : '2px solid transparent',
                borderRadius: 0,
                fontWeight: active ? 700 : 500,
                padding: '0.5rem 1rem',
              }}
            >
              <Icon size={16} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab 1: Quests */}
      {activeTab === 'quests' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.25rem' }}>
          {quests.map((quest: any) => {
            const isCompleted = quest.completed;
            return (
              <div
                key={quest.key}
                className="card"
                style={{
                  padding: '1.5rem',
                  display: 'flex',
                  gap: '1rem',
                  alignItems: 'flex-start',
                  borderLeft: isCompleted ? '4px solid var(--cx-success)' : '4px solid var(--cx-primary)',
                }}
              >
                <div
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 'var(--cx-radius)',
                    background: isCompleted ? 'var(--cx-success-subtle)' : 'var(--cx-primary-subtle)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.5rem',
                    flexShrink: 0,
                  }}
                >
                  {quest.icon || '🎯'}
                </div>

                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                    <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0, color: 'var(--cx-text)' }}>
                      {quest.title}
                    </h3>
                    <span className="badge" style={{ background: '#fef3c7', color: '#92400e', fontWeight: 700, fontSize: '0.75rem' }}>
                      +{quest.xp} XP
                    </span>
                  </div>

                  <p style={{ fontSize: '0.8125rem', color: 'var(--cx-text-secondary)', margin: '0 0 0.875rem' }}>
                    {quest.description}
                  </p>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    {isCompleted ? (
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--cx-success)', fontSize: '0.8125rem', fontWeight: 700 }}>
                        <CheckCircle2 size={16} /> Completed
                      </span>
                    ) : (
                      <span style={{ fontSize: '0.75rem', color: 'var(--cx-text-muted)' }}>In progress</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Tab 2: Badges Gallery */}
      {activeTab === 'badges' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '1.25rem' }}>
          {[
            { key: 'first_exchange', title: 'First Exchange', desc: 'Completed first session', icon: '🎓', color: '#6C4CF1', unlocked: true },
            { key: 'mentor', title: 'Helpful Mentor', desc: 'Mentored 3+ students', icon: '🧑‍🏫', color: '#FF7968', unlocked: (user?.completed_exchanges || 0) >= 3 },
            { key: 'knowledge_sharer', title: 'Knowledge Sharer', desc: 'Created skill listing', icon: '💡', color: '#FFD76A', unlocked: true },
            { key: 'resource_hero', title: 'Resource Hero', desc: 'Shared lab items or books', icon: '📦', color: '#71C8F7', unlocked: false },
            { key: 'team_builder', title: 'Team Builder', desc: 'Formed a project squad', icon: '🚀', color: '#C7F36B', unlocked: false },
            { key: 'connector', title: 'Campus Connector', desc: 'Connected with 10+ peers', icon: '🕸️', color: '#8B6FF5', unlocked: false },
          ].map((b) => (
            <div
              key={b.key}
              className="card"
              style={{
                padding: '1.5rem',
                textAlign: 'center',
                opacity: b.unlocked ? 1 : 0.6,
                position: 'relative',
              }}
            >
              <div
                style={{
                  width: 64,
                  height: 64,
                  margin: '0 auto 1rem',
                  borderRadius: '50%',
                  background: b.unlocked ? b.color : 'var(--cx-border)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '2rem',
                  boxShadow: b.unlocked ? `0 8px 20px ${b.color}40` : 'none',
                }}
              >
                {b.icon}
              </div>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: '0 0 0.25rem' }}>{b.title}</h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--cx-text-secondary)', margin: '0 0 0.75rem' }}>{b.desc}</p>
              <span
                className="badge"
                style={{
                  background: b.unlocked ? 'var(--cx-success-subtle)' : 'var(--cx-bg)',
                  color: b.unlocked ? 'var(--cx-success)' : 'var(--cx-text-muted)',
                  fontSize: '0.75rem',
                }}
              >
                {b.unlocked ? '★ Unlocked' : 'Locked'}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Tab 3: Leaderboard */}
      {activeTab === 'leaderboard' && (
        <div className="card" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0 }}>Campus Honor Roll</h3>
              <p style={{ fontSize: '0.8125rem', color: 'var(--cx-text-secondary)', margin: 0 }}>Top contributors this semester</p>
            </div>
          </div>

          {loadingLeaderboard ? (
            <div style={{ textAlign: 'center', padding: '3rem' }}>
              <Loader size={24} className="animate-spin" style={{ color: 'var(--cx-primary)', margin: '0 auto' }} />
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--cx-border)', color: 'var(--cx-text-secondary)' }}>
                    <th style={{ padding: '0.75rem' }}>Rank</th>
                    <th style={{ padding: '0.75rem' }}>Student</th>
                    <th style={{ padding: '0.75rem' }}>Department</th>
                    <th style={{ padding: '0.75rem' }}>Exchanges</th>
                    <th style={{ padding: '0.75rem', textAlign: 'right' }}>Total XP</th>
                  </tr>
                </thead>
                <tbody>
                  {(leaderboardData.length > 0
                    ? leaderboardData
                    : [
                        { rank: 1, name: user?.full_name || 'You', department: user?.department || 'CS', completed_exchanges: 4, xp: xp || 150 },
                        { rank: 2, name: 'Aarav Sharma', department: 'Computer Science', completed_exchanges: 8, xp: 480 },
                        { rank: 3, name: 'Ananya Iyer', department: 'Electronics', completed_exchanges: 6, xp: 390 },
                        { rank: 4, name: 'Rohan Mehta', department: 'Mechanical', completed_exchanges: 5, xp: 310 },
                      ]
                  ).map((entry: any, idx: number) => {
                    const isMe = entry.name === user?.full_name;
                    return (
                      <tr
                        key={idx}
                        style={{
                          borderBottom: '1px solid var(--cx-border)',
                          background: isMe ? 'var(--cx-primary-subtle)' : 'transparent',
                          fontWeight: isMe ? 700 : 500,
                        }}
                      >
                        <td style={{ padding: '0.875rem 0.75rem' }}>
                          {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${entry.rank || idx + 1}`}
                        </td>
                        <td style={{ padding: '0.875rem 0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <div className="avatar avatar-xs" style={{ background: 'var(--cx-primary)', color: 'white', fontWeight: 700 }}>
                            {entry.name?.slice(0, 2).toUpperCase() || 'S'}
                          </div>
                          <span>{entry.name} {isMe && '(You)'}</span>
                        </td>
                        <td style={{ padding: '0.875rem 0.75rem', color: 'var(--cx-text-secondary)' }}>{entry.department}</td>
                        <td style={{ padding: '0.875rem 0.75rem' }}>{entry.completed_exchanges || 0}</td>
                        <td style={{ padding: '0.875rem 0.75rem', textAlign: 'right', fontWeight: 700, color: 'var(--cx-primary)' }}>
                          {entry.xp} XP
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab 4: Wallet & Transactions */}
      {activeTab === 'wallet' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="card" style={{ padding: '1.5rem' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '0.5rem' }}>Skill Credit Ledger</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--cx-text-secondary)', marginBottom: '1.5rem' }}>
              Skill credits are non-monetary tokens used to reward teaching and resource sharing on campus.
            </p>

            {transactions.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--cx-text-secondary)' }}>
                <Coins size={36} style={{ margin: '0 auto 0.5rem', opacity: 0.5 }} />
                <p>Welcome Bonus: You have <b>{skillCredits} Skill Credits</b> ready to use!</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {transactions.map((t: any, idx: number) => (
                  <div
                    key={idx}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '0.875rem',
                      background: 'var(--cx-bg)',
                      borderRadius: 'var(--cx-radius)',
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{t.reason || 'Exchange Reward'}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--cx-text-muted)' }}>
                        {new Date(t.created_at).toLocaleDateString()}
                      </div>
                    </div>
                    <span style={{ fontWeight: 700, color: t.amount >= 0 ? 'var(--cx-success)' : 'var(--cx-error)' }}>
                      {t.amount >= 0 ? `+${t.amount}` : t.amount} Credits
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
