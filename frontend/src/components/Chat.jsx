import React, { useState, useEffect, useRef, useCallback } from 'react';
import io from 'socket.io-client';

// Icons
const Icons = {
  Send: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="22" y1="2" x2="11" y2="13" />
      <polygon points="22 2 15 22 11 13 2 9 22 2" />
    </svg>
  ),
  Smile: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M8 14s1.5 2 4 2 4-2 4-2" />
      <line x1="9" y1="9" x2="9.01" y2="9" />
      <line x1="15" y1="9" x2="15.01" y2="9" />
    </svg>
  ),
  MessageCircle: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
    </svg>
  ),
  ArrowDown: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19" />
      <polyline points="19 12 12 19 5 12" />
    </svg>
  ),
};

// Common emojis
const EMOJI_LIST = ['😊', '😂', '🎉', '👍', '❤️', '🔥', '💯', '🚀', '👏', '✨', '🤔', '😎', '💪', '🙌', '😍', '🤣'];

const Chat = ({ user, roomId }) => {
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [typingUsers, setTypingUsers] = useState([]);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const socketRef = useRef();
  const typingTimeoutRef = useRef();
  const isAtBottomRef = useRef(true);

  const SOCKET_URL = import.meta.env.VITE_SOCKET_URL;

  // Scroll handling
  const scrollToBottom = useCallback((behavior = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior });
    setShowScrollButton(false);
    setUnreadCount(0);
  }, []);

  const handleScroll = useCallback(() => {
    if (!messagesContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
    const atBottom = scrollHeight - scrollTop - clientHeight < 100;
    isAtBottomRef.current = atBottom;
    setShowScrollButton(!atBottom);
    if (atBottom) setUnreadCount(0);
  }, []);

  useEffect(() => {
    if (!user || !roomId || roomId === 'lobby') return;

    if (!SOCKET_URL) {
      console.error('VITE_SOCKET_URL is not defined');
      return;
    }
    
    socketRef.current = io(SOCKET_URL, {
      withCredentials: true,
      transports: ['websocket', 'polling']
    });

    socketRef.current.on('connect', () => {
      socketRef.current.emit('join-chat', { 
        roomId, 
        userId: user._id, 
        username: user.username 
      });
    });

    socketRef.current.on('chat-message', (message) => {
      setMessages(prev => [...prev, message]);
      if (!isAtBottomRef.current) {
        setUnreadCount(prev => prev + 1);
      }
    });

    socketRef.current.on('user-typing', ({ username, isTyping }) => {
      setTypingUsers(prev => {
        if (isTyping) {
          if (!prev.includes(username)) return [...prev, username];
        } else {
          return prev.filter(u => u !== username);
        }
        return prev;
      });
    });

    socketRef.current.on('user-joined-notification', ({ username }) => {
      setMessages(prev => [...prev, {
        id: Date.now(),
        text: `${username} joined the room`,
        username: 'System',
        userId: 'system',
        timestamp: new Date().toISOString(),
        isSystem: true
      }]);
    });

    socketRef.current.on('user-left-notification', ({ username }) => {
      setMessages(prev => [...prev, {
        id: Date.now(),
        text: `${username} left the room`,
        username: 'System',
        userId: 'system',
        timestamp: new Date().toISOString(),
        isSystem: true
      }]);
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [roomId, user?._id, user?.username, SOCKET_URL]);

  useEffect(() => {
    if (isAtBottomRef.current) {
      scrollToBottom('auto');
    }
  }, [messages, scrollToBottom]);

  const sendMessage = useCallback(() => {
    if (inputMessage.trim() && socketRef.current) {
      const message = {
        id: Date.now(),
        text: inputMessage,
        username: user.username,
        userId: user._id,
        timestamp: new Date().toISOString()
      };
      
      socketRef.current.emit('chat-message', { roomId, message });
      setInputMessage('');
      setShowEmojiPicker(false);
      
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      socketRef.current.emit('typing', { roomId, isTyping: false, username: user.username });
    }
  }, [inputMessage, roomId, user]);

  const handleTyping = useCallback((e) => {
    setInputMessage(e.target.value);
    
    if (!socketRef.current) return;
    
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    socketRef.current.emit('typing', { roomId, isTyping: true, username: user.username });
    
    typingTimeoutRef.current = setTimeout(() => {
      if (socketRef.current) {
        socketRef.current.emit('typing', { roomId, isTyping: false, username: user.username });
      }
    }, 2000);
  }, [roomId, user.username]);

  const handleKeyPress = useCallback((e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }, [sendMessage]);

  const addEmoji = useCallback((emoji) => {
    setInputMessage(prev => prev + emoji);
  }, []);

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getAvatarColor = (username) => {
    const colors = [
      'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
      'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
      'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
      'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
      'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
    ];
    let hash = 0;
    for (let i = 0; i < username.length; i++) {
      hash = ((hash << 5) - hash) + username.charCodeAt(i);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  if (roomId === 'lobby') {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        background: 'var(--bg-tertiary)',
        color: 'var(--text-tertiary)',
        flexDirection: 'column',
        gap: '12px',
      }}>
        <Icons.MessageCircle />
        <p style={{ fontSize: '13px', margin: 0 }}>Join a room to start chatting</p>
      </div>
    );
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      background: 'var(--bg-tertiary)',
    }}>
      {/* Messages Container */}
      <div
        ref={messagesContainerRef}
        onScroll={handleScroll}
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '12px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
        }}
      >
        {messages.length === 0 ? (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            flex: 1,
            color: 'var(--text-tertiary)',
            gap: '8px',
          }}>
            <Icons.MessageCircle />
            <p style={{ fontSize: '13px', margin: 0 }}>No messages yet. Start the conversation!</p>
          </div>
        ) : (
          messages.map((msg) => {
            if (msg.isSystem) {
              return (
                <div
                  key={msg.id}
                  style={{
                    textAlign: 'center',
                    padding: '4px 12px',
                    fontSize: '11px',
                    color: 'var(--text-tertiary)',
                    fontStyle: 'italic',
                  }}
                >
                  {msg.text}
                </div>
              );
            }

            const isOwnMessage = msg.userId === user._id;

            return (
              <div
                key={msg.id}
                style={{
                  display: 'flex',
                  alignItems: 'flex-end',
                  gap: '8px',
                  justifyContent: isOwnMessage ? 'flex-end' : 'flex-start',
                  animation: 'fadeInUp 0.2s ease',
                }}
              >
                {!isOwnMessage && (
                  <div
                    style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '50%',
                      background: getAvatarColor(msg.username),
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                      fontWeight: 600,
                      fontSize: '11px',
                      flexShrink: 0,
                    }}
                  >
                    {msg.username?.charAt(0).toUpperCase() || '?'}
                  </div>
                )}
                
                <div
                  style={{
                    maxWidth: '75%',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                    alignItems: isOwnMessage ? 'flex-end' : 'flex-start',
                  }}
                >
                  {!isOwnMessage && (
                    <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontWeight: 500 }}>
                      {msg.username}
                    </span>
                  )}
                  <div
                    style={{
                      background: isOwnMessage ? 'var(--primary)' : 'var(--bg-secondary)',
                      color: isOwnMessage ? 'white' : 'var(--text-primary)',
                      padding: '8px 12px',
                      borderRadius: isOwnMessage ? '12px 12px 4px 12px' : '12px 12px 12px 4px',
                      fontSize: '13px',
                      lineHeight: 1.4,
                      wordBreak: 'break-word',
                      border: isOwnMessage ? 'none' : '1px solid var(--border-primary)',
                    }}
                  >
                    {msg.text}
                  </div>
                  <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                    {formatTime(msg.timestamp)}
                  </span>
                </div>

                {isOwnMessage && (
                  <div
                    style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '50%',
                      background: getAvatarColor(user.username),
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                      fontWeight: 600,
                      fontSize: '11px',
                      flexShrink: 0,
                    }}
                  >
                    {user.username?.charAt(0).toUpperCase() || '?'}
                  </div>
                )}
              </div>
            );
          })
        )}
        
        {/* Typing Indicator */}
        {typingUsers.length > 0 && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 0',
          }}>
            <div style={{
              display: 'flex',
              gap: '3px',
              padding: '8px 12px',
              background: 'var(--bg-secondary)',
              borderRadius: '12px',
              border: '1px solid var(--border-primary)',
            }}>
              <span style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                background: 'var(--text-tertiary)',
                animation: 'bounce 1.4s infinite ease-in-out',
                animationDelay: '0s',
              }} />
              <span style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                background: 'var(--text-tertiary)',
                animation: 'bounce 1.4s infinite ease-in-out',
                animationDelay: '0.2s',
              }} />
              <span style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                background: 'var(--text-tertiary)',
                animation: 'bounce 1.4s infinite ease-in-out',
                animationDelay: '0.4s',
              }} />
            </div>
            <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>
              {typingUsers.join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing...
            </span>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Scroll to Bottom Button */}
      {showScrollButton && (
        <button
          onClick={() => scrollToBottom()}
          style={{
            position: 'absolute',
            bottom: '80px',
            right: '20px',
            width: '36px',
            height: '36px',
            borderRadius: '50%',
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border-primary)',
            color: 'var(--text-primary)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: 'var(--shadow-md)',
            transition: 'all var(--transition-fast)',
            zIndex: 10,
          }}
          onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
          onMouseLeave={e => e.currentTarget.style.background = 'var(--bg-elevated)'}
        >
          <Icons.ArrowDown />
          {unreadCount > 0 && (
            <span
              style={{
                position: 'absolute',
                top: '-4px',
                right: '-4px',
                minWidth: '18px',
                height: '18px',
                borderRadius: '9px',
                background: 'var(--primary)',
                color: 'white',
                fontSize: '10px',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '0 4px',
              }}
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </button>
      )}

      {/* Emoji Picker */}
      {showEmojiPicker && (
        <div
          style={{
            position: 'absolute',
            bottom: '70px',
            left: '12px',
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border-primary)',
            borderRadius: '12px',
            padding: '8px',
            display: 'grid',
            gridTemplateColumns: 'repeat(8, 1fr)',
            gap: '4px',
            boxShadow: 'var(--shadow-lg)',
            animation: 'fadeInUp 0.2s ease',
            zIndex: 20,
          }}
        >
          {EMOJI_LIST.map(emoji => (
            <button
              key={emoji}
              onClick={() => addEmoji(emoji)}
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '6px',
                border: 'none',
                background: 'transparent',
                cursor: 'pointer',
                fontSize: '18px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all var(--transition-fast)',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              {emoji}
            </button>
          ))}
        </div>
      )}

      {/* Input Area */}
      <div style={{
        padding: '12px',
        background: 'var(--bg-secondary)',
        borderTop: '1px solid var(--border-primary)',
        display: 'flex',
        gap: '8px',
        alignItems: 'center',
      }}>
        <button
          onClick={() => setShowEmojiPicker(!showEmojiPicker)}
          style={{
            background: showEmojiPicker ? 'var(--bg-hover)' : 'transparent',
            border: 'none',
            color: 'var(--text-tertiary)',
            cursor: 'pointer',
            padding: '8px',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all var(--transition-fast)',
          }}
          onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
          onMouseLeave={e => e.currentTarget.style.background = showEmojiPicker ? 'var(--bg-hover)' : 'transparent'}
        >
          <Icons.Smile />
        </button>

        <input
          type="text"
          value={inputMessage}
          onChange={handleTyping}
          onKeyPress={handleKeyPress}
          placeholder="Type a message..."
          className="input"
          style={{
            flex: 1,
            borderRadius: '20px',
            padding: '10px 16px',
          }}
        />

        <button
          onClick={sendMessage}
          disabled={!inputMessage.trim()}
          style={{
            width: '38px',
            height: '38px',
            borderRadius: '50%',
            background: inputMessage.trim() ? 'var(--primary)' : 'var(--bg-hover)',
            border: 'none',
            color: inputMessage.trim() ? 'white' : 'var(--text-muted)',
            cursor: inputMessage.trim() ? 'pointer' : 'not-allowed',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all var(--transition-fast)',
            flexShrink: 0,
          }}
          onMouseEnter={e => {
            if (inputMessage.trim()) {
              e.currentTarget.style.background = 'var(--primary-hover)';
              e.currentTarget.style.transform = 'scale(1.05)';
            }
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = inputMessage.trim() ? 'var(--primary)' : 'var(--bg-hover)';
            e.currentTarget.style.transform = 'scale(1)';
          }}
        >
          <Icons.Send />
        </button>
      </div>

      <style>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes bounce {
          0%, 80%, 100% {
            transform: translateY(0);
          }
          40% {
            transform: translateY(-6px);
          }
        }
      `}</style>
    </div>
  );
};

export default Chat;
