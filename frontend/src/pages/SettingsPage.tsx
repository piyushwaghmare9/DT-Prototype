import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Settings as SettingsIcon,
  User,
  Shield,
  Bell,
  LogOut,
  Save,
  CheckCircle,
  Plus,
  X,
  Loader,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuthStore } from '../store/authStore';
import { useUIStore } from '../store/uiStore';

const DEPARTMENTS = [
  'Computer Science',
  'Electronics & Comm',
  'Mechanical',
  'Civil',
  'Electrical',
  'Information Technology',
  'Design',
  'Business / MBA',
  'Physics / Math',
  'Other',
];

const YEARS = ['Year 1', 'Year 2', 'Year 3', 'Year 4', 'Graduate / Masters', 'PhD'];

export default function SettingsPage() {
  const navigate = useNavigate();
  const { user, updateUser, logout } = useAuthStore();
  const { addToast } = useUIStore();
  const qc = useQueryClient();

  const [tab, setTab] = useState<'profile' | 'skills' | 'privacy'>('profile');

  // Form states
  const [bio, setBio] = useState(user?.bio || '');
  const [department, setDepartment] = useState(user?.department || 'Computer Science');
  const [academicYear, setAcademicYear] = useState(user?.academic_year || 'Year 2');
  const [isPublic, setIsPublic] = useState(user?.is_profile_public ?? true);

  // Skills states
  const [skillsOffered, setSkillsOffered] = useState<Array<{ name: string; level: string; category: string }>>(
    user?.skills_offered || []
  );
  const [newSkillName, setNewSkillName] = useState('');
  const [newSkillLevel, setNewSkillLevel] = useState('Intermediate');

  const [skillsWanted, setSkillsWanted] = useState<string[]>(user?.skills_wanted || []);
  const [newWanted, setNewWanted] = useState('');

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await api.put('/profiles/me', payload);
      return res.data;
    },
    onSuccess: (data) => {
      updateUser(data);
      addToast({ type: 'success', title: 'Settings updated successfully!' });
      qc.invalidateQueries({ queryKey: ['profile'] });
    },
    onError: (err: any) => {
      addToast({
        type: 'error',
        title: 'Failed to update settings',
        message: err.response?.data?.detail || 'An error occurred',
      });
    },
  });

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate({
      bio,
      department,
      academic_year: academicYear,
      is_profile_public: isPublic,
    });
  };

  const handleSaveSkills = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate({
      skills_offered: skillsOffered,
      skills_wanted: skillsWanted,
    });
  };

  const addOfferedSkill = () => {
    if (!newSkillName.trim()) return;
    setSkillsOffered([
      ...skillsOffered,
      { name: newSkillName.trim(), level: newSkillLevel, category: 'Technical' },
    ]);
    setNewSkillName('');
  };

  const removeOfferedSkill = (idx: number) => {
    setSkillsOffered(skillsOffered.filter((_, i) => i !== idx));
  };

  const addWantedSkill = () => {
    if (!newWanted.trim()) return;
    setSkillsWanted([...skillsWanted, newWanted.trim()]);
    setNewWanted('');
  };

  const removeWantedSkill = (idx: number) => {
    setSkillsWanted(skillsWanted.filter((_, i) => i !== idx));
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div style={{ maxWidth: 840, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, margin: '0 0 0.25rem' }}>Account Settings</h1>
          <p style={{ color: 'var(--cx-text-secondary)', margin: 0 }}>
            Manage your student profile, skills catalog, and campus visibility.
          </p>
        </div>

        <button className="btn btn-ghost btn-sm" style={{ color: 'var(--cx-error)' }} onClick={handleLogout}>
          <LogOut size={16} /> Sign Out
        </button>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid var(--cx-border)', paddingBottom: '0.5rem' }}>
        {[
          { id: 'profile', label: 'Basic Profile', icon: User },
          { id: 'skills', label: 'Skills & Wishlist', icon: SettingsIcon },
          { id: 'privacy', label: 'Privacy & Safety', icon: Shield },
        ].map((t) => {
          const Icon = t.icon;
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id as any)}
              className="btn btn-ghost"
              style={{
                color: active ? 'var(--cx-primary)' : 'var(--cx-text-secondary)',
                borderBottom: active ? '2px solid var(--cx-primary)' : '2px solid transparent',
                borderRadius: 0,
                fontWeight: active ? 700 : 500,
              }}
            >
              <Icon size={16} /> {t.label}
            </button>
          );
        })}
      </div>

      {/* Tab 1: Profile */}
      {tab === 'profile' && (
        <form onSubmit={handleSaveProfile} className="card" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div className="grid-2" style={{ gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Full Name</label>
              <input className="form-input" disabled value={user?.full_name || ''} style={{ background: 'var(--cx-bg)' }} />
            </div>

            <div className="form-group">
              <label className="form-label">Campus Email</label>
              <input className="form-input" disabled value={user?.email || ''} style={{ background: 'var(--cx-bg)' }} />
            </div>
          </div>

          <div className="grid-2" style={{ gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Department / Major</label>
              <select className="form-select" value={department} onChange={(e) => setDepartment(e.target.value)}>
                {DEPARTMENTS.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Academic Year</label>
              <select className="form-select" value={academicYear} onChange={(e) => setAcademicYear(e.target.value)}>
                {YEARS.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Bio & Study Goals</label>
            <textarea
              className="form-textarea"
              rows={4}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Tell other students what you're working on, hobbies, and how you like to collaborate..."
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '1rem', borderTop: '1px solid var(--cx-border)' }}>
            <button type="submit" className="btn btn-primary" disabled={updateMutation.isPending}>
              {updateMutation.isPending ? <Loader size={16} className="animate-spin" /> : <Save size={16} />}
              Save Profile Changes
            </button>
          </div>
        </form>
      )}

      {/* Tab 2: Skills & Wishlist */}
      {tab === 'skills' && (
        <form onSubmit={handleSaveSkills} className="card" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.5rem' }}>Skills You Can Teach</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--cx-text-secondary)', marginBottom: '1rem' }}>
              These will appear in the Campus Skill Graph and recommendation engine.
            </p>

            <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem' }}>
              <input
                className="form-input"
                placeholder="e.g. React.js, Blender 3D, Calculus II"
                value={newSkillName}
                onChange={(e) => setNewSkillName(e.target.value)}
              />
              <select
                className="form-select"
                style={{ width: 160 }}
                value={newSkillLevel}
                onChange={(e) => setNewSkillLevel(e.target.value)}
              >
                <option value="Beginner">Beginner</option>
                <option value="Intermediate">Intermediate</option>
                <option value="Advanced">Advanced</option>
                <option value="Expert">Expert</option>
              </select>
              <button type="button" className="btn btn-secondary" onClick={addOfferedSkill}>
                <Plus size={16} /> Add
              </button>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
              {skillsOffered.map((s, idx) => (
                <span key={idx} className="badge badge-primary" style={{ padding: '0.4rem 0.75rem', gap: '0.5rem' }}>
                  {s.name} ({s.level})
                  <X size={14} style={{ cursor: 'pointer' }} onClick={() => removeOfferedSkill(idx)} />
                </span>
              ))}
            </div>
          </div>

          <div style={{ paddingTop: '1.5rem', borderTop: '1px solid var(--cx-border)' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.5rem' }}>Skills You Want to Learn</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--cx-text-secondary)', marginBottom: '1rem' }}>
              Peers who teach these topics will be highlighted for you.
            </p>

            <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem' }}>
              <input
                className="form-input"
                placeholder="e.g. System Design, PyTorch, Video Editing"
                value={newWanted}
                onChange={(e) => setNewWanted(e.target.value)}
              />
              <button type="button" className="btn btn-secondary" onClick={addWantedSkill}>
                <Plus size={16} /> Add
              </button>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
              {skillsWanted.map((s, idx) => (
                <span key={idx} className="badge" style={{ background: '#E0F2FE', color: '#0369A1', padding: '0.4rem 0.75rem', gap: '0.5rem' }}>
                  {s}
                  <X size={14} style={{ cursor: 'pointer' }} onClick={() => removeWantedSkill(idx)} />
                </span>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '1rem', borderTop: '1px solid var(--cx-border)' }}>
            <button type="submit" className="btn btn-primary" disabled={updateMutation.isPending}>
              {updateMutation.isPending ? <Loader size={16} className="animate-spin" /> : <Save size={16} />}
              Save Skills
            </button>
          </div>
        </form>
      )}

      {/* Tab 3: Privacy */}
      {tab === 'privacy' && (
        <div className="card" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>Campus Community Privacy</h3>
          <p style={{ fontSize: '0.875rem', color: 'var(--cx-text-secondary)', margin: 0 }}>
            Control how your student card and contact details appear to other authenticated peers.
          </p>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', background: 'var(--cx-bg)', borderRadius: 'var(--cx-radius)' }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: '0.9375rem' }}>Public Campus Profile</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--cx-text-secondary)' }}>
                Allow fellow verified students to find you in the Skill Graph and directory.
              </div>
            </div>
            <input
              type="checkbox"
              checked={isPublic}
              onChange={(e) => setIsPublic(e.target.checked)}
              style={{ width: 20, height: 20, accentColor: 'var(--cx-primary)', cursor: 'pointer' }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '1rem', borderTop: '1px solid var(--cx-border)' }}>
            <button
              className="btn btn-primary"
              onClick={() => updateMutation.mutate({ is_profile_public: isPublic })}
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending ? <Loader size={16} className="animate-spin" /> : <Save size={16} />}
              Save Privacy Settings
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
