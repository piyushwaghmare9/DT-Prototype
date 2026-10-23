import React, { useState, useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  MarkerType,
  type Node,
  type Edge,
} from 'reactflow';
import 'reactflow/dist/style.css';
import {
  Layers,
  Search,
  Filter,
  Sparkles,
  Users,
  Zap,
  Package,
  Rocket,
  X,
  ExternalLink,
  BookOpen,
  ArrowRight,
  List,
  Eye,
  CheckCircle,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuthStore } from '../store/authStore';

const NODE_COLORS: Record<string, { bg: string; border: string; text: string; icon: string }> = {
  student: { bg: '#EDE9FE', border: '#6C4CF1', text: '#4F35C8', icon: '👤' },
  skill: { bg: '#F2FCE2', border: '#84CC16', text: '#3F6212', icon: '⚡' },
  resource: { bg: '#E0F2FE', border: '#0EA5E9', text: '#0369A1', icon: '📦' },
  project: { bg: '#FEF3C7', border: '#F59E0B', text: '#B45309', icon: '🚀' },
};

const DEPARTMENTS = [
  'All Departments',
  'Computer Science',
  'Electronics & Comm',
  'Mechanical',
  'Civil',
  'Electrical',
  'Information Technology',
  'Design',
  'Business / MBA',
];

export default function SkillGraphPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [viewMode, setViewMode] = useState<'graph' | 'list'>('graph');
  const [selectedDept, setSelectedDept] = useState('All Departments');
  const [typeFilters, setTypeFilters] = useState<Record<string, boolean>>({
    student: true,
    skill: true,
    resource: true,
    project: true,
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [activeNode, setActiveNode] = useState<any | null>(null);

  // Fetch Graph data from backend
  const { data: graphData, isLoading } = useQuery({
    queryKey: ['skill-graph', selectedDept, typeFilters],
    queryFn: async () => {
      const activeTypes = Object.entries(typeFilters)
        .filter(([_, active]) => active)
        .map(([type]) => type)
        .join(',');

      const params: any = {};
      if (selectedDept !== 'All Departments') params.department = selectedDept;
      if (activeTypes) params.node_types = activeTypes;

      const res = await api.get('/graph/nodes', { params });
      return res.data;
    },
  });

  // Fetch smart peer recommendations
  const { data: recommendations } = useQuery({
    queryKey: ['graph-recommendations'],
    queryFn: async () => {
      try {
        const res = await api.get('/graph/recommendations');
        return res.data?.recommendations || [];
      } catch {
        return [];
      }
    },
  });

  // Format ReactFlow Nodes & Edges
  const { flowNodes, flowEdges } = useMemo(() => {
    if (!graphData?.nodes || graphData.nodes.length === 0) {
      return { flowNodes: [], flowEdges: [] };
    }

    // Convert API nodes to ReactFlow nodes
    const rawNodes = graphData.nodes || [];
    const rawEdges = graphData.edges || [];

    // Layout in concentric / force circle rings
    const count = rawNodes.length;
    const radius = Math.min(450, Math.max(220, count * 35));
    const centerX = 400;
    const centerY = 300;

    const mappedNodes: Node[] = rawNodes.map((n: any, idx: number) => {
      const angle = (idx / (count || 1)) * 2 * Math.PI;
      const x = centerX + radius * Math.cos(angle);
      const y = centerY + radius * Math.sin(angle);
      const cfg = NODE_COLORS[n.type] || NODE_COLORS.skill;

      const isMe = n.data?.user_id === user?.id;

      return {
        id: n.id,
        position: { x, y },
        data: {
          label: `${cfg.icon} ${n.label || n.data?.name || 'Node'}`,
          raw: n,
        },
        style: {
          background: isMe ? 'linear-gradient(135deg, #6C4CF1, #8B6FF5)' : cfg.bg,
          color: isMe ? '#FFFFFF' : cfg.text,
          border: `2px solid ${isMe ? '#4F35C8' : cfg.border}`,
          borderRadius: 14,
          padding: '10px 14px',
          fontWeight: 700,
          fontSize: '12px',
          cursor: 'pointer',
          boxShadow: isMe ? '0 8px 24px rgba(108, 76, 241, 0.35)' : 'var(--cx-shadow-sm)',
        },
      };
    });

    const mappedEdges: Edge[] = rawEdges.map((e: any, idx: number) => ({
      id: e.id || `edge-${idx}`,
      source: e.source,
      target: e.target,
      label: e.label || '',
      animated: e.type === 'wants' || e.type === 'interest',
      style: {
        stroke: e.type === 'teaches' ? '#84CC16' : e.type === 'wants' ? '#6C4CF1' : '#0EA5E9',
        strokeWidth: 2,
      },
      markerEnd: { type: MarkerType.ArrowClosed, color: '#6C4CF1' },
    }));

    return { flowNodes: mappedNodes, flowEdges: mappedEdges };
  }, [graphData, user]);

  const [nodes, setNodes, onNodesChange] = useNodesState(flowNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(flowEdges);

  // Sync state when real graph data arrives from backend API
  React.useEffect(() => {
    setNodes(flowNodes);
    setEdges(flowEdges);
  }, [flowNodes, flowEdges, setNodes, setEdges]);

  // Handle node click
  const onNodeClick = useCallback((_: any, node: Node) => {
    setActiveNode(node.data?.raw || node);
  }, []);

  const toggleFilter = (type: string) => {
    setTypeFilters((prev) => ({ ...prev, [type]: !prev[type] }));
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 120px)' }}>
      {/* Top Header & Controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
            <span style={{ fontSize: '1.75rem' }}>🕸️</span>
            <h1 style={{ fontSize: '1.65rem', fontWeight: 800 }}>Campus Skill Graph</h1>
          </div>
          <p style={{ color: 'var(--cx-text-secondary)', fontSize: '0.875rem' }}>
            Visual map of peer skills, available resources, and active projects across campus.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {/* View Toggle */}
          <div style={{ display: 'flex', background: 'var(--cx-bg)', padding: '4px', borderRadius: 'var(--cx-radius)', border: '1px solid var(--cx-border)' }}>
            <button
              onClick={() => setViewMode('graph')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
                padding: '6px 12px',
                borderRadius: 'var(--cx-radius-sm)',
                border: 'none',
                background: viewMode === 'graph' ? 'var(--cx-primary)' : 'transparent',
                color: viewMode === 'graph' ? '#fff' : 'var(--cx-text-secondary)',
                fontWeight: 600,
                fontSize: '0.8125rem',
                cursor: 'pointer',
              }}
            >
              <Layers size={15} /> Graph
            </button>
            <button
              onClick={() => setViewMode('list')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
                padding: '6px 12px',
                borderRadius: 'var(--cx-radius-sm)',
                border: 'none',
                background: viewMode === 'list' ? 'var(--cx-primary)' : 'transparent',
                color: viewMode === 'list' ? '#fff' : 'var(--cx-text-secondary)',
                fontWeight: 600,
                fontSize: '0.8125rem',
                cursor: 'pointer',
              }}
            >
              <List size={15} /> Directory
            </button>
          </div>

          <select
            className="form-select"
            style={{ minWidth: 170, fontSize: '0.8125rem', padding: '0.45rem 0.75rem' }}
            value={selectedDept}
            onChange={(e) => setSelectedDept(e.target.value)}
          >
            {DEPARTMENTS.map((dept) => (
              <option key={dept} value={dept}>{dept}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Filter Chips Bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1rem', background: 'var(--cx-bg-card)', padding: '0.625rem 1rem', borderRadius: 'var(--cx-radius)', border: '1px solid var(--cx-border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--cx-text-secondary)', marginRight: '0.25rem' }}>Filters:</span>
          {Object.entries({
            student: { label: 'Students', icon: Users, color: '#6C4CF1' },
            skill: { label: 'Skills', icon: Zap, color: '#84CC16' },
            resource: { label: 'Resources', icon: Package, color: '#0EA5E9' },
            project: { label: 'Projects', icon: Rocket, color: '#F59E0B' },
          }).map(([key, item]) => {
            const active = typeFilters[key];
            const Icon = item.icon;
            return (
              <button
                key={key}
                onClick={() => toggleFilter(key)}
                className="badge"
                style={{
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  padding: '0.35rem 0.75rem',
                  borderRadius: 'var(--cx-radius-full)',
                  border: active ? `1.5px solid ${item.color}` : '1.5px solid var(--cx-border)',
                  background: active ? `${item.color}15` : 'transparent',
                  color: active ? item.color : 'var(--cx-text-muted)',
                  fontWeight: active ? 700 : 500,
                  fontSize: '0.8rem',
                }}
              >
                <Icon size={14} />
                {item.label}
              </button>
            );
          })}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--cx-text-muted)' }}>
            💡 Tip: Click any node to view peer details or initiate exchange
          </span>
        </div>
      </div>

      {/* Main Graph or Directory View */}
      <div style={{ flex: 1, position: 'relative', display: 'flex', gap: '1rem', overflow: 'hidden' }}>
        {viewMode === 'graph' ? (
          <div
            style={{
              flex: 1,
              height: '100%',
              background: '#F9F8FE',
              borderRadius: 'var(--cx-radius)',
              border: '1px solid var(--cx-border)',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onNodeClick={onNodeClick}
              fitView
              attributionPosition="bottom-right"
            >
              <Background color="#D4CFF0" gap={20} size={1.5} />
              <Controls position="top-right" />
              <MiniMap
                nodeColor={(n) => n.style?.background as string || '#6C4CF1'}
                maskColor="rgba(240, 238, 252, 0.7)"
                style={{ height: 100, width: 140, borderRadius: 8 }}
              />
            </ReactFlow>

            {nodes.length === 0 && !isLoading && (
              <div
                style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  textAlign: 'center',
                  background: 'rgba(255, 255, 255, 0.95)',
                  padding: '2rem',
                  borderRadius: 'var(--cx-radius)',
                  boxShadow: 'var(--cx-shadow)',
                  maxWidth: 420,
                  zIndex: 5,
                  border: '1px solid var(--cx-border)',
                }}
              >
                <Sparkles size={36} color="var(--cx-primary)" style={{ margin: '0 auto 1rem' }} />
                <h4 style={{ fontWeight: 700, marginBottom: '0.5rem' }}>Campus Graph is Waiting</h4>
                <p style={{ fontSize: '0.875rem', color: 'var(--cx-text-muted)', marginBottom: '1.25rem' }}>
                  No campus nodes match the selected filters yet. When students register and add skills, they appear here live!
                </p>
                <a href="/skills" className="btn btn-primary" style={{ display: 'inline-flex', padding: '0.5rem 1.25rem', fontSize: '0.875rem' }}>
                  Explore Skills
                </a>
              </div>
            )}

            {/* Quick Floating Match Pill */}
            <div
              style={{
                position: 'absolute',
                bottom: 16,
                left: 16,
                background: 'rgba(255, 255, 255, 0.95)',
                backdropFilter: 'blur(10px)',
                padding: '0.625rem 1rem',
                borderRadius: 'var(--cx-radius)',
                boxShadow: 'var(--cx-shadow)',
                border: '1px solid var(--cx-border)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.625rem',
                fontSize: '0.8125rem',
              }}
            >
              <Sparkles size={16} color="var(--cx-primary)" />
              <span><b>Live Graph:</b> {nodes.length} campus entities mapped</span>
            </div>
          </div>
        ) : (
          /* Directory List View */
          <div
            style={{
              flex: 1,
              background: 'var(--cx-bg-card)',
              borderRadius: 'var(--cx-radius)',
              border: '1px solid var(--cx-border)',
              overflowY: 'auto',
              padding: '1.25rem',
            }}
          >
            <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>Campus Skill & Resource Directory</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
              {(graphData?.nodes || flowNodes.map((n) => n.data.raw || n)).map((item: any, idx: number) => {
                const type = item.type || item.data?.nodeType || 'skill';
                const cfg = NODE_COLORS[type] || NODE_COLORS.skill;
                return (
                  <div
                    key={item.id || idx}
                    className="card"
                    onClick={() => setActiveNode(item)}
                    style={{
                      padding: '1rem',
                      cursor: 'pointer',
                      borderLeft: `4px solid ${cfg.border}`,
                      transition: 'transform var(--cx-transition)',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                      <span className="badge" style={{ background: cfg.bg, color: cfg.text, fontSize: '0.75rem' }}>
                        {cfg.icon} {type.toUpperCase()}
                      </span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--cx-text-muted)' }}>
                        {item.data?.department || item.data?.dept || 'Campus'}
                      </span>
                    </div>
                    <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--cx-text)', marginBottom: '0.35rem' }}>
                      {item.label || item.data?.name || item.data?.label}
                    </div>
                    <div style={{ fontSize: '0.8125rem', color: 'var(--cx-text-secondary)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <span>View details</span>
                      <ArrowRight size={13} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Right Panel: Smart Peer Recommendations */}
        <div
          style={{
            width: 320,
            background: 'var(--cx-bg-card)',
            borderRadius: 'var(--cx-radius)',
            border: '1px solid var(--cx-border)',
            padding: '1.25rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
            overflowY: 'auto',
          }}
          className="hide-mobile"
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Sparkles size={18} color="var(--cx-primary)" />
            <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0 }}>Smart Campus Matches</h3>
          </div>
          <p style={{ fontSize: '0.8rem', color: 'var(--cx-text-secondary)', margin: 0 }}>
            Graph suggestions based on skills you want and offer:
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {recommendations && recommendations.length > 0 ? (
              recommendations.slice(0, 5).map((rec: any, idx: number) => (
                <div
                  key={idx}
                  style={{
                    padding: '0.75rem',
                    borderRadius: 'var(--cx-radius-sm)',
                    background: 'var(--cx-bg)',
                    border: '1px solid var(--cx-border)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                    <div className="avatar avatar-xs" style={{ background: 'var(--cx-primary)', color: 'white' }}>
                      {rec.name?.slice(0, 2).toUpperCase() || 'P'}
                    </div>
                    <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>{rec.name}</span>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--cx-primary)', fontWeight: 600 }}>
                    Offers: {rec.skill_name || 'Technical Guidance'}
                  </div>
                  <button
                    className="btn btn-secondary btn-sm"
                    style={{ width: '100%', marginTop: '0.5rem', fontSize: '0.75rem' }}
                    onClick={() => navigate('/skills')}
                  >
                    View Listing
                  </button>
                </div>
              ))
            ) : (
              <div style={{ textAlign: 'center', padding: '1.5rem 0.5rem' }}>
                <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>🤝</div>
                <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--cx-text)' }}>Complete Your Profile</div>
                <p style={{ fontSize: '0.75rem', color: 'var(--cx-text-secondary)', marginTop: '0.25rem' }}>
                  Add your skills offered and wanted in Settings to unlock AI matches.
                </p>
                <button
                  className="btn btn-primary btn-sm"
                  style={{ marginTop: '0.5rem', fontSize: '0.75rem' }}
                  onClick={() => navigate('/settings')}
                >
                  Update Skills
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Node Detail Drawer / Modal */}
      {activeNode && (
        <div className="modal-overlay" onClick={() => setActiveNode(null)}>
          <div className="modal" style={{ maxWidth: 440 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: 'var(--cx-radius)',
                    background: 'var(--cx-primary-subtle)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.25rem',
                  }}
                >
                  {NODE_COLORS[activeNode.type || activeNode.data?.nodeType]?.icon || '💡'}
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.1rem' }}>
                    {activeNode.label || activeNode.data?.name || activeNode.data?.label}
                  </h3>
                  <span className="badge badge-primary" style={{ fontSize: '0.7rem' }}>
                    {(activeNode.type || activeNode.data?.nodeType || 'node').toUpperCase()}
                  </span>
                </div>
              </div>
              <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setActiveNode(null)}>
                <X size={18} />
              </button>
            </div>

            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ background: 'var(--cx-bg)', padding: '1rem', borderRadius: 'var(--cx-radius)' }}>
                <div style={{ fontSize: '0.8125rem', color: 'var(--cx-text-secondary)', marginBottom: '0.25rem' }}>
                  Campus Affiliation
                </div>
                <div style={{ fontWeight: 600 }}>
                  {activeNode.data?.department || activeNode.data?.dept || 'Engineering & Computing'}
                </div>
              </div>

              {activeNode.type === 'student' || activeNode.data?.nodeType === 'student' ? (
                <div>
                  <p style={{ fontSize: '0.875rem', color: 'var(--cx-text-secondary)', lineHeight: 1.5 }}>
                    Connect with this student for peer mentoring, study sessions, or collaborative project teaming.
                  </p>
                  <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
                    <button
                      className="btn btn-primary"
                      style={{ flex: 1 }}
                      onClick={() => {
                        setActiveNode(null);
                        navigate('/skills');
                      }}
                    >
                      <Zap size={15} /> Find Skills
                    </button>
                    <button
                      className="btn btn-secondary"
                      style={{ flex: 1 }}
                      onClick={() => {
                        setActiveNode(null);
                        navigate('/messages');
                      }}
                    >
                      Message
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <p style={{ fontSize: '0.875rem', color: 'var(--cx-text-secondary)', lineHeight: 1.5 }}>
                    This entity is linked into the CampusX knowledge graph. Explore related listings or create an exchange request.
                  </p>
                  <button
                    className="btn btn-primary"
                    style={{ width: '100%', marginTop: '1rem' }}
                    onClick={() => {
                      setActiveNode(null);
                      if (activeNode.type === 'resource') navigate('/borrow');
                      else if (activeNode.type === 'project') navigate('/dream-team');
                      else navigate('/skills');
                    }}
                  >
                    Open Hub Page
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
