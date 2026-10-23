import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Filter, Star, Clock, Zap, ChevronDown, X, Loader, User as UserIcon } from 'lucide-react';

import api from '../services/api';
import { useAuthStore } from '../store/authStore';
import { useUIStore } from '../store/uiStore';

const CATEGORIES = [
  'All', 'Programming', 'Web Development', 'Data Structures & Algorithms',
  'AI & Machine Learning', 'Design & UI/UX', 'Academic Subjects',
  'Communication & Soft Skills', 'Music & Creative Arts', 'Career Guidance', 'Other',
];

const LEVELS = ['All', 'Beginner', 'Intermediate', 'Advanced', 'Expert'];

function CreateListingModal({ onClose }: { onClose: () => void }) {
  const { addToast } = useUIStore();
  const qc = useQueryClient();
  const [form, setForm] = useState({
    title: '', description: '', category: 'Programming',
    skill_level: 'Intermediate', session_duration_minutes: 60,
    preferred_language: 'English', session_format: 'Hybrid', tags: '',
  });
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/skills/listings', {
        ...form,
        session_duration_minutes: Number(form.session_duration_minutes),
        tags: form.tags.split(',').map((t) => t.trim()).filter(Boolean),
      });
      addToast({ type: 'success', title: 'Skill listing created!' });
      qc.invalidateQueries({ queryKey: ['skills'] });
      onClose();
    } catch (err: any) {
      addToast({ type: 'error', title: 'Failed to create listing', message: err.response?.data?.detail });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Create Skill Listing</h3>
          <button className="btn btn-ghost btn-icon btn-sm" onClick={onClose}><X size={18} /></button>
        </div>
        <form onSubmit={submit}>
          <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Title *</label>
              <input className="form-input" required value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="e.g. Python for beginners" />
            </div>
            <div className="form-group">
              <label className="form-label">Description *</label>
              <textarea className="form-textarea" required rows={3}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="What will students learn? What experience level is expected?" />
            </div>
            <div className="grid-2" style={{ gap: '0.75rem' }}>
              <div className="form-group">
                <label className="form-label">Category</label>
                <select className="form-select" value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}>
                  {CATEGORIES.slice(1).map((c) => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Level</label>
                <select className="form-select" value={form.skill_level}
                  onChange={(e) => setForm({ ...form, skill_level: e.target.value })}>
                  {LEVELS.slice(1).map((l) => <option key={l}>{l}</option>)}
                </select>
              </div>
            </div>
            <div className="grid-2" style={{ gap: '0.75rem' }}>
              <div className="form-group">
                <label className="form-label">Duration (minutes)</label>
                <input type="number" className="form-input" min={15} max={240} step={15}
                  value={form.session_duration_minutes}
                  onChange={(e) => setForm({ ...form, session_duration_minutes: Number(e.target.value) })} />
              </div>
              <div className="form-group">
                <label className="form-label">Format</label>
                <select className="form-select" value={form.session_format}
                  onChange={(e) => setForm({ ...form, session_format: e.target.value })}>
                  {['Online', 'In Person', 'Hybrid'].map((f) => <option key={f}>{f}</option>)}
                </select>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Tags (comma separated)</label>
              <input className="form-input" value={form.tags}
                onChange={(e) => setForm({ ...form, tags: e.target.value })}
                placeholder="python, data science, beginner" />
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? <Loader size={16} style={{ animation: 'spin 1s linear infinite' }} /> : null}
              Create Listing
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function RequestModal({ listing, onClose }: { listing: any; onClose: () => void }) {
  const { addToast } = useUIStore();
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/exchanges/', {
        listing_id: listing.id,
        request_type: 'skill',
        message,
      });
      addToast({ type: 'success', title: 'Request sent!', message: `${listing.provider_name} will be notified.` });
      onClose();
    } catch (err: any) {
      addToast({ type: 'error', title: 'Failed to send request', message: err.response?.data?.detail });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Request Session</h3>
          <button className="btn btn-ghost btn-icon btn-sm" onClick={onClose}><X size={18} /></button>
        </div>
        <form onSubmit={submit}>
          <div className="modal-body">
            <div style={{ background: 'var(--cx-bg)', borderRadius: 'var(--cx-radius)', padding: '1rem', marginBottom: '1rem' }}>
              <div style={{ fontWeight: 700 }}>{listing.title}</div>
              <div style={{ fontSize: '0.875rem', color: 'var(--cx-text-secondary)' }}>
                by {listing.provider_name} · {listing.session_duration_minutes} min · {listing.session_format}
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Message to provider (optional)</label>
              <textarea className="form-textarea" rows={3}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Introduce yourself and what you'd like to learn..." />
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? <Loader size={16} style={{ animation: 'spin 1s linear infinite' }} /> : null}
              Send Request
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function SkillsPage() {
  const { user } = useAuthStore();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [level, setLevel] = useState('All');
  const [page, setPage] = useState(1);
  const [showCreate, setShowCreate] = useState(false);
  const [requestListing, setRequestListing] = useState<any>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['skills', search, category, level, page],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page), page_size: '12' });
      if (search) params.set('q', search);
      if (category !== 'All') params.set('category', category);
      if (level !== 'All') params.set('level', level);
      const res = await api.get(`/skills/listings?${params}`);
      return res.data;
    },
  });

  const listings = data?.items ?? [];
  const total = data?.total ?? 0;
  const pages = data?.pages ?? 1;

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1.5rem', gap: '1rem', flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', marginBottom: '0.25rem' }}>⚡ SkillSwap</h1>
          <p style={{ color: 'var(--cx-text-secondary)' }}>
            Find students who can teach what you want to learn
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
          <Plus size={18} /> Offer a Skill
        </button>
      </div>

      {/* Search & Filters */}
      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '1.25rem', alignItems: 'center' }}>
        <div className="search-bar" style={{ flex: 1, minWidth: 200, maxWidth: 400 }}>
          <Search size={16} className="search-icon" />
          <input
            type="text"
            placeholder="Search skills..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        <select className="form-select" style={{ width: 'auto' }} value={level}
          onChange={(e) => { setLevel(e.target.value); setPage(1); }}>
          {LEVELS.map((l) => <option key={l}>{l}</option>)}
        </select>
      </div>

      {/* Category Filters */}
      <div className="filter-row" style={{ marginBottom: '1.5rem', overflowX: 'auto', paddingBottom: '0.25rem' }}>
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            className={`filter-chip ${category === cat ? 'active' : ''}`}
            onClick={() => { setCategory(cat); setPage(1); }}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Results count */}
      <div style={{ color: 'var(--cx-text-secondary)', fontSize: '0.875rem', marginBottom: '1rem' }}>
        {isLoading ? 'Loading...' : `${total} skill listing${total !== 1 ? 's' : ''} found`}
      </div>

      {/* Listings Grid */}
      {isLoading ? (
        <div className="grid-auto">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="card" style={{ padding: '1.25rem' }}>
              <div className="skeleton" style={{ height: 14, width: '40%', marginBottom: '0.75rem' }} />
              <div className="skeleton" style={{ height: 20, width: '85%', marginBottom: '0.5rem' }} />
              <div className="skeleton" style={{ height: 14, width: '100%', marginBottom: '0.25rem' }} />
              <div className="skeleton" style={{ height: 14, width: '70%', marginBottom: '1rem' }} />
              <div className="skeleton" style={{ height: 36, width: '100%' }} />
            </div>
          ))}
        </div>
      ) : listings.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">⚡</div>
          <h3>No listings found</h3>
          <p style={{ color: 'var(--cx-text-secondary)' }}>
            {search ? `No results for "${search}"` : 'Be the first to offer a skill!'}
          </p>
          <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
            <Plus size={18} /> Offer a Skill
          </button>
        </div>
      ) : (
        <div className="grid-auto">
          {listings.map((listing: any) => (
            <div key={listing.id} className="card card-clickable" style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ padding: '1.25rem', flex: 1 }}>
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.625rem', flexWrap: 'wrap' }}>
                  <span className="badge badge-primary">{listing.category}</span>
                  <span className="badge" style={{
                    background: { Beginner: '#dcfce7', Intermediate: '#dbeafe', Advanced: '#fef3c7', Expert: '#fee2e2' }[listing.skill_level as string] ?? '#f3f4f6',
                    color: { Beginner: '#166534', Intermediate: '#1e40af', Advanced: '#92400e', Expert: '#991b1b' }[listing.skill_level as string] ?? '#374151',
                  }}>
                    {listing.skill_level}
                  </span>
                </div>

                <h4 style={{ marginBottom: '0.375rem', fontSize: '1rem' }}>{listing.title}</h4>
                <p
                  className="truncate"
                  style={{
                    color: 'var(--cx-text-secondary)',
                    fontSize: '0.875rem',
                    lineHeight: 1.55,
                    marginBottom: '0.875rem',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                    whiteSpace: 'normal',
                  } as any}
                >
                  {listing.description}
                </p>

                <div style={{ display: 'flex', gap: '1rem', fontSize: '0.8125rem', color: 'var(--cx-text-secondary)', marginBottom: '0.875rem' }}>
                  <span>⏱ {listing.session_duration_minutes} min</span>
                  <span>🌐 {listing.preferred_language}</span>
                  <span>📍 {listing.session_format}</span>
                </div>

                <Link
                  to={`/profile/${listing.provider_id || listing.owner_id}`}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none', color: 'inherit' }}
                >
                  <div className="avatar avatar-xs" style={{ background: 'var(--cx-primary)', color: 'white', fontSize: '0.5625rem', fontWeight: 700 }}>
                    {listing.provider_name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                  </div>
                  <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--cx-text)' }}>
                    {listing.provider_name}
                  </span>
                  {listing.provider_department && (
                    <span style={{ fontSize: '0.75rem', color: 'var(--cx-text-muted)' }}>
                      · {listing.provider_department}
                    </span>
                  )}
                </Link>
              </div>

              <div className="card-footer" style={{ display: 'flex', gap: '0.5rem' }}>
                {listing.provider_id !== user?.id && listing.owner_id !== user?.id && listing.provider_id !== user?._id && listing.owner_id !== user?._id ? (
                  <>
                    <Link
                      to={`/profile/${listing.provider_id || listing.owner_id}`}
                      className="btn btn-secondary btn-sm"
                      style={{ textDecoration: 'none', whiteSpace: 'nowrap' }}
                    >
                      <UserIcon size={14} /> Profile
                    </Link>
                    <button
                      className="btn btn-primary btn-sm"
                      style={{ flex: 1 }}
                      onClick={() => setRequestListing(listing)}
                    >
                      <Zap size={14} /> Request Session
                    </button>
                  </>
                ) : (
                  <span className="badge badge-success" style={{ margin: 'auto' }}>Your Listing</span>
                )}
              </div>

            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {pages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginTop: '2rem' }}>
          <button className="btn btn-ghost btn-sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
            Previous
          </button>
          <span style={{ display: 'flex', alignItems: 'center', fontSize: '0.875rem', color: 'var(--cx-text-secondary)' }}>
            Page {page} of {pages}
          </span>
          <button className="btn btn-ghost btn-sm" disabled={page === pages} onClick={() => setPage((p) => p + 1)}>
            Next
          </button>
        </div>
      )}

      {showCreate && <CreateListingModal onClose={() => setShowCreate(false)} />}
      {requestListing && <RequestModal listing={requestListing} onClose={() => setRequestListing(null)} />}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
