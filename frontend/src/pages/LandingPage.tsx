import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Zap, Package, Layers, Users, ArrowRight, Check, Star,
  BookOpen, Code, Palette, Mic, ChevronDown,
  MapPin, Clock, Shield, Heart
} from 'lucide-react';

const FEATURES = [
  {
    icon: Zap,
    title: 'SkillSwap',
    description: 'Find students who can teach what you want to learn. Share what you already know. Grow together.',
    color: 'var(--cx-primary)',
    bg: 'var(--cx-primary-subtle)',
    gradient: 'linear-gradient(135deg, #6C4CF1, #4F35C8)',
  },
  {
    icon: Package,
    title: 'Borrow Hub',
    description: "Borrow the textbook, calculator, or equipment you need—from a student who already owns it.",
    color: '#0c3a52',
    bg: '#e0f4ff',
    gradient: 'linear-gradient(135deg, #71C8F7, #4aacd4)',
  },
  {
    icon: Layers,
    title: 'Campus Skill Graph',
    description: "See the invisible network connecting students, skills, resources, and projects. Discover who can help.",
    color: '#2d4a0a',
    bg: '#f0fce7',
    gradient: 'linear-gradient(135deg, #C7F36B, #9bc23a)',
  },
  {
    icon: Users,
    title: 'Dream Team',
    description: 'Create projects, find complementary teammates, and build something amazing together.',
    color: '#c0432e',
    bg: '#fff1ef',
    gradient: 'linear-gradient(135deg, #FF7968, #d45e4e)',
  },
];

const STEPS = [
  { num: '01', title: 'Verify Your Identity', desc: 'Sign up with your college email. We keep the campus circle genuine and safe.' },
  { num: '02', title: 'Build Your Profile', desc: 'Add skills you offer, skills you want to learn, and interests. Takes under 3 minutes.' },
  { num: '03', title: 'Connect & Collaborate', desc: 'Discover peers, request sessions, borrow resources, and join projects.' },
  { num: '04', title: 'Grow Your Reputation', desc: 'Earn XP, badges, and Skill Credits with every contribution you make.' },
];

const PROBLEMS = [
  { icon: '🔍', text: 'Valuable skills are impossible to discover' },
  { icon: '📚', text: 'Resources sit unused while others struggle to find them' },
  { icon: '🙋', text: 'Students struggle to find peer mentors and academic support' },
  { icon: '👥', text: 'Projects lack the right combination of skills' },
  { icon: '📢', text: 'Important opportunities get lost in group chats' },
];

function FloatingCard({ style, icon, title, sub, color }: any) {
  return (
    <div style={{
      position: 'absolute',
      background: 'white',
      borderRadius: '14px',
      padding: '0.875rem 1rem',
      boxShadow: '0 8px 32px rgba(108,76,241,0.18)',
      display: 'flex',
      alignItems: 'center',
      gap: '0.625rem',
      ...style,
      animation: 'float 6s ease-in-out infinite',
    }}>
      <div style={{
        width: 40, height: 40,
        background: color,
        borderRadius: '10px',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '1.25rem',
      }}>{icon}</div>
      <div>
        <div style={{ fontWeight: 700, fontSize: '0.875rem', color: '#202033' }}>{title}</div>
        <div style={{ fontSize: '0.75rem', color: '#77758B' }}>{sub}</div>
      </div>
    </div>
  );
}

export default function LandingPage() {
  const [faqOpen, setFaqOpen] = useState<number | null>(null);

  return (
    <div style={{ background: 'var(--cx-bg-card)', overflow: 'hidden' }}>
      {/* ── NAV ─────────────────────────────────────────────── */}
      <nav className="landing-nav">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
          <div className="sidebar-logo-icon" style={{ background: 'linear-gradient(135deg, var(--cx-primary), var(--cx-primary-light))' }}>CX</div>
          <span style={{ fontWeight: 800, fontSize: '1.125rem', color: 'var(--cx-text)' }}>CampusX</span>
        </div>

        <div className="hide-mobile" style={{ display: 'flex', gap: '1.75rem', marginLeft: '2rem' }}>
          {['Features', 'How It Works', 'Skill Graph'].map((item) => (
            <a key={item} href={`#${item.toLowerCase().replace(/ /g, '-')}`}
              style={{ color: 'var(--cx-text-secondary)', fontWeight: 500, fontSize: '0.9375rem', transition: 'color 0.2s' }}
              onMouseOver={e => (e.currentTarget.style.color = 'var(--cx-primary)')}
              onMouseOut={e => (e.currentTarget.style.color = 'var(--cx-text-secondary)')}
            >{item}</a>
          ))}
        </div>

        <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <Link to="/login" className="btn btn-ghost btn-sm">Sign In</Link>
          <Link to="/register" className="btn btn-primary btn-sm">
            Join CampusX <ArrowRight size={16} />
          </Link>
        </div>
      </nav>

      {/* ── HERO ─────────────────────────────────────────────── */}
      <section className="landing-hero" style={{ position: 'relative', overflow: 'hidden' }}>
        {/* Background blobs */}
        <div style={{
          position: 'absolute', top: '10%', right: '5%',
          width: 600, height: 600,
          background: 'radial-gradient(circle, rgba(108,76,241,0.08) 0%, transparent 70%)',
          borderRadius: '50%', pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute', bottom: '15%', left: '0%',
          width: 400, height: 400,
          background: 'radial-gradient(circle, rgba(199,243,107,0.12) 0%, transparent 70%)',
          borderRadius: '50%', pointerEvents: 'none',
        }} />

        <div style={{ maxWidth: 1200, margin: '0 auto', width: '100%', position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4rem', alignItems: 'center' }}>
            {/* Left */}
            <div className="animate-slideUp">
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
                background: 'var(--cx-primary-subtle)', color: 'var(--cx-primary)',
                padding: '0.375rem 0.875rem', borderRadius: 'var(--cx-radius-full)',
                fontSize: '0.875rem', fontWeight: 600, marginBottom: '1.5rem',
              }}>
                <Star size={14} fill="currentColor" /> College-exclusive community
              </div>

              <h1 style={{ marginBottom: '1.25rem', lineHeight: 1.1, letterSpacing: '-1px' }}>
                Your Campus Is Full of{' '}
                <span style={{
                  background: 'linear-gradient(135deg, var(--cx-primary), var(--cx-primary-light), #a855f7)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}>
                  Untapped Potential.
                </span>
              </h1>

              <p style={{
                fontSize: '1.125rem', color: 'var(--cx-text-secondary)',
                marginBottom: '2rem', maxWidth: 480, lineHeight: 1.7,
              }}>
                Learn a new skill, borrow what you need, find your next project teammate,
                and discover the people who can help you grow—all within your college.
              </p>

              <div style={{ display: 'flex', gap: '0.875rem', flexWrap: 'wrap' }}>
                <Link to="/register" className="btn btn-primary btn-lg">
                  Join CampusX <ArrowRight size={18} />
                </Link>
                <a href="#how-it-works" className="btn btn-outline btn-lg">
                  Explore How It Works
                </a>
              </div>

              <div style={{ marginTop: '2rem', display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
                {[
                  { icon: <Shield size={16} />, text: 'College-verified only' },
                  { icon: <Heart size={16} />, text: 'Community-driven' },
                  { icon: <Clock size={16} />, text: 'Join in 2 minutes' },
                ].map(({ icon, text }) => (
                  <div key={text} style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', color: 'var(--cx-text-secondary)', fontSize: '0.875rem' }}>
                    <span style={{ color: 'var(--cx-primary)' }}>{icon}</span>
                    {text}
                  </div>
                ))}
              </div>
            </div>

            {/* Right - Visual */}
            <div style={{ position: 'relative', height: 520, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {/* Central graph visual */}
              <div style={{
                width: 200, height: 200,
                background: 'linear-gradient(135deg, var(--cx-primary), var(--cx-primary-dark))',
                borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 20px 60px rgba(108,76,241,0.4)',
                color: 'white', fontSize: '4rem',
                position: 'relative', zIndex: 2,
              }}>
                🎓
              </div>

              {/* Floating cards */}
              <FloatingCard
                style={{ top: '5%', left: '0%', zIndex: 3 }}
                icon="⚡" title="Python Mentor Found!" sub="3 students available"
                color="var(--cx-primary-subtle)"
              />
              <FloatingCard
                style={{ top: '20%', right: '-5%', zIndex: 3, animationDelay: '1s' }}
                icon="📦" title="Calculator Available" sub="Return in 3 days"
                color="#e0f4ff"
              />
              <FloatingCard
                style={{ bottom: '25%', left: '-5%', zIndex: 3, animationDelay: '2s' }}
                icon="🚀" title="Team Forming" sub="Hackathon project"
                color="#fff1ef"
              />
              <FloatingCard
                style={{ bottom: '10%', right: '0%', zIndex: 3, animationDelay: '3s' }}
                icon="🏆" title="+50 XP Earned!" sub="Session completed"
                color="#f0fce7"
              />
            </div>
          </div>
        </div>
      </section>

      {/* ── PROBLEM ─────────────────────────────────────────── */}
      <section style={{ background: 'var(--cx-sidebar-bg)', padding: '5rem max(2rem, calc((100% - 1200px) / 2 + 2rem))' }}>
        <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
          <div className="badge badge-coral" style={{ marginBottom: '0.75rem', background: 'rgba(255,121,104,0.15)', color: 'var(--cx-coral)', padding: '0.4rem 1rem' }}>
            The Problem
          </div>
          <h2 style={{ color: 'white', marginBottom: '0.75rem' }}>
            Current Methods Are Broken
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.55)', maxWidth: 500, margin: '0 auto' }}>
            WhatsApp groups, notice boards, word of mouth—all fragmented, unreliable, and slow.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
          {PROBLEMS.map(({ icon, text }) => (
            <div key={text} style={{
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 'var(--cx-radius-lg)',
              padding: '1.25rem',
              display: 'flex', alignItems: 'flex-start', gap: '0.875rem',
              transition: 'background 0.2s',
            }}>
              <span style={{ fontSize: '1.5rem' }}>{icon}</span>
              <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.9375rem', lineHeight: 1.5 }}>{text}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ── FEATURES ─────────────────────────────────────────── */}
      <section id="features" className="landing-section" style={{ background: 'var(--cx-bg)' }}>
        <div style={{ textAlign: 'center', marginBottom: '3.5rem' }}>
          <div className="badge badge-primary" style={{ marginBottom: '0.75rem', padding: '0.4rem 1rem' }}>
            The Solution
          </div>
          <h2 className="landing-section-title">Four Pillars of CampusX</h2>
          <p style={{ color: 'var(--cx-text-secondary)', maxWidth: 520, margin: '0 auto' }}>
            One platform, four powerful ways to connect with your campus community.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.5rem' }}>
          {FEATURES.map(({ icon: Icon, title, description, color, bg, gradient }) => (
            <div key={title} className="card" style={{ padding: '2rem', cursor: 'default' }}>
              <div style={{
                width: 56, height: 56,
                background: gradient,
                borderRadius: 'var(--cx-radius)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                marginBottom: '1.25rem',
                boxShadow: `0 8px 20px ${color}30`,
              }}>
                <Icon size={26} color="white" />
              </div>
              <h3 style={{ marginBottom: '0.625rem', fontSize: '1.25rem' }}>{title}</h3>
              <p style={{ color: 'var(--cx-text-secondary)', fontSize: '0.9375rem', lineHeight: 1.65 }}>
                {description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ── HOW IT WORKS ─────────────────────────────────────── */}
      <section id="how-it-works" className="landing-section" style={{ background: 'white' }}>
        <div style={{ textAlign: 'center', marginBottom: '3.5rem' }}>
          <h2 className="landing-section-title">How It Works</h2>
          <p style={{ color: 'var(--cx-text-secondary)', maxWidth: 480, margin: '0 auto' }}>
            From sign-up to making your first campus connection—it only takes minutes.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '2rem' }}>
          {STEPS.map(({ num, title, desc }, i) => (
            <div key={num} style={{ position: 'relative', textAlign: 'center', padding: '1.5rem 1rem' }}>
              <div style={{
                width: 60, height: 60,
                background: i === 0 ? 'var(--cx-primary)' : 'var(--cx-primary-subtle)',
                color: i === 0 ? 'white' : 'var(--cx-primary)',
                borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 800, fontSize: '1.125rem',
                margin: '0 auto 1.25rem',
                boxShadow: i === 0 ? '0 8px 24px rgba(108,76,241,0.35)' : 'none',
              }}>
                {num}
              </div>
              <h4 style={{ marginBottom: '0.5rem', fontSize: '1.0625rem' }}>{title}</h4>
              <p style={{ color: 'var(--cx-text-secondary)', fontSize: '0.9375rem', lineHeight: 1.6 }}>{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── SKILL GRAPH TEASER ────────────────────────────────── */}
      <section id="skill-graph" style={{
        background: 'linear-gradient(135deg, var(--cx-primary) 0%, var(--cx-primary-dark) 100%)',
        padding: '5rem max(2rem, calc((100% - 1200px) / 2 + 2rem))',
      }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4rem', alignItems: 'center' }}>
          <div>
            <div className="badge" style={{ background: 'rgba(199,243,107,0.2)', color: 'var(--cx-lime)', marginBottom: '1rem', padding: '0.4rem 1rem' }}>
              Signature Feature
            </div>
            <h2 style={{ color: 'white', marginBottom: '1rem' }}>
              Campus Skill Graph
            </h2>
            <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: '1rem', lineHeight: 1.7, marginBottom: '1.5rem' }}>
              An interactive network that maps every student, skill, resource, and project
              in your college. See who knows what. Discover unexpected connections.
              Find the right person instantly.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '2rem' }}>
              {[
                'Visual map of student skills and resources',
                'Transparent rule-based recommendations',
                'Filter by department, skill, or availability',
                'Click any node to explore connections',
              ].map((item) => (
                <div key={item} style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', color: 'rgba(255,255,255,0.85)', fontSize: '0.9375rem' }}>
                  <Check size={16} color="var(--cx-lime)" strokeWidth={3} />
                  {item}
                </div>
              ))}
            </div>
            <Link to="/register" className="btn btn-lg" style={{ background: 'var(--cx-lime)', color: '#1a3606' }}>
              Explore the Graph <ArrowRight size={18} />
            </Link>
          </div>

          {/* Graph Preview */}
          <div style={{
            background: 'rgba(255,255,255,0.06)',
            borderRadius: 'var(--cx-radius-xl)',
            border: '1px solid rgba(255,255,255,0.1)',
            padding: '2rem',
            minHeight: 300,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            position: 'relative',
          }}>
            <div style={{ position: 'relative', width: 280, height: 280 }}>
              {/* Center node */}
              <div style={{
                position: 'absolute', top: '50%', left: '50%',
                transform: 'translate(-50%, -50%)',
                width: 64, height: 64,
                background: 'var(--cx-primary-light)',
                borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '1.75rem', boxShadow: '0 0 0 8px rgba(108,76,241,0.2)',
                zIndex: 5,
              }}>👤</div>

              {/* Surrounding nodes */}
              {[
                { emoji: '⚡', label: 'Python', top: '10%', left: '45%', bg: 'var(--cx-lime)', tc: '#2d4a0a' },
                { emoji: '📦', label: 'Calculator', top: '40%', right: '5%', bg: 'var(--cx-sky)', tc: '#0c3a52' },
                { emoji: '🚀', label: 'Project', bottom: '10%', left: '45%', bg: 'var(--cx-coral)', tc: 'white' },
                { emoji: '👤', label: 'Priya', top: '40%', left: '5%', bg: 'white', tc: 'var(--cx-primary)' },
              ].map(({ emoji, label, bg, tc, ...pos }) => (
                <div key={label} style={{
                  position: 'absolute', ...pos,
                  background: bg, color: tc,
                  width: 52, height: 52,
                  borderRadius: '50%',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  fontSize: '1.25rem',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
                  zIndex: 4,
                }}>
                  {emoji}
                </div>
              ))}

              {/* Connection lines (decorative) */}
              <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', zIndex: 1 }} viewBox="0 0 280 280">
                <line x1="140" y1="140" x2="168" y2="35" stroke="rgba(199,243,107,0.5)" strokeWidth="2" strokeDasharray="4 3" />
                <line x1="140" y1="140" x2="262" y2="140" stroke="rgba(113,200,247,0.5)" strokeWidth="2" strokeDasharray="4 3" />
                <line x1="140" y1="140" x2="168" y2="250" stroke="rgba(255,121,104,0.5)" strokeWidth="2" strokeDasharray="4 3" />
                <line x1="140" y1="140" x2="18" y2="140" stroke="rgba(255,255,255,0.3)" strokeWidth="2" strokeDasharray="4 3" />
              </svg>
            </div>
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ────────────────────────────────────────── */}
      <section style={{ background: 'var(--cx-bg)', padding: '6rem max(2rem, calc((100% - 1200px) / 2 + 2rem))', textAlign: 'center' }}>
        <h2 style={{ marginBottom: '1rem', letterSpacing: '-0.5px' }}>
          Someone on your campus already<br />knows something you need.
        </h2>
        <p style={{ color: 'var(--cx-text-secondary)', fontSize: '1.0625rem', maxWidth: 480, margin: '0 auto 2rem' }}>
          Join CampusX and discover the skills, resources, and people that are already all around you.
        </p>
        <Link to="/register" className="btn btn-primary btn-lg">
          Find Your People <ArrowRight size={18} />
        </Link>
      </section>

      {/* ── FOOTER ──────────────────────────────────────────── */}
      <footer style={{
        background: 'var(--cx-sidebar-bg)',
        padding: '3rem max(2rem, calc((100% - 1200px) / 2 + 2rem)) 2rem',
        borderTop: '1px solid rgba(255,255,255,0.07)',
      }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '2rem', marginBottom: '2rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.875rem' }}>
              <div className="sidebar-logo-icon" style={{ width: 28, height: 28, fontSize: '0.8rem' }}>CX</div>
              <span style={{ color: 'white', fontWeight: 800 }}>CampusX</span>
            </div>
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.875rem', lineHeight: 1.6 }}>
              Your campus. Your skills. Your next big thing.
            </p>
          </div>
          {[
            { heading: 'Product', links: ['SkillSwap', 'Borrow Hub', 'Skill Graph', 'Dream Team'] },
            { heading: 'Support', links: ['Help Center', 'Contact Us', 'Community Rules'] },
            { heading: 'Legal', links: ['Privacy Policy', 'Terms of Service', 'Cookie Policy'] },
          ].map(({ heading, links }) => (
            <div key={heading}>
              <h6 style={{ color: 'rgba(255,255,255,0.5)', marginBottom: '0.875rem', letterSpacing: '0.05em', textTransform: 'uppercase', fontSize: '0.6875rem' }}>{heading}</h6>
              <ul style={{ listStyle: 'none' }}>
                {links.map((l) => (
                  <li key={l} style={{ marginBottom: '0.5rem' }}>
                    <a href="#" style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.9375rem', transition: 'color 0.2s' }}
                      onMouseOver={e => (e.currentTarget.style.color = 'white')}
                      onMouseOut={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.55)')}
                    >{l}</a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div style={{
          borderTop: '1px solid rgba(255,255,255,0.07)',
          paddingTop: '1.5rem',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem',
        }}>
          <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.8125rem' }}>
            © 2024 CampusX. CampusX is a student community platform. We do not facilitate financial transactions.
          </p>
          <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.8125rem' }}>
            Built for students, by students. 🎓
          </p>
        </div>
      </footer>

      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-12px); }
        }
        @media (max-width: 768px) {
          .landing-hero > div > div { grid-template-columns: 1fr !important; }
          .landing-hero > div > div > div:last-child { display: none !important; }
          section > div[style*='grid-template-columns: 1fr 1fr'] { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}
