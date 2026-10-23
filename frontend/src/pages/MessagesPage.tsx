import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import {
  MessageSquare,
  Send,
  Search,
  User as UserIcon,
  Check,
  CheckCheck,
  Clock,
  Sparkles,
  Loader,
  ArrowLeft,
} from 'lucide-react';
import api from '../services/api';
import { useAuthStore } from '../store/authStore';
import { useUIStore } from '../store/uiStore';

interface Message {
  id: string;
  _id?: string;
  sender_id: string;
  recipient_id: string;
  content: string;
  created_at: string;
  is_read: boolean;
}

interface Conversation {
  id: string;
  _id?: string;
  participants: string[];
  last_message?: string;
  last_message_at?: string;
  unread_counts?: Record<string, number>;
  other_participant?: {
    id: string;
    name: string;
    avatar?: string;
    department?: string;
  };
}

export default function MessagesPage() {
  const { user } = useAuthStore();
  const { addToast } = useUIStore();
  const [searchParams] = useSearchParams();
  const qc = useQueryClient();

  const recipientParam = searchParams.get('recipient');
  const [selectedConvId, setSelectedConvId] = useState<string | null>(null);
  const [messageText, setMessageText] = useState('');
  const [search, setSearch] = useState('');
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Load conversations
  const { data: conversations, isLoading: loadingConvs } = useQuery<Conversation[]>({
    queryKey: ['conversations'],
    queryFn: async () => {
      const res = await api.get('/messages/conversations');
      return res.data;
    },
    refetchInterval: 5000,
  });

  // Auto-select conversation or initiate with recipient param
  useEffect(() => {
    if (conversations && conversations.length > 0 && !selectedConvId && !recipientParam) {
      setSelectedConvId(conversations[0].id || conversations[0]._id || null);
    }
  }, [conversations, selectedConvId, recipientParam]);

  // Load messages for selected conversation
  const { data: messageHistory, isLoading: loadingMessages } = useQuery<{
    conversation: Conversation;
    messages: Message[];
  }>({
    queryKey: ['messages', selectedConvId],
    queryFn: async () => {
      if (!selectedConvId) return null;
      const res = await api.get(`/messages/conversations/${selectedConvId}`);
      // Mark read
      api.patch(`/messages/conversations/${selectedConvId}/read`).catch(() => {});
      return res.data;
    },
    enabled: !!selectedConvId,
    refetchInterval: 3000,
  });

  const activeConv = conversations?.find((c) => (c.id || c._id) === selectedConvId);
  const otherParticipant = activeConv?.other_participant;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messageHistory?.messages]);

  // Send message mutation
  const sendMutation = useMutation({
    mutationFn: async (content: string) => {
      if (!otherParticipant?.id) {
        throw new Error('No recipient specified');
      }
      const res = await api.post('/messages/send', {
        recipient_id: otherParticipant.id,
        content,
      });
      return res.data;
    },
    onSuccess: (data) => {
      setMessageText('');
      qc.invalidateQueries({ queryKey: ['messages', selectedConvId] });
      qc.invalidateQueries({ queryKey: ['conversations'] });
    },
    onError: (err: any) => {
      addToast({
        type: 'error',
        title: 'Message failed to send',
        message: err.response?.data?.detail || err.message,
      });
    },
  });

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageText.trim()) return;
    sendMutation.mutate(messageText.trim());
  };

  const filteredConvs = (conversations || []).filter((c) => {
    if (!search) return true;
    const name = c.other_participant?.name || '';
    return name.toLowerCase().includes(search.toLowerCase());
  });

  return (
    <div
      style={{
        display: 'flex',
        height: 'calc(100vh - 120px)',
        background: 'var(--cx-bg-card)',
        borderRadius: 'var(--cx-radius-lg)',
        border: '1px solid var(--cx-border)',
        overflow: 'hidden',
        boxShadow: 'var(--cx-shadow)',
      }}
    >
      {/* Left Sidebar: Conversations List */}
      <div
        style={{
          width: 320,
          borderRight: '1px solid var(--cx-border)',
          display: 'flex',
          flexDirection: 'column',
          background: 'var(--cx-bg-card)',
        }}
      >
        <div style={{ padding: '1rem', borderBottom: '1px solid var(--cx-border)' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <MessageSquare size={20} color="var(--cx-primary)" />
            Messages
          </h2>
          <div style={{ position: 'relative' }}>
            <Search size={16} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--cx-text-muted)' }} />
            <input
              className="form-input"
              style={{ paddingLeft: '2rem', fontSize: '0.8125rem' }}
              placeholder="Search chats..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto' }}>
          {loadingConvs ? (
            <div style={{ textAlign: 'center', padding: '2rem' }}>
              <Loader size={24} className="animate-spin" style={{ color: 'var(--cx-primary)', margin: '0 auto' }} />
            </div>
          ) : filteredConvs.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--cx-text-secondary)' }}>
              <MessageSquare size={32} style={{ margin: '0 auto 0.5rem', opacity: 0.4 }} />
              <p style={{ fontSize: '0.875rem' }}>No conversations yet.</p>
              <p style={{ fontSize: '0.75rem', color: 'var(--cx-text-muted)', marginTop: '0.25rem' }}>
                Request a skill or reach out to peers from the directory!
              </p>
            </div>
          ) : (
            filteredConvs.map((conv) => {
              const cId = conv.id || conv._id;
              const isSelected = cId === selectedConvId;
              const unread = conv.unread_counts?.[user?.id || ''] || 0;
              const other = conv.other_participant;

              return (
                <div
                  key={cId}
                  onClick={() => setSelectedConvId(cId || null)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    padding: '0.875rem 1rem',
                    cursor: 'pointer',
                    background: isSelected ? 'var(--cx-primary-subtle)' : 'transparent',
                    borderLeft: isSelected ? '3px solid var(--cx-primary)' : '3px solid transparent',
                    transition: 'background var(--cx-transition)',
                  }}
                >
                  <div className="avatar avatar-sm" style={{ background: 'var(--cx-primary)', color: 'white', fontWeight: 700 }}>
                    {other?.name?.slice(0, 2).toUpperCase() || 'U'}
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '0.2rem' }}>
                      <span style={{ fontWeight: isSelected ? 700 : 600, fontSize: '0.875rem', color: 'var(--cx-text)' }} className="truncate">
                        {other?.name || 'Campus Student'}
                      </span>
                      {unread > 0 && (
                        <span className="badge badge-primary" style={{ fontSize: '0.7rem', padding: '0.1rem 0.4rem' }}>
                          {unread}
                        </span>
                      )}
                    </div>
                    <p style={{ fontSize: '0.75rem', color: 'var(--cx-text-secondary)', margin: 0 }} className="truncate">
                      {conv.last_message || 'Start conversation...'}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Right Area: Messages Thread */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'var(--cx-bg)' }}>
        {selectedConvId && otherParticipant ? (
          <>
            {/* Header */}
            <div
              style={{
                padding: '0.875rem 1.25rem',
                borderBottom: '1px solid var(--cx-border)',
                background: 'var(--cx-bg-card)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div className="avatar avatar-sm" style={{ background: 'var(--cx-primary)', color: 'white', fontWeight: 700 }}>
                  {otherParticipant.name?.slice(0, 2).toUpperCase() || 'U'}
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>{otherParticipant.name}</h3>
                  <span style={{ fontSize: '0.75rem', color: 'var(--cx-text-secondary)' }}>
                    {otherParticipant.department || 'Campus Student'}
                  </span>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span className="badge badge-success" style={{ fontSize: '0.7rem' }}>
                  ● Peer Verified
                </span>
              </div>
            </div>

            {/* Messages Body */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {loadingMessages ? (
                <div style={{ textAlign: 'center', margin: 'auto' }}>
                  <Loader size={24} className="animate-spin" style={{ color: 'var(--cx-primary)' }} />
                </div>
              ) : (messageHistory?.messages || []).length === 0 ? (
                <div style={{ textAlign: 'center', margin: 'auto', color: 'var(--cx-text-secondary)' }}>
                  <p style={{ fontSize: '0.9rem' }}>Say hello to {otherParticipant.name}! 👋</p>
                  <p style={{ fontSize: '0.75rem', color: 'var(--cx-text-muted)' }}>
                    Coordinate time, meeting spots, exchange details, or project goals.
                  </p>
                </div>
              ) : (
                messageHistory?.messages.map((msg) => {
                  const isMe = msg.sender_id === user?.id;
                  const time = new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

                  return (
                    <div
                      key={msg.id || msg._id}
                      style={{
                        alignSelf: isMe ? 'flex-end' : 'flex-start',
                        maxWidth: '70%',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: isMe ? 'flex-end' : 'flex-start',
                      }}
                    >
                      <div
                        style={{
                          padding: '0.65rem 1rem',
                          borderRadius: isMe ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                          background: isMe ? 'var(--cx-primary)' : 'var(--cx-bg-card)',
                          color: isMe ? '#FFFFFF' : 'var(--cx-text)',
                          fontSize: '0.875rem',
                          lineHeight: 1.5,
                          boxShadow: 'var(--cx-shadow-sm)',
                          border: isMe ? 'none' : '1px solid var(--cx-border)',
                        }}
                      >
                        {msg.content}
                      </div>
                      <span style={{ fontSize: '0.65rem', color: 'var(--cx-text-muted)', marginTop: '0.2rem', padding: '0 0.25rem' }}>
                        {time} {isMe && (msg.is_read ? '✓✓' : '✓')}
                      </span>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Form */}
            <form
              onSubmit={handleSend}
              style={{
                padding: '0.875rem 1.25rem',
                borderTop: '1px solid var(--cx-border)',
                background: 'var(--cx-bg-card)',
                display: 'flex',
                gap: '0.75rem',
                alignItems: 'center',
              }}
            >
              <input
                className="form-input"
                style={{ flex: 1 }}
                placeholder={`Message ${otherParticipant.name}...`}
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
              />
              <button
                type="submit"
                className="btn btn-primary"
                disabled={sendMutation.isPending || !messageText.trim()}
                style={{ borderRadius: 'var(--cx-radius)' }}
              >
                {sendMutation.isPending ? <Loader size={16} className="animate-spin" /> : <Send size={16} />}
              </button>
            </form>
          </>
        ) : (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '1rem', color: 'var(--cx-text-secondary)' }}>
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--cx-primary-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <MessageSquare size={32} color="var(--cx-primary)" />
            </div>
            <h3 style={{ margin: 0, fontSize: '1.2rem' }}>Select a Conversation</h3>
            <p style={{ margin: 0, fontSize: '0.875rem', maxWidth: 300, textAlign: 'center' }}>
              Choose a student from the sidebar to coordinate your skill sessions and loan pickups.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
