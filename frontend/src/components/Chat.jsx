import React, { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';

const Chat = ({ user, roomId }) => {
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [typingUsers, setTypingUsers] = useState([]);
  const messagesEndRef = useRef(null);
  const socketRef = useRef();
  const typingTimeoutRef = useRef();

  // Use environment variable for Socket URL
  const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'https://codecollab-backend-omu2.onrender.com';

  useEffect(() => {
    if (!user || !roomId || roomId === 'lobby') return;

    console.log('💬 Chat mounting for room:', roomId);
    
    // Connect to socket
    socketRef.current = io(SOCKET_URL, {
      withCredentials: true,
      transports: ['websocket', 'polling']
    });

    socketRef.current.on('connect', () => {
      console.log('✅ Chat socket connected');
      socketRef.current.emit('join-chat', { 
        roomId, 
        userId: user._id, 
        username: user.username 
      });
    });

    socketRef.current.on('chat-message', (message) => {
      console.log('📨 New message:', message);
      setMessages(prev => [...prev, message]);
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

    // System notifications for join/leave
    socketRef.current.on('user-joined-notification', ({ username }) => {
      setMessages(prev => [...prev, {
        id: Date.now(),
        text: `${username} joined the room.`,
        username: 'System',
        userId: 'system',
        timestamp: new Date().toISOString(),
        isSystem: true
      }]);
    });

    socketRef.current.on('user-left-notification', ({ username }) => {
      setMessages(prev => [...prev, {
        id: Date.now(),
        text: `${username} left the room.`,
        username: 'System',
        userId: 'system',
        timestamp: new Date().toISOString(),
        isSystem: true
      }]);
    });

    return () => {
      console.log('💬 Chat unmounting');
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [roomId, user?._id, user?.username]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = () => {
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
      
      // Stop typing indicator after sending
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      socketRef.current.emit('typing', { roomId, isTyping: false, username: user.username });
    }
  };

  const handleTyping = (e) => {
    setInputMessage(e.target.value);
    
    if (!socketRef.current) return;
    
    // Clear previous timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    // Send typing started
    socketRef.current.emit('typing', { roomId, isTyping: true, username: user.username });
    
    // Set timeout to stop typing after 2 seconds of no input
    typingTimeoutRef.current = setTimeout(() => {
      socketRef.current.emit('typing', { roomId, isTyping: false, username: user.username });
    }, 2000);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (roomId === 'lobby') {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        background: '#f5f5f5',
        color: '#888'
      }}>
        💬 Join a room to start chatting
      </div>
    );
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      background: 'white'
    }}>
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '16px',
        background: '#f5f5f5'
      }}>
        {messages.length === 0 ? (
          <div style={{
            textAlign: 'center',
            color: '#999',
            padding: '40px'
          }}>
            💬 No messages yet. Start chatting!
          </div>
        ) : (
          messages.map((msg) => {
            if (msg.userId === 'system') {
              return (
                <div key={msg.id} style={{
                  textAlign: 'center',
                  color: '#888',
                  fontSize: '12px',
                  margin: '8px 0',
                  fontStyle: 'italic'
                }}>
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
                  marginBottom: '12px',
                  justifyContent: isOwnMessage ? 'flex-end' : 'flex-start'
                }}
              >
                {!isOwnMessage && (
                  <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    background: '#667eea',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontWeight: 'bold',
                    marginRight: '8px',
                    flexShrink: 0
                  }}>
                    {msg.username?.charAt(0).toUpperCase() || '?'}
                  </div>
                )}
                
                <div style={{
                  maxWidth: '70%',
                  background: isOwnMessage ? '#4CAF50' : 'white',
                  color: isOwnMessage ? 'white' : '#333',
                  padding: '8px 12px',
                  borderRadius: isOwnMessage ? '12px 12px 4px 12px' : '12px 12px 12px 4px',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
                }}>
                  {!isOwnMessage && (
                    <div style={{
                      fontSize: '11px',
                      fontWeight: 'bold',
                      marginBottom: '4px',
                      color: '#667eea'
                    }}>
                      {msg.username}
                    </div>
                  )}
                  <div style={{ wordWrap: 'break-word' }}>{msg.text}</div>
                  <div style={{
                    fontSize: '10px',
                    marginTop: '4px',
                    opacity: 0.7,
                    textAlign: 'right'
                  }}>
                    {formatTime(msg.timestamp)}
                  </div>
                </div>
                
                {isOwnMessage && (
                  <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    background: '#4CAF50',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontWeight: 'bold',
                    marginLeft: '8px',
                    flexShrink: 0
                  }}>
                    {user.username?.charAt(0).toUpperCase() || '?'}
                  </div>
                )}
              </div>
            );
          })
        )}
        
        {typingUsers.length > 0 && (
          <div style={{
            padding: '4px 12px',
            color: '#999',
            fontSize: '12px',
            fontStyle: 'italic'
          }}>
            {typingUsers.join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing...
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      <div style={{
        padding: '12px',
        background: 'white',
        borderTop: '1px solid #ddd',
        display: 'flex',
        gap: '8px'
      }}>
        <input
          type="text"
          value={inputMessage}
          onChange={handleTyping}
          onKeyPress={handleKeyPress}
          placeholder="Type a message..."
          style={{
            flex: 1,
            padding: '10px',
            border: '1px solid #ddd',
            borderRadius: '20px',
            outline: 'none',
            fontSize: '14px'
          }}
        />
        <button
          onClick={sendMessage}
          style={{
            padding: '8px 20px',
            background: '#4CAF50',
            color: 'white',
            border: 'none',
            borderRadius: '20px',
            cursor: 'pointer',
            fontWeight: 'bold'
          }}
        >
          Send
        </button>
      </div>
    </div>
  );
};

export default Chat;