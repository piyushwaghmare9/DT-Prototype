import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, ArrowRight, ArrowLeft, Loader, Plus, X } from 'lucide-react';
import api from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import { useUIStore } from '../../store/uiStore';

const STEPS = [
  { num: 1, label: 'Profile', emoji: '👤' },
  { num: 2, label: 'Department', emoji: '🏛️' },
  { num: 3, label: 'I Can Teach', emoji: '⚡' },
  { num: 4, label: 'I Want to Learn', emoji: '📚' },
  { num: 5, label: 'Interests', emoji: '🎯' },
  { num: 6, label: 'Avatar', emoji: '🖼️' },
  { num: 7, label: 'Done!', emoji: '🎉' },
];

const SKILL_OPTIONS = [
  'Python', 'JavaScript', 'React', 'Web Dev', 'Machine Learning',
  'Data Science', 'DSA', 'Java', 'C++', 'UI/UX Design',
  'Figma', 'Public Speaking', 'Writing', 'Mathematics',
  'Physics', 'Circuit Design', 'CAD', 'Music', 'Photography', 'Video Editing',
];

const SKILL_CATEGORY_MAP: Record<string, string> = {
  Python: 'Programming',
  JavaScript: 'Web Development',
  React: 'Web Development',
  'Web Dev': 'Web Development',
  'Machine Learning': 'AI & Machine Learning',
  'Data Science': 'AI & Machine Learning',
  DSA: 'Data Structures & Algorithms',
  Java: 'Programming',
  'C++': 'Programming',
  'UI/UX Design': 'Design & UI/UX',
  Figma: 'Design & UI/UX',
  'Public Speaking': 'Communication & Soft Skills',
  Writing: 'Communication & Soft Skills',
  Mathematics: 'Academic Subjects',
  Physics: 'Academic Subjects',
  'Circuit Design': 'Academic Subjects',
  CAD: 'Design & UI/UX',
  Music: 'Music & Creative Arts',
  Photography: 'Music & Creative Arts',
  'Video Editing': 'Music & Creative Arts',
};

const INTEREST_OPTIONS = [
  'Hackathons', 'Open Source', 'Startups', 'Research', 'Art & Design',
  'Sports', 'Music', 'Robotics', 'AI/ML', 'Web Dev',
  'Data Science', 'Mobile Dev', 'Game Dev', 'Cybersecurity', 'Blockchain',
];

const LANGUAGES = ['English', 'Hindi', 'Marathi', 'Tamil', 'Telugu', 'Kannada', 'Bengali', 'Gujarati', 'Other'];

function TagPicker({ options, selected, onChange, color = 'var(--cx-primary)' }: {
  options: string[]; selected: string[]; onChange: (v: string[]) => void; color?: string;
}) {
  const toggle = (item: string) => {
    if (selected.includes(item)) {
      onChange(selected.filter((s) => s !== item));
    } else {
      onChange([...selected, item]);
    }
  };
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
      {options.map((opt) => {
        const active = selected.includes(opt);
        return (
          <button
            key={opt}
            type="button"
            onClick={() => toggle(opt)}
            style={{
              padding: '0.4rem 0.875rem',
              borderRadius: 'var(--cx-radius-full)',
              border: `1.5px solid ${active ? color : 'var(--cx-border)'}`,
              background: active ? color : 'var(--cx-bg-card)',
              color: active ? 'white' : 'var(--cx-text-secondary)',
              fontSize: '0.875rem',
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
          >
            {opt}
          </button>
        );
      })}
    </div>
  );
}

export default function OnboardingPage() {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const { user, updateUser } = useAuthStore();
  const { addToast } = useUIStore();
  const navigate = useNavigate();

  const [data, setData] = useState({
    bio: user?.bio || '',
    skills_offered: user?.skills_offered?.map((s) => s.name) || [] as string[],
    skills_wanted: user?.skills_wanted || [] as string[],
    interests: user?.interests || [] as string[],
    languages: user?.languages || ['English'],
    avatar_url: user?.avatar_url || '',
  });

  async function saveStep(stepNum: number, stepData: any) {
    setLoading(true);
    try {
      await api.post(`/profiles/me/onboarding?step=${stepNum}`, stepData);
      updateUser(stepData);
    } catch (err: any) {
      addToast({ type: 'error', title: 'Could not save step', message: 'Please try again' });
      throw err;
    } finally {
      setLoading(false);
    }
  }

  async function handleNext() {
    const stepData: any = {};
    if (step === 1) stepData.bio = data.bio;
    if (step === 3) stepData.skills_offered = data.skills_offered.map((name) => ({ name, level: 'Intermediate', category: SKILL_CATEGORY_MAP[name] || 'Programming' }));
    if (step === 4) stepData.skills_wanted = data.skills_wanted;
    if (step === 5) { stepData.interests = data.interests; stepData.languages = data.languages; }
    if (step === 6) stepData.avatar_url = data.avatar_url;
    if (step === 7) {
      await saveStep(7, { onboarding_completed: true });
      updateUser({ onboarding_completed: true });
      addToast({ type: 'success', title: 'Welcome to CampusX! 🎉', message: "Your profile is ready." });
      navigate('/dashboard');
      return;
    }

    try {
      if (Object.keys(stepData).length > 0) await saveStep(step, stepData);
      setStep((s) => s + 1);
    } catch {}
  }

  function skip() {
    setStep((s) => s + 1);
  }

  const progress = ((step - 1) / (STEPS.length - 1)) * 100;

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #f7f5ff 0%, white 50%, #f0ecff 100%)',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'flex-start', padding: '2rem 1rem',
    }}>
      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '2rem' }}>
        <div className="sidebar-logo-icon" style={{ width: 36, height: 36, fontSize: '0.9rem' }}>CX</div>
        <span style={{ fontWeight: 800, fontSize: '1.125rem' }}>CampusX</span>
      </div>

      {/* Step indicators */}
      <div style={{ display: 'flex', gap: '0.375rem', marginBottom: '1.5rem', overflowX: 'auto', maxWidth: '100%' }}>
        {STEPS.map(({ num, emoji }) => (
          <div key={num} style={{
            width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: num < step ? 'var(--cx-success)' : num === step ? 'var(--cx-primary)' : 'var(--cx-border)',
            color: num <= step ? 'white' : 'var(--cx-text-muted)',
            fontSize: num < step ? '1rem' : '0.875rem',
            fontWeight: 700,
            transition: 'all 0.3s',
          }}>
            {num < step ? <Check size={16} strokeWidth={3} /> : emoji}
          </div>
        ))}
      </div>

      {/* Progress bar */}
      <div style={{ width: '100%', maxWidth: 500, marginBottom: '2rem' }}>
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${progress}%` }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.375rem', fontSize: '0.75rem', color: 'var(--cx-text-muted)' }}>
          <span>Step {step} of {STEPS.length}</span>
          <span>{Math.round(progress)}% complete</span>
        </div>
      </div>

      {/* Card */}
      <div className="card animate-slideUp" style={{ width: '100%', maxWidth: 520, padding: '2rem' }}>
        {/* Step 1: Bio */}
        {step === 1 && (
          <div>
            <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>👤</div>
            <h2 style={{ marginBottom: '0.375rem' }}>Tell us about yourself</h2>
            <p style={{ color: 'var(--cx-text-secondary)', marginBottom: '1.5rem' }}>
              Write a short bio so other students know who you are.
            </p>
            <div className="form-group">
              <label className="form-label">Your Bio</label>
              <textarea
                className="form-textarea"
                placeholder="I'm a CS student passionate about Python and machine learning. I love collaborating on projects..."
                rows={4}
                value={data.bio}
                onChange={(e) => setData({ ...data, bio: e.target.value })}
                maxLength={500}
              />
              <div style={{ fontSize: '0.75rem', color: 'var(--cx-text-muted)', textAlign: 'right' }}>
                {data.bio.length}/500
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Department (already set at registration, just confirm) */}
        {step === 2 && (
          <div>
            <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>🏛️</div>
            <h2 style={{ marginBottom: '0.375rem' }}>Your Academic Details</h2>
            <p style={{ color: 'var(--cx-text-secondary)', marginBottom: '1.5rem' }}>
              Your department and year help us find the most relevant connections for you.
            </p>
            <div style={{
              background: 'var(--cx-primary-subtle)',
              borderRadius: 'var(--cx-radius-lg)',
              padding: '1.25rem',
              display: 'flex', flexDirection: 'column', gap: '0.5rem',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--cx-text-secondary)', fontSize: '0.875rem' }}>Department</span>
                <span style={{ fontWeight: 600, color: 'var(--cx-primary)' }}>{user?.department}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--cx-text-secondary)', fontSize: '0.875rem' }}>Year</span>
                <span style={{ fontWeight: 600, color: 'var(--cx-primary)' }}>{user?.academic_year}</span>
              </div>
            </div>
            <p style={{ fontSize: '0.8125rem', color: 'var(--cx-text-muted)', marginTop: '0.875rem' }}>
              You can update these later in Settings.
            </p>
          </div>
        )}

        {/* Step 3: Skills Offered */}
        {step === 3 && (
          <div>
            <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>⚡</div>
            <h2 style={{ marginBottom: '0.375rem' }}>What can you teach?</h2>
            <p style={{ color: 'var(--cx-text-secondary)', marginBottom: '1.5rem' }}>
              Select skills you're comfortable teaching or sharing with peers.
            </p>
            <TagPicker
              options={SKILL_OPTIONS}
              selected={data.skills_offered}
              onChange={(v) => setData({ ...data, skills_offered: v })}
            />
            {data.skills_offered.length > 0 && (
              <p style={{ marginTop: '0.875rem', fontSize: '0.875rem', color: 'var(--cx-success)' }}>
                ✓ {data.skills_offered.length} skill{data.skills_offered.length !== 1 ? 's' : ''} selected
              </p>
            )}
          </div>
        )}

        {/* Step 4: Skills Wanted */}
        {step === 4 && (
          <div>
            <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>📚</div>
            <h2 style={{ marginBottom: '0.375rem' }}>What do you want to learn?</h2>
            <p style={{ color: 'var(--cx-text-secondary)', marginBottom: '1.5rem' }}>
              We'll recommend mentors and resources based on your learning goals.
            </p>
            <TagPicker
              options={SKILL_OPTIONS}
              selected={data.skills_wanted}
              onChange={(v) => setData({ ...data, skills_wanted: v })}
              color="var(--cx-coral)"
            />
          </div>
        )}

        {/* Step 5: Interests & Languages */}
        {step === 5 && (
          <div>
            <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>🎯</div>
            <h2 style={{ marginBottom: '0.375rem' }}>Interests & Languages</h2>
            <p style={{ color: 'var(--cx-text-secondary)', marginBottom: '1.5rem' }}>
              Help us find the right teammates and mentors for you.
            </p>
            <h5 style={{ marginBottom: '0.75rem', color: 'var(--cx-text-secondary)' }}>Interests</h5>
            <TagPicker
              options={INTEREST_OPTIONS}
              selected={data.interests}
              onChange={(v) => setData({ ...data, interests: v })}
              color="var(--cx-sky)"
            />
            <h5 style={{ marginTop: '1.25rem', marginBottom: '0.75rem', color: 'var(--cx-text-secondary)' }}>
              Preferred Languages
            </h5>
            <TagPicker
              options={LANGUAGES}
              selected={data.languages}
              onChange={(v) => setData({ ...data, languages: v })}
              color="var(--cx-yellow)"
            />
          </div>
        )}

        {/* Step 6: Avatar */}
        {step === 6 && (
          <div>
            <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>🖼️</div>
            <h2 style={{ marginBottom: '0.375rem' }}>Add a profile picture</h2>
            <p style={{ color: 'var(--cx-text-secondary)', marginBottom: '1.5rem' }}>
              Optional — paste an image URL or skip this step.
            </p>
            <div className="form-group">
              <label className="form-label">Image URL</label>
              <input
                type="url"
                className="form-input"
                placeholder="https://example.com/your-photo.jpg"
                value={data.avatar_url}
                onChange={(e) => setData({ ...data, avatar_url: e.target.value })}
              />
            </div>
            {data.avatar_url && (
              <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'center' }}>
                <div className="avatar avatar-xl">
                  <img src={data.avatar_url} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Step 7: Done */}
        {step === 7 && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '4rem', marginBottom: '1rem', animation: 'bounceIn 0.5s' }}>🎉</div>
            <h2 style={{ marginBottom: '0.5rem' }}>You're all set, {user?.full_name?.split(' ')[0]}!</h2>
            <p style={{ color: 'var(--cx-text-secondary)', marginBottom: '2rem', lineHeight: 1.7 }}>
              Your campus profile is ready. Start discovering skills, resources, and people who can help you grow.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem', marginBottom: '2rem', textAlign: 'left' }}>
              {[
                { icon: '⚡', text: `${data.skills_offered.length} skills you can teach`, ok: data.skills_offered.length > 0 },
                { icon: '📚', text: `${data.skills_wanted.length} skills you want to learn`, ok: data.skills_wanted.length > 0 },
                { icon: '🎯', text: `${data.interests.length} interests added`, ok: data.interests.length > 0 },
              ].map(({ icon, text, ok }) => (
                <div key={text} style={{
                  display: 'flex', alignItems: 'center', gap: '0.75rem',
                  padding: '0.75rem', borderRadius: 'var(--cx-radius)',
                  background: ok ? 'var(--cx-success-subtle)' : 'var(--cx-bg)',
                }}>
                  <span style={{ fontSize: '1.25rem' }}>{icon}</span>
                  <span style={{ fontWeight: 500, color: ok ? '#166534' : 'var(--cx-text-muted)' }}>{text}</span>
                  {ok && <Check size={16} color="var(--cx-success)" style={{ marginLeft: 'auto' }} strokeWidth={3} />}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Navigation */}
        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '2rem' }}>
          {step > 1 && step < 7 && (
            <button
              className="btn btn-ghost"
              onClick={() => setStep((s) => s - 1)}
              disabled={loading}
            >
              <ArrowLeft size={18} />
              Back
            </button>
          )}

          {step < 6 && (
            <button className="btn btn-ghost btn-sm" onClick={skip} style={{ marginRight: 'auto' }}>
              Skip for now
            </button>
          )}

          <button
            className="btn btn-primary"
            onClick={handleNext}
            disabled={loading}
            style={{ marginLeft: 'auto' }}
          >
            {loading ? <Loader size={18} style={{ animation: 'spin 1s linear infinite' }} /> : null}
            {step === 7 ? 'Go to Dashboard' : 'Continue'}
            {!loading && <ArrowRight size={18} />}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes bounceIn {
          0% { transform: scale(0.5); opacity: 0; }
          60% { transform: scale(1.1); }
          100% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
