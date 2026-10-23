import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import {
  Users, Search, Filter, ShieldCheck, Zap, BookOpen,
  MessageSquare, User as UserIcon, ArrowRight, Loader, X, Sparkles
} from 'lucide-react';
import api from '../services/api';
import { useAuthStore } from '../store/authStore';

const DEPARTMENTS = [
  'All',
  'Computer Science',
  'Information Technology',
  'Electronics & Communication',
  'Electrical Engineering',
  'Mechanical Engineering',
  'Civil Engineering',
  'Chemical Engineering',
  'MBA',
  'MCA',
  'BCA',
  'Other',
];

const YEARS = ['All', '1st Year', '2nd Year', '3rd Year', '4th Year', '5th Year', 'Postgraduate'];

export default function PeoplePage() {
  const { user: currentUser } = useAuthStore();
  const navigate = useNavigate();

  const [search, setSearch] = useState('');
  const [department, setDepartment] = useState('All');
  const [year, setYear] = useState('All');
  const [page, setPage] = useState(1);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['users', search, department, year, page],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: String(page),
        page_size: '12',
      });
      if (search.trim()) params.set('q', search.trim());
      if (department !== 'All') params.set('department', department);
      if (year !== 'All') params.set('year', year);

      // Endpoint GET /api/users or /api/v1/users
      const res = await api.get(`/users?${params}`);
      return res.data;
    },
  });

  const students = data?.items || [];
  const total = data?.total || 0;
  const pages = data?.pages || 1;

  function clearFilters() {
    setSearch('');
    setDepartment('All');
    setYear('All');
    setPage(1);
  }

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto' }}>
      {/* Page Header */}
      <div style={{
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '1rem',
        marginBottom: '1.75rem',
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '0.25rem' }}>
            <span style={{ fontSize: '1.75rem' }}>👥</span>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 800, margin: 0 }}>Campus Directory</h1>
          </div>
          <p style={{ color: 'var(--cx-text-secondary)', margin: 0 }}>
            Connect with students, exchange skills, and build your campus network
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span className="badge badge-primary" style={{ padding: '0.45rem 0.875rem', fontSize: '0.85rem' }}>
            <Sparkles size={14} style={{ marginRight: 4 }} />
            {total} Registered {total === 1 ? 'Student' : 'Students'}
          </span>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="card" style={{ padding: '1.25rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Search bar */}
          <div className="search-bar" style={{ flex: 2, minWidth: 240 }}>
            <Search size={16} className="search-icon" />
            <input
              className="search-input"
              placeholder="Search by student name, bio, or skills..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
            {search && (
              <button
                className="btn btn-ghost btn-icon btn-sm"
                onClick={() => setSearch('')}
                style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)' }}
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Department Filter */}
          <div style={{ flex: 1, minWidth: 160 }}>
            <select
              className="form-select"
              value={department}
              onChange={(e) => {
                setDepartment(e.target.value);
                setPage(1);
              }}
            >
              <option value="All">All Departments</option>
              {DEPARTMENTS.slice(1).map((dept) => (
                <option key={dept} value={dept}>{dept}</option>
              ))}
            </select>
          </div>

          {/* Academic Year Filter */}
          <div style={{ flex: 1, minWidth: 140 }}>
            <select
              className="form-select"
              value={year}
              onChange={(e) => {
                setYear(e.target.value);
                setPage(1);
              }}
            >
              <option value="All">All Years</option>
              {YEARS.slice(1).map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>

          {(search || department !== 'All' || year !== 'All') && (
            <button className="btn btn-ghost btn-sm" onClick={clearFilters} style={{ whiteSpace: 'nowrap' }}>
              <X size={14} /> Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Loading state */}
      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '4rem 1rem' }}>
          <Loader size={36} className="animate-spin" style={{ color: 'var(--cx-primary)', margin: '0 auto 1rem' }} />
          <p style={{ color: 'var(--cx-text-secondary)', fontSize: '0.95rem' }}>Loading campus students from MongoDB...</p>
        </div>
      ) : isError ? (
        <div className="card" style={{ textAlign: 'center', padding: '3.5rem 2rem' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>⚠️</div>
          <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>Failed to load students</h3>
          <p style={{ color: 'var(--cx-text-secondary)', maxWidth: 450, margin: '0 auto 1.25rem' }}>
            {error instanceof Error ? error.message : 'Database connection error. Please try again.'}
          </p>
          <button className="btn btn-primary btn-sm" onClick={() => refetch()}>
            Retry Connection
          </button>
        </div>
      ) : students.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔍</div>
          <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>No students match your criteria</h3>
          <p style={{ color: 'var(--cx-text-secondary)', maxWidth: 400, margin: '0 auto 1.5rem' }}>
            Try adjusting your search terms, department, or year filters.
          </p>
          <button className="btn btn-secondary btn-sm" onClick={clearFilters}>
            View All Students
          </button>
        </div>
      ) : (
        /* Student Cards Grid */
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.25rem' }}>
          {students.map((student: any) => {
            const myId = currentUser?.id || currentUser?._id;
            const studentId = student.id || student._id;
            const isMe = Boolean(myId && studentId && String(myId) === String(studentId));
            const initials = student.full_name
              ? student.full_name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()
              : '??';

            return (
              <div
                key={student.id || student._id}
                className="card card-clickable"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  padding: '1.5rem',
                  border: isMe ? '2px solid var(--cx-primary)' : '1px solid var(--cx-border)',
                  position: 'relative',
                  transition: 'transform var(--cx-transition), box-shadow var(--cx-transition)',
                }}
              >
                {/* Header: Avatar, Name, Badges */}
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.875rem', marginBottom: '0.875rem' }}>
                  <div
                    className="avatar avatar-md"
                    style={{
                      background: isMe
                        ? 'linear-gradient(135deg, var(--cx-primary), #8B6FF5)'
                        : 'linear-gradient(135deg, #4F35C8, #71C8F7)',
                      color: 'white',
                      fontWeight: 700,
                      flexShrink: 0,
                    }}
                  >
                    {student.avatar_url ? (
                      <img
                        src={student.avatar_url}
                        alt={student.full_name}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        onError={(e) => { (e.currentTarget as HTMLElement).style.display = 'none'; }}
                      />
                    ) : initials}
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0, color: 'var(--cx-text)' }}>
                        {student.full_name}
                      </h3>
                      {isMe && (
                        <span className="badge badge-primary" style={{ fontSize: '0.7rem', padding: '0.15rem 0.45rem' }}>
                          You
                        </span>
                      )}
                    </div>

                    <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap', marginTop: '0.35rem' }}>
                      {student.department && (
                        <span className="badge" style={{ background: 'var(--cx-bg)', color: 'var(--cx-text-secondary)', fontSize: '0.725rem' }}>
                          {student.department}
                        </span>
                      )}
                      {student.academic_year && (
                        <span className="badge" style={{ background: 'var(--cx-bg)', color: 'var(--cx-text-muted)', fontSize: '0.725rem' }}>
                          {student.academic_year}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Bio snippet */}
                <p
                  style={{
                    fontSize: '0.85rem',
                    color: student.bio ? 'var(--cx-text-secondary)' : 'var(--cx-text-muted)',
                    fontStyle: student.bio ? 'normal' : 'italic',
                    lineHeight: 1.5,
                    marginBottom: '1rem',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                    flex: 1,
                  } as any}
                >
                  {student.bio || 'CampusX student ready to collaborate and share skills.'}
                </p>

                {/* Skills Offered */}
                <div style={{ marginBottom: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.75rem', fontWeight: 600, color: 'var(--cx-text-muted)', marginBottom: '0.4rem' }}>
                    <Zap size={13} color="var(--cx-primary)" />
                    <span>Skills Offered:</span>
                  </div>
                  {student.skills_offered && student.skills_offered.length > 0 ? (
                    <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                      {student.skills_offered.slice(0, 3).map((skill: any, idx: number) => {
                        const sName = typeof skill === 'string' ? skill : skill.name;
                        return (
                          <span
                            key={idx}
                            className="badge badge-primary"
                            style={{ fontSize: '0.725rem', padding: '0.2rem 0.5rem' }}
                          >
                            {sName}
                          </span>
                        );
                      })}
                      {student.skills_offered.length > 3 && (
                        <span className="badge" style={{ fontSize: '0.725rem', background: 'var(--cx-bg)', color: 'var(--cx-text-muted)' }}>
                          +{student.skills_offered.length - 3} more
                        </span>
                      )}
                    </div>
                  ) : (
                    <span style={{ fontSize: '0.75rem', color: 'var(--cx-text-muted)', fontStyle: 'italic' }}>
                      No skills listed yet
                    </span>
                  )}
                </div>

                {/* Level & XP */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.5rem 0.75rem',
                  background: 'var(--cx-bg)',
                  borderRadius: 'var(--cx-radius)',
                  fontSize: '0.75rem',
                  color: 'var(--cx-text-secondary)',
                  marginBottom: '1rem',
                }}>
                  <span>⭐ Level {student.level || 1}</span>
                  <span>⚡ {student.xp || 0} XP</span>
                  <span>🤝 {student.completed_exchanges || 0} Exchanges</span>
                </div>

                {/* Card Actions */}
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: 'auto' }}>
                  <Link
                    to={`/profile/${student.id || student._id}`}
                    className="btn btn-secondary btn-sm"
                    style={{ flex: 1, textAlign: 'center', textDecoration: 'none' }}
                  >
                    <UserIcon size={14} /> View Profile
                  </Link>

                  {!isMe && (
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={() => navigate(`/messages?user=${student.id || student._id}`)}
                    >
                      <MessageSquare size={14} /> Message
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination Controls */}
      {pages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginTop: '2.5rem', alignItems: 'center' }}>
          <button
            className="btn btn-ghost btn-sm"
            disabled={page === 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Previous
          </button>
          <span style={{ fontSize: '0.85rem', color: 'var(--cx-text-secondary)', padding: '0 0.5rem' }}>
            Page {page} of {pages}
          </span>
          <button
            className="btn btn-ghost btn-sm"
            disabled={page === pages}
            onClick={() => setPage((p) => Math.min(pages, p + 1))}
          >
            Next
          </button>
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
