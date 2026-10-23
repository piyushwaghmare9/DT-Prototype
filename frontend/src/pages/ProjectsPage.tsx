import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Users, Rocket, Calendar, Tag, ArrowRight, X, Loader, CheckCircle, Send } from 'lucide-react';
import api from '../services/api';
import { useAuthStore } from '../store/authStore';
import { useUIStore } from '../store/uiStore';

const CATEGORIES = [
  'All',
  'Hackathon',
  'Capstone / Final Year',
  'Startup / Venture',
  'Open Source',
  'Research & Lab',
  'Creative & Media',
  'Other',
];

interface Project {
  id: string;
  _id?: string;
  title: string;
  description: string;
  category: string;
  required_skills: string[];
  max_team_size: number;
  team_size: number;
  status: 'active' | 'full' | 'completed';
  owner_id: string;
  owner_name: string;
  owner_avatar?: string;
  created_at: string;
}

function CreateProjectModal({ onClose }: { onClose: () => void }) {
  const { addToast } = useUIStore();
  const qc = useQueryClient();
  const [form, setForm] = useState({
    title: '',
    description: '',
    category: 'Hackathon',
    required_skills: '',
    max_team_size: 4,
  });
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/projects/', {
        ...form,
        max_team_size: Number(form.max_team_size),
        required_skills: form.required_skills.split(',').map((s) => s.trim()).filter(Boolean),
      });
      addToast({ type: 'success', title: 'Project created! Ready for teammates.' });
      qc.invalidateQueries({ queryKey: ['projects'] });
      onClose();
    } catch (err: any) {
      addToast({ type: 'error', title: 'Failed to create project', message: err.response?.data?.detail });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{ width: 36, height: 36, borderRadius: 'var(--cx-radius)', background: 'var(--cx-yellow)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Rocket size={20} color="#b45309" />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.15rem' }}>Launch a Dream Team Project</h3>
              <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--cx-text-secondary)' }}>Find passionate co-builders across departments</p>
            </div>
          </div>
          <button className="btn btn-ghost btn-icon btn-sm" onClick={onClose}><X size={18} /></button>
        </div>

        <form onSubmit={submit}>
          <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxHeight: '70vh', overflowY: 'auto' }}>
            <div className="form-group">
              <label className="form-label">Project Title *</label>
              <input
                className="form-input"
                required
                placeholder="e.g. AI-Powered Campus Transit Tracker"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Project Vision & Description *</label>
              <textarea
                className="form-textarea"
                required
                rows={4}
                placeholder="Explain what the project solves, what stage you're in, and who you need..."
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
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
                <label className="form-label">Target Team Size</label>
                <input
                  type="number"
                  min={2}
                  max={12}
                  className="form-input"
                  value={form.max_team_size}
                  onChange={(e) => setForm({ ...form, max_team_size: Number(e.target.value) })}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Skills & Roles Needed (comma-separated)</label>
              <input
                className="form-input"
                placeholder="e.g. React Native, Fastify, UI/UX Designer, Prompt Engineer"
                value={form.required_skills}
                onChange={(e) => setForm({ ...form, required_skills: e.target.value })}
              />
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? <Loader size={16} className="animate-spin" /> : 'Create Project'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ApplyProjectModal({ project, onClose }: { project: Project; onClose: () => void }) {
  const { addToast } = useUIStore();
  const [message, setMessage] = useState('');
  const [skills, setSkills] = useState('');
  const [loading, setLoading] = useState(false);
  const projectId = project.id || project._id;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post(`/projects/${projectId}/apply`, {
        message,
        skills: skills.split(',').map((s) => s.trim()).filter(Boolean),
      });
      addToast({ type: 'success', title: 'Application sent to team lead!' });
      onClose();
    } catch (err: any) {
      addToast({ type: 'error', title: 'Application failed', message: err.response?.data?.detail || 'Unable to submit application' });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Apply to Join Team</h3>
          <button className="btn btn-ghost btn-icon btn-sm" onClick={onClose}><X size={18} /></button>
        </div>
        <form onSubmit={submit}>
          <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ background: 'var(--cx-bg)', padding: '1rem', borderRadius: 'var(--cx-radius)' }}>
              <div style={{ fontWeight: 700, fontSize: '1rem' }}>{project.title}</div>
              <div style={{ fontSize: '0.85rem', color: 'var(--cx-text-secondary)', marginTop: '0.25rem' }}>
                Lead: <b>{project.owner_name}</b> • Seeking: {project.required_skills?.join(', ') || 'Teammates'}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Your Relevant Skills *</label>
              <input
                className="form-input"
                required
                placeholder="e.g. Flutter, Firebase, Figma, Video Editing"
                value={skills}
                onChange={(e) => setSkills(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Why are you interested? *</label>
              <textarea
                className="form-textarea"
                required
                rows={3}
                placeholder="Explain your motivation, past relevant experience, or time commitment..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
              />
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? <Loader size={16} className="animate-spin" /> : 'Submit Pitch'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function ProjectsPage() {
  const { user } = useAuthStore();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['projects', search, category],
    queryFn: async () => {
      const params: any = { status: 'active' };
      if (search) params.q = search;
      if (category !== 'All') params.category = category;
      const res = await api.get('/projects/', { params });
      return res.data;
    },
  });

  const projects: Project[] = data?.items || [];

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.75rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '0.25rem' }}>
            <span style={{ fontSize: '1.75rem' }}>🚀</span>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }}>Dream Team Builder</h1>
          </div>
          <p style={{ color: 'var(--cx-text-secondary)', fontSize: '0.9375rem' }}>
            Assemble high-performing teams for hackathons, research, capstones, and startups.
          </p>
        </div>

        <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
          <Plus size={18} />
          Launch a Project
        </button>
      </div>

      {/* Search and Filters */}
      <div className="card" style={{ padding: '1rem 1.25rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: '1 1 260px' }}>
            <Search size={18} style={{ position: 'absolute', left: '0.875rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--cx-text-muted)' }} />
            <input
              type="text"
              className="form-input"
              style={{ paddingLeft: '2.5rem' }}
              placeholder="Search by project name, description, or required skill (e.g. Flutter, PyTorch)..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <select
            className="form-select"
            style={{ minWidth: 160 }}
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Grid */}
      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '4rem 1rem' }}>
          <Loader size={32} className="animate-spin" style={{ color: 'var(--cx-primary)', margin: '0 auto 1rem' }} />
          <p style={{ color: 'var(--cx-text-secondary)' }}>Loading active campus projects...</p>
        </div>
      ) : projects.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🚀</div>
          <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>No open projects yet</h3>
          <p style={{ color: 'var(--cx-text-secondary)', maxWidth: 400, margin: '0 auto 1.5rem' }}>
            Have a brilliant hackathon concept or final-year capstone idea? Post it now and recruit co-founders!
          </p>
          <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
            <Plus size={18} />
            Post Your Project
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.25rem' }}>
          {projects.map((proj) => {
            const isOwner = proj.owner_id === user?.id;
            return (
              <div
                key={proj.id || proj._id}
                className="card"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  overflow: 'hidden',
                  transition: 'transform var(--cx-transition), box-shadow var(--cx-transition)',
                }}
              >
                <div style={{ height: 6, background: 'linear-gradient(90deg, #FFD76A, #FF7968)' }} />
                <div style={{ padding: '1.25rem', flex: 1, display: 'flex', flexDirection: 'column' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                    <span className="badge" style={{ background: '#fef3c7', color: '#92400e', fontWeight: 600 }}>
                      {proj.category}
                    </span>
                    <span className="badge badge-primary" style={{ fontSize: '0.75rem' }}>
                      <Users size={12} style={{ marginRight: '0.25rem' }} />
                      {proj.team_size || 1} / {proj.max_team_size || 4} Members
                    </span>
                  </div>

                  <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '0.5rem', color: 'var(--cx-text)' }}>
                    {proj.title}
                  </h3>

                  <p
                    style={{
                      fontSize: '0.875rem',
                      color: 'var(--cx-text-secondary)',
                      lineHeight: 1.55,
                      marginBottom: '1rem',
                      display: '-webkit-box',
                      WebkitLineClamp: 3,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                      flex: 1,
                    } as any}
                  >
                    {proj.description}
                  </p>

                  {/* Required Skills Badges */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', marginBottom: '1.25rem' }}>
                    {proj.required_skills?.map((skill, sIdx) => (
                      <span
                        key={sIdx}
                        className="badge"
                        style={{
                          background: 'var(--cx-bg)',
                          border: '1px solid var(--cx-border)',
                          color: 'var(--cx-text)',
                          fontSize: '0.75rem',
                        }}
                      >
                        ⚡ {skill}
                      </span>
                    ))}
                  </div>

                  {/* Footer */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '0.75rem', borderTop: '1px solid var(--cx-border)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <div className="avatar avatar-xs" style={{ background: '#FF7968', color: 'white', fontWeight: 700, fontSize: '0.65rem' }}>
                        {proj.owner_name?.slice(0, 2).toUpperCase() || 'L'}
                      </div>
                      <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--cx-text)' }}>
                        {proj.owner_name}
                      </span>
                    </div>

                    {isOwner ? (
                      <span className="badge badge-secondary" style={{ fontSize: '0.75rem' }}>Project Owner</span>
                    ) : (
                      <button
                        className="btn btn-primary btn-sm"
                        onClick={() => setSelectedProject(proj)}
                      >
                        Apply to Join
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showCreateModal && <CreateProjectModal onClose={() => setShowCreateModal(false)} />}
      {selectedProject && <ApplyProjectModal project={selectedProject} onClose={() => setSelectedProject(null)} />}
    </div>
  );
}
