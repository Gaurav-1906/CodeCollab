import React, { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';

const Chat = ({ user, roomId }) => {
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [typingUsers, setTypingUsers] = useState([]);
  const messagesEndRef = useRef(null);
  const socketRef = useRef();

  useEffect(() => {
    socketRef.current = io('http://localhost:5000');

    socketRef.current.emit('join-chat', { roomId, userId: user._id, username: user.username });

    socketRef.current.on('chat-message', (message) => {
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
      socketRef.current.disconnect();
    };
  }, [roomId, user._id, user.username]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = () => {
    if (inputMessage.trim()) {
      const message = {
        id: Date.now(),
        text: inputMessage,
        username: user.username,
        userId: user._id,
        timestamp: new Date().toISOString()
      };
      
      socketRef.current.emit('chat-message', { roomId, message });
      setInputMessage('');
      socketRef.current.emit('typing', { roomId, isTyping: false });
    }
  };

  const handleTyping = (e) => {
    setInputMessage(e.target.value);
    
    clearTimeout(window.typingTimeout);
    window.typingTimeout = setTimeout(() => {
      socketRef.current.emit('typing', { roomId, isTyping: false });
    }, 2000);
    
    socketRef.current.emit('typing', { roomId, isTyping: true, username: user.username });
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

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
            return (
              <div
                key={msg.id}
                style={{
                  display: 'flex',
                  marginBottom: '12px',
                  justifyContent: msg.userId === user._id ? 'flex-end' : 'flex-start'
                }}
              >
                {msg.userId !== user._id && (
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
                    {msg.username.charAt(0).toUpperCase()}
                  </div>
                )}
                
                <div style={{
                  maxWidth: '70%',
                  background: msg.userId === user._id ? '#4CAF50' : 'white',
                  color: msg.userId === user._id ? 'white' : '#333',
                  padding: '8px 12px',
                  borderRadius: msg.userId === user._id ? '12px 12px 4px 12px' : '12px 12px 12px 4px',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
                }}>
                  {msg.userId !== user._id && (
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
                
                {msg.userId === user._id && (
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
                    {user.username.charAt(0).toUpperCase()}
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
          onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
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