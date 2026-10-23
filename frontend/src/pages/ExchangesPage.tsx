import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeftRight,
  Zap,
  Package,
  CheckCircle,
  XCircle,
  Clock,
  Star,
  Check,
  X,
  AlertCircle,
  Calendar,
  MessageSquare,
  Loader,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuthStore } from '../store/authStore';
import { useUIStore } from '../store/uiStore';

interface ExchangeRequest {
  id: string;
  _id?: string;
  request_type: 'skill' | 'resource';
  listing_id: string;
  listing_title?: string;
  requester_id: string;
  requester_name: string;
  provider_id: string;
  provider_name: string;
  status: string;
  message?: string;
  proposed_date?: string;
  duration_days?: number;
  created_at: string;
  reviewed_by_requester?: boolean;
  reviewed_by_provider?: boolean;
}

function ReviewModal({ exchange, onClose }: { exchange: ExchangeRequest; onClose: () => void }) {
  const { addToast } = useUIStore();
  const qc = useQueryClient();
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);
  const exId = exchange.id || exchange._id || '';

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post(`/exchanges/${exId}/review`, {
        rating,
        comment,
        is_public: true,
      });
      addToast({ type: 'success', title: 'Review submitted! Thank you.' });
      qc.invalidateQueries({ queryKey: ['exchanges'] });
      onClose();
    } catch (err: any) {
      addToast({ type: 'error', title: 'Failed to submit review', message: err.response?.data?.detail });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Leave Peer Review</h3>
          <button className="btn btn-ghost btn-icon btn-sm" onClick={onClose}><X size={18} /></button>
        </div>
        <form onSubmit={submit}>
          <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '0.875rem', color: 'var(--cx-text-secondary)', marginBottom: '0.5rem' }}>
                How was your exchange experience with {exchange.listing_title || 'your peer'}?
              </div>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem' }}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.25rem' }}
                  >
                    <Star
                      size={28}
                      color={star <= rating ? '#FFD76A' : '#EAE7F3'}
                      fill={star <= rating ? '#FFD76A' : 'none'}
                    />
                  </button>
                ))}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Feedback & Comments</label>
              <textarea
                className="form-textarea"
                required
                rows={3}
                placeholder="Was the peer helpful, punctual, and respectful? Share details..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
              />
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? <Loader size={16} className="animate-spin" /> : 'Submit Review'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function ExchangesPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { addToast } = useUIStore();
  const qc = useQueryClient();
  const [roleFilter, setRoleFilter] = useState<'all' | 'provider' | 'requester'>('all');
  const [reviewExchange, setReviewExchange] = useState<ExchangeRequest | null>(null);

  const { data: exchanges, isLoading } = useQuery<ExchangeRequest[]>({
    queryKey: ['exchanges', roleFilter],
    queryFn: async () => {
      const res = await api.get('/exchanges/', {
        params: roleFilter !== 'all' ? { role: roleFilter } : {},
      });
      return res.data;
    },
  });

  // Action mutation
  const actionMutation = useMutation({
    mutationFn: async ({ id, action }: { id: string; action: string }) => {
      const res = await api.patch(`/exchanges/${id}/action`, { action });
      return res.data;
    },
    onSuccess: (_, vars) => {
      addToast({ type: 'success', title: `Action "${vars.action}" applied successfully!` });
      qc.invalidateQueries({ queryKey: ['exchanges'] });
      qc.invalidateQueries({ queryKey: ['rewards-me'] });
    },
    onError: (err: any) => {
      addToast({
        type: 'error',
        title: 'Action failed',
        message: err.response?.data?.detail || 'Could not update status',
      });
    },
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
      case 'returned':
        return <span className="badge badge-success">Completed</span>;
      case 'accepted':
      case 'approved':
      case 'handover_confirmed':
        return <span className="badge badge-primary">In Progress</span>;
      case 'pending':
        return <span className="badge badge-warning">Pending</span>;
      case 'rejected':
      case 'cancelled':
        return <span className="badge badge-error">Cancelled</span>;
      default:
        return <span className="badge badge-secondary">{status}</span>;
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '0.25rem' }}>
            <span style={{ fontSize: '1.75rem' }}>🔄</span>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }}>Exchange Center</h1>
          </div>
          <p style={{ color: 'var(--cx-text-secondary)', fontSize: '0.9375rem' }}>
            Track your ongoing skill tutoring sessions, borrowed tools, and peer feedback.
          </p>
        </div>

        {/* Filter Pills */}
        <div style={{ display: 'flex', background: 'var(--cx-bg-card)', padding: '4px', borderRadius: 'var(--cx-radius)', border: '1px solid var(--cx-border)' }}>
          {[
            { id: 'all', label: 'All Exchanges' },
            { id: 'provider', label: 'Incoming (Provider)' },
            { id: 'requester', label: 'Outgoing (Requester)' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setRoleFilter(tab.id as any)}
              className="btn btn-ghost"
              style={{
                fontSize: '0.8125rem',
                padding: '0.4rem 0.875rem',
                borderRadius: 'var(--cx-radius-sm)',
                background: roleFilter === tab.id ? 'var(--cx-primary)' : 'transparent',
                color: roleFilter === tab.id ? '#FFFFFF' : 'var(--cx-text-secondary)',
                fontWeight: roleFilter === tab.id ? 700 : 500,
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main List */}
      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '4rem 1rem' }}>
          <Loader size={32} className="animate-spin" style={{ color: 'var(--cx-primary)', margin: '0 auto 1rem' }} />
          <p style={{ color: 'var(--cx-text-secondary)' }}>Loading exchanges...</p>
        </div>
      ) : !exchanges || exchanges.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🤝</div>
          <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>No exchanges found</h3>
          <p style={{ color: 'var(--cx-text-secondary)', maxWidth: 420, margin: '0 auto 1.5rem' }}>
            Start an exchange by requesting a skill session from a peer or borrowing equipment!
          </p>
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
            <button className="btn btn-primary" onClick={() => navigate('/skills')}>
              <Zap size={16} /> Explore Skills
            </button>
            <button className="btn btn-secondary" onClick={() => navigate('/borrow')}>
              <Package size={16} /> Borrow Items
            </button>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {exchanges.map((ex) => {
            const exId = ex.id || ex._id || '';
            const isProvider = ex.provider_id === user?.id;
            const isSkill = ex.request_type === 'skill';

            return (
              <div
                key={exId}
                className="card"
                style={{
                  padding: '1.25rem 1.5rem',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '1rem',
                  borderLeft: isSkill ? '4px solid var(--cx-primary)' : '4px solid var(--cx-sky)',
                }}
              >
                {/* Left Info */}
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                  <div
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 'var(--cx-radius)',
                      background: isSkill ? 'var(--cx-primary-subtle)' : '#E0F2FE',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {isSkill ? <Zap size={22} color="var(--cx-primary)" /> : <Package size={22} color="#0284C7" />}
                  </div>

                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                      <span style={{ fontWeight: 800, fontSize: '1.05rem', color: 'var(--cx-text)' }}>
                        {ex.listing_title || (isSkill ? 'Skill Exchange' : 'Resource Borrowing')}
                      </span>
                      {getStatusBadge(ex.status)}
                    </div>

                    <div style={{ fontSize: '0.8125rem', color: 'var(--cx-text-secondary)', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                      <span>
                        <b>{isProvider ? 'Requested by' : 'Provided by'}:</b> {isProvider ? ex.requester_name : ex.provider_name}
                      </span>
                      {ex.proposed_date && (
                        <span>
                          <b>Date:</b> {new Date(ex.proposed_date).toLocaleDateString()}
                        </span>
                      )}
                      {ex.duration_days && (
                        <span>
                          <b>Duration:</b> {ex.duration_days} days
                        </span>
                      )}
                    </div>

                    {ex.message && (
                      <p style={{ margin: '0.4rem 0 0', fontSize: '0.8125rem', color: 'var(--cx-text)', fontStyle: 'italic', background: 'var(--cx-bg)', padding: '0.35rem 0.65rem', borderRadius: 6 }}>
                        "{ex.message}"
                      </p>
                    )}
                  </div>
                </div>

                {/* Right Action Buttons */}
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                  {/* Actions for Skill Provider */}
                  {isSkill && isProvider && ex.status === 'pending' && (
                    <>
                      <button
                        className="btn btn-primary btn-sm"
                        onClick={() => actionMutation.mutate({ id: exId, action: 'accept' })}
                        disabled={actionMutation.isPending}
                      >
                        <Check size={14} /> Accept Session
                      </button>
                      <button
                        className="btn btn-ghost btn-sm"
                        style={{ color: 'var(--cx-error)' }}
                        onClick={() => actionMutation.mutate({ id: exId, action: 'reject' })}
                        disabled={actionMutation.isPending}
                      >
                        <X size={14} /> Decline
                      </button>
                    </>
                  )}

                  {/* Complete Skill Session */}
                  {isSkill && ex.status === 'accepted' && (
                    <button
                      className="btn btn-primary btn-sm"
                      style={{ background: 'var(--cx-success)', borderColor: 'var(--cx-success)' }}
                      onClick={() => actionMutation.mutate({ id: exId, action: 'complete' })}
                      disabled={actionMutation.isPending}
                    >
                      <CheckCircle size={14} /> Mark Session Complete (+XP)
                    </button>
                  )}

                  {/* Actions for Resource Provider */}
                  {!isSkill && isProvider && ex.status === 'pending' && (
                    <>
                      <button
                        className="btn btn-primary btn-sm"
                        onClick={() => actionMutation.mutate({ id: exId, action: 'approve' })}
                        disabled={actionMutation.isPending}
                      >
                        <Check size={14} /> Approve Loan
                      </button>
                      <button
                        className="btn btn-ghost btn-sm"
                        style={{ color: 'var(--cx-error)' }}
                        onClick={() => actionMutation.mutate({ id: exId, action: 'reject' })}
                        disabled={actionMutation.isPending}
                      >
                        <X size={14} /> Decline
                      </button>
                    </>
                  )}

                  {/* Confirm Handover */}
                  {!isSkill && isProvider && ex.status === 'approved' && (
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={() => actionMutation.mutate({ id: exId, action: 'handover' })}
                      disabled={actionMutation.isPending}
                    >
                      Confirm Item Handed Over
                    </button>
                  )}

                  {/* Return item */}
                  {!isSkill && !isProvider && ex.status === 'handover_confirmed' && (
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => actionMutation.mutate({ id: exId, action: 'return' })}
                      disabled={actionMutation.isPending}
                    >
                      I Have Returned The Item
                    </button>
                  )}

                  {/* Owner confirms item returned */}
                  {!isSkill && isProvider && (ex.status === 'return_pending' || ex.status === 'handover_confirmed') && (
                    <button
                      className="btn btn-primary btn-sm"
                      style={{ background: 'var(--cx-success)', borderColor: 'var(--cx-success)' }}
                      onClick={() => actionMutation.mutate({ id: exId, action: 'returned' })}
                      disabled={actionMutation.isPending}
                    >
                      <CheckCircle size={14} /> Confirm Item Received (+XP)
                    </button>
                  )}

                  {/* Review Button */}
                  {(ex.status === 'completed' || ex.status === 'returned') && (
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => setReviewExchange(ex)}
                    >
                      <Star size={14} color="#F59E0B" /> Leave Review
                    </button>
                  )}

                  {/* Quick Chat Link */}
                  <button
                    className="btn btn-ghost btn-icon btn-sm"
                    title="Open Chat"
                    onClick={() => navigate('/messages')}
                  >
                    <MessageSquare size={16} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {reviewExchange && <ReviewModal exchange={reviewExchange} onClose={() => setReviewExchange(null)} />}
    </div>
  );
}
