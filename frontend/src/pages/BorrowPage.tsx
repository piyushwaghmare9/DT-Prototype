import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { Plus, Search, Filter, Package, Clock, ShieldCheck, MapPin, X, Loader, CheckCircle2 } from 'lucide-react';
import api from '../services/api';
import { useAuthStore } from '../store/authStore';
import { useUIStore } from '../store/uiStore';

const CATEGORIES = [
  'All',
  'Textbooks',
  'Calculators',
  'Lab Kits',
  'Electronics',
  'Engineering Drawing Tools',
  'Sports Equipment',
  'Cameras & Tripods',
  'Chargers & Adapters',
  'Project Components',
  'Stationery',
  'Clothing & Accessories',
  'Other',
];

const CONDITIONS = ['All', 'Like New', 'Good', 'Fair', 'Heavily Used'];

interface Resource {
  id: string;
  _id?: string;
  title: string;
  description: string;
  category: string;
  condition: string;
  max_duration_days: number;
  pickup_location: string;
  is_deposit_required: boolean;
  deposit_amount?: number;
  status: 'available' | 'borrowed' | 'unavailable';
  owner_id: string;
  owner_name: string;
  owner_avatar?: string;
  created_at: string;
}

function CreateResourceModal({ onClose }: { onClose: () => void }) {
  const { addToast } = useUIStore();
  const qc = useQueryClient();
  const [form, setForm] = useState({
    title: '',
    description: '',
    category: 'Textbooks',
    condition: 'Good',
    max_duration_days: 7,
    pickup_location: 'Campus Library',
    is_deposit_required: false,
    deposit_amount: 0,
    tags: '',
  });
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/resources/', {
        ...form,
        max_duration_days: Number(form.max_duration_days),
        deposit_amount: form.is_deposit_required ? Number(form.deposit_amount) : 0,
        tags: form.tags.split(',').map((t) => t.trim()).filter(Boolean),
      });
      addToast({ type: 'success', title: 'Resource item listed!' });
      qc.invalidateQueries({ queryKey: ['resources'] });
      onClose();
    } catch (err: any) {
      addToast({ type: 'error', title: 'Failed to list resource', message: err.response?.data?.detail });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{ width: 36, height: 36, borderRadius: 'var(--cx-radius)', background: 'var(--cx-sky)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Package size={20} color="#0c3a52" />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.15rem' }}>List an Item to Lend</h3>
              <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--cx-text-secondary)' }}>Help peers and earn Skill Credits + XP</p>
            </div>
          </div>
          <button className="btn btn-ghost btn-icon btn-sm" onClick={onClose}><X size={18} /></button>
        </div>

        <form onSubmit={submit}>
          <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxHeight: '70vh', overflowY: 'auto' }}>
            <div className="form-group">
              <label className="form-label">Item Title *</label>
              <input
                className="form-input"
                required
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="e.g. Casio fx-991EX Scientific Calculator"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Description *</label>
              <textarea
                className="form-textarea"
                required
                rows={3}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Include item condition details, editions, included accessories..."
              />
            </div>

            <div className="grid-2" style={{ gap: '0.75rem' }}>
              <div className="form-group">
                <label className="form-label">Category</label>
                <select
                  className="form-select"
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                >
                  {CATEGORIES.filter((c) => c !== 'All').map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Condition</label>
                <select
                  className="form-select"
                  value={form.condition}
                  onChange={(e) => setForm({ ...form, condition: e.target.value })}
                >
                  {CONDITIONS.filter((c) => c !== 'All').map((cond) => (
                    <option key={cond} value={cond}>{cond}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid-2" style={{ gap: '0.75rem' }}>
              <div className="form-group">
                <label className="form-label">Max Borrow Duration (Days)</label>
                <input
                  type="number"
                  min={1}
                  max={60}
                  className="form-input"
                  value={form.max_duration_days}
                  onChange={(e) => setForm({ ...form, max_duration_days: Number(e.target.value) })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Pickup Spot / Hall</label>
                <input
                  className="form-input"
                  required
                  value={form.pickup_location}
                  onChange={(e) => setForm({ ...form, pickup_location: e.target.value })}
                  placeholder="e.g. Central Library / Hostel 4"
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Tags (comma-separated)</label>
              <input
                className="form-input"
                value={form.tags}
                onChange={(e) => setForm({ ...form, tags: e.target.value })}
                placeholder="calculator, engineering, semester-exam"
              />
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? <Loader size={16} className="animate-spin" /> : 'Publish Listing'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function RequestBorrowModal({ resource, onClose }: { resource: Resource; onClose: () => void }) {
  const { addToast } = useUIStore();
  const [duration, setDuration] = useState(Math.min(7, resource.max_duration_days || 7));
  const [proposedDate, setProposedDate] = useState(new Date().toISOString().slice(0, 10));
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const resourceId = resource.id || resource._id;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/exchanges/', {
        request_type: 'resource',
        listing_id: resourceId,
        message,
        proposed_date: proposedDate,
        duration_days: Number(duration),
      });
      addToast({ type: 'success', title: 'Borrow request sent to ' + resource.owner_name + '!' });
      onClose();
    } catch (err: any) {
      addToast({ type: 'error', title: 'Request failed', message: err.response?.data?.detail || 'Unable to submit request' });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Request to Borrow</h3>
          <button className="btn btn-ghost btn-icon btn-sm" onClick={onClose}><X size={18} /></button>
        </div>
        <form onSubmit={submit}>
          <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ background: 'var(--cx-bg)', padding: '1rem', borderRadius: 'var(--cx-radius)' }}>
              <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--cx-text)' }}>{resource.title}</div>
              <div style={{ fontSize: '0.85rem', color: 'var(--cx-text-secondary)', marginTop: '0.25rem' }}>
                Offered by <b>{resource.owner_name}</b> • Pickup at {resource.pickup_location}
              </div>
            </div>

            <div className="grid-2" style={{ gap: '0.75rem' }}>
              <div className="form-group">
                <label className="form-label">Pickup Date</label>
                <input
                  type="date"
                  className="form-input"
                  required
                  value={proposedDate}
                  onChange={(e) => setProposedDate(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Duration (Days, max {resource.max_duration_days})</label>
                <input
                  type="number"
                  min={1}
                  max={resource.max_duration_days}
                  className="form-input"
                  required
                  value={duration}
                  onChange={(e) => setDuration(Number(e.target.value))}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Note for owner *</label>
              <textarea
                className="form-textarea"
                required
                rows={3}
                placeholder="Mention why you need it and when you can meet for handover..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
              />
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? <Loader size={16} className="animate-spin" /> : 'Send Borrow Request'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function BorrowPage() {
  const { user } = useAuthStore();
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedCondition, setSelectedCondition] = useState('All');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [borrowItem, setBorrowItem] = useState<Resource | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['resources', search, selectedCategory, selectedCondition],
    queryFn: async () => {
      const params: any = { status: 'available' };
      if (search) params.q = search;
      if (selectedCategory !== 'All') params.category = selectedCategory;
      if (selectedCondition !== 'All') params.condition = selectedCondition;
      const res = await api.get('/resources/', { params });
      return res.data;
    },
  });

  const resources: Resource[] = data?.items || [];

  return (
    <div>
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.75rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '0.25rem' }}>
            <span style={{ fontSize: '1.75rem' }}>📦</span>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }}>Borrow Hub</h1>
          </div>
          <p style={{ color: 'var(--cx-text-secondary)', fontSize: '0.9375rem' }}>
            Don't buy what you only need for a week. Borrow lab equipment, tools, and textbooks from fellow students.
          </p>
        </div>

        <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
          <Plus size={18} />
          List an Item
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="card" style={{ padding: '1rem 1.25rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: '1 1 260px' }}>
            <Search size={18} style={{ position: 'absolute', left: '0.875rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--cx-text-muted)' }} />
            <input
              type="text"
              className="form-input"
              style={{ paddingLeft: '2.5rem' }}
              placeholder="Search books, lab coats, calculators, cameras..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <select
              className="form-select"
              style={{ minWidth: 150 }}
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
            >
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>

            <select
              className="form-select"
              style={{ minWidth: 140 }}
              value={selectedCondition}
              onChange={(e) => setSelectedCondition(e.target.value)}
            >
              {CONDITIONS.map((cond) => (
                <option key={cond} value={cond}>{cond === 'All' ? 'All Conditions' : cond}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Quick Category Pills */}
        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem', overflowX: 'auto', paddingBottom: '0.25rem' }}>
          {CATEGORIES.slice(0, 8).map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className="badge"
              style={{
                cursor: 'pointer',
                border: selectedCategory === cat ? '1px solid var(--cx-primary)' : '1px solid var(--cx-border)',
                background: selectedCategory === cat ? 'var(--cx-primary-subtle)' : 'var(--cx-bg-card)',
                color: selectedCategory === cat ? 'var(--cx-primary)' : 'var(--cx-text-secondary)',
                fontWeight: selectedCategory === cat ? 700 : 500,
                padding: '0.35rem 0.75rem',
                whiteSpace: 'nowrap',
              }}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Item Grid */}
      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '4rem 1rem' }}>
          <Loader size={32} className="animate-spin" style={{ color: 'var(--cx-primary)', margin: '0 auto 1rem' }} />
          <p style={{ color: 'var(--cx-text-secondary)' }}>Loading borrowable resources...</p>
        </div>
      ) : resources.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📦</div>
          <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>No items found</h3>
          <p style={{ color: 'var(--cx-text-secondary)', maxWidth: 400, margin: '0 auto 1.5rem' }}>
            Be the first in your campus hall or department to share a resource and earn badges!
          </p>
          <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
            <Plus size={18} />
            Share Your First Item
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))', gap: '1.25rem' }}>
          {resources.map((res) => {
            const myId = user?.id || user?._id;
            const isOwner = Boolean(myId && res.owner_id && String(res.owner_id) === String(myId));
            return (
              <div
                key={res.id || res._id}
                className="card"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  overflow: 'hidden',
                  transition: 'transform var(--cx-transition), box-shadow var(--cx-transition)',
                }}
              >
                <div style={{ height: 6, background: 'linear-gradient(90deg, #71C8F7, #6C4CF1)' }} />
                <div style={{ padding: '1.25rem', flex: 1, display: 'flex', flexDirection: 'column' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                    <span className="badge" style={{ background: '#e0f4ff', color: '#0369a1', fontWeight: 600 }}>
                      {res.category}
                    </span>
                    <span className="badge badge-success" style={{ fontSize: '0.75rem' }}>
                      {res.condition}
                    </span>
                  </div>

                  <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.5rem', color: 'var(--cx-text)' }}>
                    {res.title}
                  </h3>

                  <p
                    style={{
                      fontSize: '0.875rem',
                      color: 'var(--cx-text-secondary)',
                      lineHeight: 1.5,
                      marginBottom: '1rem',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                      flex: 1,
                    } as any}
                  >
                    {res.description}
                  </p>

                  <div style={{ background: 'var(--cx-bg)', padding: '0.75rem', borderRadius: 'var(--cx-radius)', display: 'flex', flexDirection: 'column', gap: '0.35rem', marginBottom: '1.25rem', fontSize: '0.8125rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--cx-text-secondary)' }}>
                      <Clock size={14} />
                      <span>Max loan: <b>{res.max_duration_days} days</b></span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--cx-text-secondary)' }}>
                      <MapPin size={14} />
                      <span>Pickup: <b>{res.pickup_location || 'Campus'}</b></span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '0.75rem', borderTop: '1px solid var(--cx-border)', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <Link
                      to={`/profile/${res.owner_id}`}
                      style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none', color: 'inherit' }}
                    >
                      <div className="avatar avatar-xs" style={{ background: 'var(--cx-primary)', color: 'white', fontWeight: 700, fontSize: '0.65rem' }}>
                        {res.owner_name?.slice(0, 2).toUpperCase() || 'U'}
                      </div>
                      <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--cx-text)' }}>
                        {res.owner_name}
                      </span>
                    </Link>

                    {isOwner ? (
                      <span className="badge badge-secondary" style={{ fontSize: '0.75rem' }}>Your Item</span>
                    ) : (
                      <div style={{ display: 'flex', gap: '0.35rem' }}>
                        <Link
                          to={`/profile/${res.owner_id}`}
                          className="btn btn-secondary btn-sm"
                          style={{ textDecoration: 'none', fontSize: '0.75rem', padding: '0.3rem 0.6rem' }}
                        >
                          Profile
                        </Link>
                        <button
                          className="btn btn-primary btn-sm"
                          style={{ fontSize: '0.75rem', padding: '0.3rem 0.6rem' }}
                          onClick={() => setBorrowItem(res)}
                        >
                          Request Borrow
                        </button>
                      </div>
                    )}
                  </div>

                </div>
              </div>
            );
          })}
        </div>
      )}

      {showCreateModal && <CreateResourceModal onClose={() => setShowCreateModal(false)} />}
      {borrowItem && <RequestBorrowModal resource={borrowItem} onClose={() => setBorrowItem(null)} />}
    </div>
  );
}
