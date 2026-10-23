import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ShieldAlert,
  Users,
  Zap,
  Package,
  ArrowLeftRight,
  AlertTriangle,
  CheckCircle,
  Ban,
  Search,
  Filter,
  Check,
  X,
  Loader,
} from 'lucide-react';
import api from '../services/api';
import { useUIStore } from '../store/uiStore';

export default function AdminPage() {
  const { addToast } = useUIStore();
  const qc = useQueryClient();
  const [tab, setTab] = useState<'stats' | 'users' | 'reports'>('stats');
  const [userSearch, setUserSearch] = useState('');

  // Fetch Stats
  const { data: stats, isLoading: loadingStats } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: async () => {
      const res = await api.get('/admin/stats');
      return res.data;
    },
  });

  // Fetch Users
  const { data: usersData, isLoading: loadingUsers } = useQuery({
    queryKey: ['admin-users', userSearch],
    queryFn: async () => {
      const params: any = {};
      if (userSearch) params.q = userSearch;
      const res = await api.get('/admin/users', { params });
      return res.data;
    },
    enabled: tab === 'users',
  });

  // Fetch Reports
  const { data: reportsData, isLoading: loadingReports } = useQuery({
    queryKey: ['admin-reports'],
    queryFn: async () => {
      const res = await api.get('/admin/reports');
      return res.data;
    },
    enabled: tab === 'reports',
  });

  // Suspend/Unsuspend User Mutation
  const suspendMutation = useMutation({
    mutationFn: async ({ id, suspend }: { id: string; suspend: boolean }) => {
      const res = await api.patch(`/admin/users/${id}/suspend`, { is_suspended: suspend });
      return res.data;
    },
    onSuccess: (_, vars) => {
      addToast({
        type: 'success',
        title: vars.suspend ? 'User suspended' : 'User reinstated',
      });
      qc.invalidateQueries({ queryKey: ['admin-users'] });
    },
    onError: (err: any) => {
      addToast({ type: 'error', title: 'Action failed', message: err.response?.data?.detail });
    },
  });

  // Resolve Report Mutation
  const reportMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: 'resolved' | 'dismissed' }) => {
      const res = await api.patch(`/admin/reports/${id}`, { status });
      return res.data;
    },
    onSuccess: () => {
      addToast({ type: 'success', title: 'Report updated' });
      qc.invalidateQueries({ queryKey: ['admin-reports'] });
    },
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Admin Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '0.25rem' }}>
            <span style={{ fontSize: '1.75rem' }}>🛡️</span>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }}>CampusX Admin Console</h1>
          </div>
          <p style={{ color: 'var(--cx-text-secondary)', fontSize: '0.9375rem' }}>
            Campus governance, safety moderation, and platform activity metrics.
          </p>
        </div>

        {/* Tab Controls */}
        <div style={{ display: 'flex', background: 'var(--cx-bg-card)', padding: '4px', borderRadius: 'var(--cx-radius)', border: '1px solid var(--cx-border)' }}>
          {[
            { id: 'stats', label: 'Overview Metrics' },
            { id: 'users', label: 'User Directory' },
            { id: 'reports', label: 'Safety & Reports' },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id as any)}
              className="btn btn-ghost"
              style={{
                fontSize: '0.8125rem',
                padding: '0.4rem 0.875rem',
                borderRadius: 'var(--cx-radius-sm)',
                background: tab === t.id ? 'var(--cx-primary)' : 'transparent',
                color: tab === t.id ? '#FFFFFF' : 'var(--cx-text-secondary)',
                fontWeight: tab === t.id ? 700 : 500,
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab 1: Stats Overview */}
      {tab === 'stats' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {loadingStats ? (
            <div style={{ textAlign: 'center', padding: '3rem' }}>
              <Loader size={32} className="animate-spin" style={{ color: 'var(--cx-primary)', margin: '0 auto' }} />
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '1.25rem' }}>
              <div className="card" style={{ padding: '1.5rem', borderLeft: '4px solid var(--cx-primary)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: 'var(--cx-text-secondary)', fontSize: '0.875rem', fontWeight: 600 }}>Total Students</span>
                  <Users size={20} color="var(--cx-primary)" />
                </div>
                <div style={{ fontSize: '2rem', fontWeight: 800, marginTop: '0.5rem' }}>{stats?.users?.total ?? 0}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--cx-success)', marginTop: '0.25rem' }}>
                  {stats?.users?.verified ?? 0} verified accounts
                </div>
              </div>

              <div className="card" style={{ padding: '1.5rem', borderLeft: '4px solid #84CC16' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: 'var(--cx-text-secondary)', fontSize: '0.875rem', fontWeight: 600 }}>Skill Listings</span>
                  <Zap size={20} color="#84CC16" />
                </div>
                <div style={{ fontSize: '2rem', fontWeight: 800, marginTop: '0.5rem' }}>{stats?.listings?.skills ?? 0}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--cx-text-secondary)', marginTop: '0.25rem' }}>
                  {stats?.listings?.active_skills ?? 0} currently active
                </div>
              </div>

              <div className="card" style={{ padding: '1.5rem', borderLeft: '4px solid #0EA5E9' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: 'var(--cx-text-secondary)', fontSize: '0.875rem', fontWeight: 600 }}>Shared Items</span>
                  <Package size={20} color="#0EA5E9" />
                </div>
                <div style={{ fontSize: '2rem', fontWeight: 800, marginTop: '0.5rem' }}>{stats?.listings?.resources ?? 0}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--cx-text-secondary)', marginTop: '0.25rem' }}>
                  {stats?.listings?.available_resources ?? 0} available to loan
                </div>
              </div>

              <div className="card" style={{ padding: '1.5rem', borderLeft: '4px solid #F59E0B' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: 'var(--cx-text-secondary)', fontSize: '0.875rem', fontWeight: 600 }}>Total Exchanges</span>
                  <ArrowLeftRight size={20} color="#F59E0B" />
                </div>
                <div style={{ fontSize: '2rem', fontWeight: 800, marginTop: '0.5rem' }}>{stats?.exchanges?.total ?? 0}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--cx-success)', marginTop: '0.25rem' }}>
                  {stats?.exchanges?.completed ?? 0} completed successfully
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Users Management */}
      {tab === 'users' && (
        <div className="card" style={{ padding: '1.5rem' }}>
          <div style={{ marginBottom: '1.25rem', position: 'relative', maxWidth: 360 }}>
            <Search size={16} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--cx-text-muted)' }} />
            <input
              className="form-input"
              style={{ paddingLeft: '2rem', fontSize: '0.85rem' }}
              placeholder="Search user by name or email..."
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
            />
          </div>

          {loadingUsers ? (
            <div style={{ textAlign: 'center', padding: '3rem' }}>
              <Loader size={24} className="animate-spin" style={{ color: 'var(--cx-primary)', margin: '0 auto' }} />
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--cx-border)', color: 'var(--cx-text-secondary)' }}>
                    <th style={{ padding: '0.75rem' }}>Student</th>
                    <th style={{ padding: '0.75rem' }}>Email</th>
                    <th style={{ padding: '0.75rem' }}>Department</th>
                    <th style={{ padding: '0.75rem' }}>Role</th>
                    <th style={{ padding: '0.75rem' }}>Status</th>
                    <th style={{ padding: '0.75rem', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {(usersData?.items || []).map((u: any) => {
                    const uId = u.id || u._id;
                    const isSuspended = u.is_suspended;
                    return (
                      <tr key={uId} style={{ borderBottom: '1px solid var(--cx-border)' }}>
                        <td style={{ padding: '0.875rem 0.75rem', fontWeight: 600 }}>{u.full_name}</td>
                        <td style={{ padding: '0.875rem 0.75rem', color: 'var(--cx-text-secondary)' }}>{u.email}</td>
                        <td style={{ padding: '0.875rem 0.75rem' }}>{u.department}</td>
                        <td style={{ padding: '0.875rem 0.75rem' }}>
                          <span className={`badge ${u.role === 'admin' ? 'badge-primary' : 'badge-secondary'}`}>
                            {u.role}
                          </span>
                        </td>
                        <td style={{ padding: '0.875rem 0.75rem' }}>
                          {isSuspended ? (
                            <span className="badge badge-error">Suspended</span>
                          ) : (
                            <span className="badge badge-success">Active</span>
                          )}
                        </td>
                        <td style={{ padding: '0.875rem 0.75rem', textAlign: 'right' }}>
                          <button
                            className="btn btn-ghost btn-sm"
                            style={{ color: isSuspended ? 'var(--cx-success)' : 'var(--cx-error)' }}
                            onClick={() => suspendMutation.mutate({ id: uId, suspend: !isSuspended })}
                          >
                            {isSuspended ? 'Unsuspend' : 'Suspend'}
                          </button>
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

      {/* Tab 3: Reports */}
      {tab === 'reports' && (
        <div className="card" style={{ padding: '1.5rem' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem' }}>Safety & Moderation Queue</h3>
          {loadingReports ? (
            <div style={{ textAlign: 'center', padding: '3rem' }}>
              <Loader size={24} className="animate-spin" style={{ color: 'var(--cx-primary)', margin: '0 auto' }} />
            </div>
          ) : !reportsData || reportsData.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--cx-text-secondary)' }}>
              <CheckCircle size={32} color="var(--cx-success)" style={{ margin: '0 auto 0.5rem' }} />
              <p>All clear! Zero active reports in the moderation queue.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {reportsData.map((rep: any) => (
                <div
                  key={rep.id || rep._id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '1rem',
                    background: 'var(--cx-bg)',
                    borderRadius: 'var(--cx-radius)',
                    border: '1px solid var(--cx-border)',
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 700, color: 'var(--cx-error)' }}>Flag: {rep.reason}</div>
                    <div style={{ fontSize: '0.8125rem', color: 'var(--cx-text-secondary)', marginTop: '0.2rem' }}>
                      Reported Target: {rep.target_type} ({rep.target_id})
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={() => reportMutation.mutate({ id: rep.id || rep._id, status: 'resolved' })}
                    >
                      Resolve
                    </button>
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => reportMutation.mutate({ id: rep.id || rep._id, status: 'dismissed' })}
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
