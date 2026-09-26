import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MessageSquare, Users, Send } from 'lucide-react';
import { request } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useWorkspace } from '../../context/WorkspaceContext';
import { useSocket } from '../../context/SocketContext';

const Chat = () => {
  const { user } = useAuth();
  const { activeWorkspace, members } = useWorkspace();
  const { socket, onlineUsers } = useSocket();

  const [generalConv, setGeneralConv] = useState(null);
  const [activeConv, setActiveConv] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [typingUser, setTypingUser] = useState(null);

  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  // Initialize general chat & direct conversations
  const initConversations = useCallback(async () => {
    if (!activeWorkspace) return;
    try {
      const gen = await request('/conversations/workspace-general');
      setGeneralConv(gen);

      // Default to general chat if no active conversation
      if (!activeConv) {
        setActiveConv(gen);
      }
    } catch (err) {
      console.error('Failed to init conversations:', err);
    }
  }, [activeWorkspace, activeConv]);

  useEffect(() => {
    initConversations();
  }, [initConversations]);

  // Fetch messages for active conversation
  const fetchMessages = useCallback(async () => {
    if (!activeConv) return;
    try {
      const data = await request(`/conversations/${activeConv.id}/messages`);
      setMessages(data);
      scrollToBottom();
    } catch (err) {
      console.error('Failed to fetch messages:', err);
    }
  }, [activeConv]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 50);
  };

  // Socket room joining and listeners
  useEffect(() => {
    if (!socket || !activeConv) return;

    socket.emit('chat:join', { conversationId: activeConv.id });

    socket.on('message:new', (msg) => {
      if (msg.conversationId === activeConv.id) {
        setMessages((prev) => [...prev, msg]);
        scrollToBottom();
      }
    });

    socket.on('typing:update', ({ conversationId, userId, name, isTyping: typingStatus }) => {
      if (conversationId === activeConv.id && userId !== user?.id) {
        setTypingUser(typingStatus ? name : null);
      }
    });

    return () => {
      socket.emit('chat:leave', { conversationId: activeConv.id });
      socket.off('message:new');
      socket.off('typing:update');
    };
  }, [socket, activeConv, user]);

  const handleSendMessage = async (e) => {
    if (e) e.preventDefault();
    if (!text.trim() || !activeConv) return;

    const messageText = text.trim();
    setText('');

    // Emit stop typing
    if (socket) {
      socket.emit('typing:stop', { conversationId: activeConv.id });
    }

    try {
      if (socket && socket.connected) {
        socket.emit('message:send', {
          conversationId: activeConv.id,
          text: messageText,
        });
      } else {
        // Fallback to REST
        const created = await request(`/conversations/${activeConv.id}/messages`, {
          method: 'POST',
          body: JSON.stringify({ text: messageText }),
        });
        setMessages((prev) => [...prev, created]);
        scrollToBottom();
      }
    } catch (err) {
      console.error('Send message failed:', err);
    }
  };

  const handleTextChange = (e) => {
    setText(e.target.value);
    if (!socket || !activeConv) return;

    if (!isTyping) {
      setIsTyping(true);
      socket.emit('typing:start', { conversationId: activeConv.id });
    }

    clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      socket.emit('typing:stop', { conversationId: activeConv.id });
    }, 2000);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleStartDirectChat = async (targetUserId) => {
    try {
      const direct = await request('/conversations/direct', {
        method: 'POST',
        body: JSON.stringify({ targetUserId }),
      });
      setActiveConv(direct);
      initConversations();
    } catch (err) {
      console.error('Failed to start direct conversation:', err);
    }
  };

  // Other members for DM list
  const otherMembers = members.filter((m) => m.userId !== user?.id);

  return (
    <div style={{ height: 'calc(100vh - var(--topbar-height) - 48px)', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ marginBottom: 14 }}>
        <div className="terminal-comment">{"// real-time communication"}</div>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--text)', margin: '4px 0 0' }}>
          chat
        </h1>
      </div>

      <div
        style={{
          flex: 1,
          display: 'grid',
          gridTemplateColumns: '260px 1fr',
          backgroundColor: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-card)',
          overflow: 'hidden',
        }}
      >
        {/* Left Channels & Direct Messages Sidebar */}
        <div style={{ borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', backgroundColor: 'var(--bg-sidebar)' }}>
          <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)' }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)' }}>CHANNELS</span>
          </div>

          {/* Workspace General Chat */}
          {generalConv && (
            <div
              onClick={() => setActiveConv(generalConv)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '10px 14px',
                cursor: 'pointer',
                backgroundColor: activeConv?.id === generalConv.id ? 'var(--surface-active)' : 'transparent',
                color: activeConv?.id === generalConv.id ? 'var(--accent)' : 'var(--text)',
                fontFamily: 'var(--font-mono)',
                fontSize: 12.5,
              }}
            >
              <Users size={15} />
              <span># {activeWorkspace?.name || 'Workspace'}</span>
            </div>
          )}

          {/* Direct Messages Section */}
          <div style={{ padding: '16px 14px 8px 14px', borderTop: '1px solid var(--border)' }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)' }}>DIRECT MESSAGES</span>
          </div>

          <div style={{ flex: 1, overflowY: 'auto' }}>
            {otherMembers.length === 0 ? (
              <div style={{ padding: '12px 14px', fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                No other members yet. Invite a collaborator!
              </div>
            ) : (
              otherMembers.map((m) => {
                const isOnline = onlineUsers[m.userId];
                return (
                  <div
                    key={m.userId}
                    onClick={() => handleStartDirectChat(m.userId)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 14px',
                      cursor: 'pointer',
                      fontFamily: 'var(--font-mono)',
                      fontSize: 12,
                      color: 'var(--text)',
                      transition: 'background-color 0.15s ease',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: '50%',
                          backgroundColor: isOnline ? 'var(--success)' : 'var(--border)',
                        }}
                      />
                      <span>{m.name}</span>
                    </div>
                    <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{m.role}</span>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Active Conversation Pane */}
        <div style={{ display: 'flex', flexDirection: 'column', backgroundColor: 'var(--bg)' }}>
          {/* Header */}
          <div
            style={{
              padding: '12px 20px',
              borderBottom: '1px solid var(--border)',
              backgroundColor: 'var(--surface)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <MessageSquare size={16} style={{ color: 'var(--accent)' }} />
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 600 }}>
                {activeConv?.type === 'workspace' ? `# ${activeConv.name || 'Workspace Chat'}` : 'Direct Conversation'}
              </span>
            </div>
            {typingUser && (
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--accent)' }}>
                {typingUser} is typing...
              </span>
            )}
          </div>

          {/* Messages Stream */}
          <div style={{ flex: 1, padding: '20px 24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 14 }}>
            {messages.length === 0 ? (
              <div style={{ margin: 'auto', textAlign: 'center', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: 12 }}>
                {"// start of conversation"}
                <div style={{ marginTop: 6 }}>Send a message to begin real-time collaboration.</div>
              </div>
            ) : (
              messages.map((msg) => {
                const isMe = msg.senderId?._id === user?.id || msg.senderId === user?.id;
                return (
                  <div
                    key={msg._id}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: isMe ? 'flex-end' : 'flex-start',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 3 }}>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 600, color: isMe ? 'var(--accent)' : 'var(--text)' }}>
                        {isMe ? 'you' : msg.senderId?.name || 'Someone'}
                      </span>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-subtle)' }}>
                        {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    <div
                      style={{
                        maxWidth: '70%',
                        padding: '8px 14px',
                        borderRadius: 6,
                        backgroundColor: isMe ? 'var(--surface-active)' : 'var(--surface)',
                        border: '1px solid var(--border)',
                        color: 'var(--text)',
                        fontSize: 13,
                        lineHeight: 1.45,
                        wordBreak: 'break-word',
                      }}
                    >
                      {msg.text}
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Box */}
          <div style={{ padding: '12px 18px', borderTop: '1px solid var(--border)', backgroundColor: 'var(--surface)' }}>
            <form onSubmit={handleSendMessage} style={{ display: 'flex', gap: 10 }}>
              <input
                type="text"
                placeholder="Type a message (Enter to send, Shift+Enter for newline)..."
                value={text}
                onChange={handleTextChange}
                onKeyDown={handleKeyDown}
                style={{ flex: 1, padding: '10px 14px', fontSize: 12.5 }}
                autoFocus
              />
              <button type="submit" className="btn-command accent" style={{ padding: '8px 14px' }}>
                <Send size={14} />
                <span>[ send ]</span>
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Chat;
