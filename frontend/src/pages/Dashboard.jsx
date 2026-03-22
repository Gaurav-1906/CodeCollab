import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import io from 'socket.io-client';
import GameChat from '../components/GameChat';
import Chat from '../components/Chat';
import FriendsList from '../components/FriendsList';
import CodeEditor from '../components/CodeEditor';
import { useNotification } from '../context/NotificationContext';

// Socket connection helper - NO LOCALHOST FALLBACK
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL;
if (!SOCKET_URL) {
  console.error('❌ VITE_SOCKET_URL is not defined in environment variables!');
}

const Dashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [roomId, setRoomId] = useState('lobby');
  const [showRoomModal, setShowRoomModal] = useState(false);
  const [newRoomName, setNewRoomName] = useState('');
  const [joinRoomId, setJoinRoomId] = useState('');
  const [socket, setSocket] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [participantCount, setParticipantCount] = useState(0);
  const [socketReady, setSocketReady] = useState(false);
  const { showNotification } = useNotification();

  // Panel resizing
  const [leftWidth, setLeftWidth] = useState(280);
  const [rightWidth, setRightWidth] = useState(320);
  const [isLeftOpen, setIsLeftOpen] = useState(true);
  const [isRightOpen, setIsRightOpen] = useState(true);
  const [isDraggingLeft, setIsDraggingLeft] = useState(false);
  const [isDraggingRight, setIsDraggingRight] = useState(false);
  const containerRef = useRef(null);

  // Load user data
  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      setUser(JSON.parse(userData));
    } else {
      navigate('/login');
    }
  }, [navigate]);

  // Initialize Socket.IO connection
  useEffect(() => {
    if (!user) return;

    console.log('🔌 Connecting to Socket.IO at:', SOCKET_URL);
    const newSocket = io(SOCKET_URL, {
      withCredentials: true,
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000
    });

    newSocket.on('connect', () => {
      console.log('✅ Socket connected with ID:', newSocket.id);
      setSocketReady(true);
      newSocket.emit('register-user', { userId: user._id });
      newSocket.emit('user-online', { userId: user._id });
    });

    newSocket.on('connect_error', (error) => {
      console.error('❌ Socket connection error:', error.message);
      showNotification('Connection error. Please refresh the page.', 'error');
    });

    newSocket.on('user-joined-notification', ({ username, roomId: joinedRoom }) => {
      if (joinedRoom === roomId) {
        showNotification(`${username} joined the room!`, 'success');
      }
    });

    newSocket.on('user-left-notification', ({ username }) => {
      if (roomId !== 'lobby') {
        showNotification(`${username} left the room.`, 'info');
      }
    });

    newSocket.on('room-participants-count', ({ roomId: updatedRoomId, count }) => {
      if (updatedRoomId === roomId) {
        setParticipantCount(count);
      }
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [user, roomId, showNotification]);

  // Join room when roomId changes
  useEffect(() => {
    if (!socket || !socketReady || !user) return;
    
    if (roomId !== 'lobby') {
      console.log(`📡 Joining room: ${roomId}`);
      socket.emit('join-room', { roomId, userId: user._id, username: user.username });
    }
  }, [roomId, socket, socketReady, user]);

  // Room persistence
  useEffect(() => {
    const savedRoom = localStorage.getItem('currentRoom');
    if (savedRoom && savedRoom !== 'lobby') {
      setRoomId(savedRoom);
    }
  }, []);

  useEffect(() => {
    if (roomId && roomId !== 'lobby') {
      localStorage.setItem('currentRoom', roomId);
    } else if (roomId === 'lobby') {
      localStorage.removeItem('currentRoom');
    }
  }, [roomId]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const createRoom = () => {
    if (newRoomName.trim()) {
      const roomCode = newRoomName.toLowerCase().replace(/\s/g, '-') + '-' + Math.random().toString(36).substr(2, 6);
      setRoomId(roomCode);
      setShowRoomModal(false);
      setNewRoomName('');
    }
  };

  const joinRoom = () => {
    if (joinRoomId.trim()) {
      setRoomId(joinRoomId);
      setShowRoomModal(false);
      setJoinRoomId('');
    }
  };

  const handleJoinRoom = (newRoomId) => {
    setRoomId(newRoomId);
  };

  const leaveRoom = () => {
    if (socket && socketReady && roomId !== 'lobby') {
      socket.emit('leave-room', { userId: user._id, username: user.username });
      setRoomId('lobby');
      setParticipantCount(0);
      localStorage.removeItem('currentRoom');
      showNotification('You left the room', 'info');
    }
  };

  // Responsive & resize handlers
  const handleResize = () => {
    const width = window.innerWidth;
    if (width < 768) {
      setIsLeftOpen(false);
      setIsRightOpen(false);
    } else {
      setIsLeftOpen(true);
      setIsRightOpen(true);
      if (width < 1024) {
        setLeftWidth(240);
        setRightWidth(280);
      } else {
        setLeftWidth(280);
        setRightWidth(320);
      }
    }
  };

  useEffect(() => {
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (isDraggingLeft && containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const newWidth = e.clientX - rect.left;
        const clamped = Math.min(Math.max(newWidth, 180), 400);
        setLeftWidth(clamped);
        if (clamped < 50) setIsLeftOpen(false);
        else setIsLeftOpen(true);
      }
      if (isDraggingRight && containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const newWidth = rect.right - e.clientX;
        const clamped = Math.min(Math.max(newWidth, 240), 500);
        setRightWidth(clamped);
        if (clamped < 50) setIsRightOpen(false);
        else setIsRightOpen(true);
      }
    };
    
    const handleMouseUp = () => {
      setIsDraggingLeft(false);
      setIsDraggingRight(false);
    };
    
    if (isDraggingLeft || isDraggingRight) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    }
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isDraggingLeft, isDraggingRight]);

  const toggleLeftPanel = () => {
    if (isLeftOpen) {
      setLeftWidth(0);
      setIsLeftOpen(false);
    } else {
      setLeftWidth(280);
      setIsLeftOpen(true);
    }
  };
  
  const toggleRightPanel = () => {
    if (isRightOpen) {
      setRightWidth(0);
      setIsRightOpen(false);
    } else {
      setRightWidth(320);
      setIsRightOpen(true);
    }
  };
  
  const refreshFriends = () => {
    setRefreshKey(prev => prev + 1);
    showNotification('Refreshing friends list...', 'info');
  };

  if (!user) {
    return (
      <div style={{ height: '100vh', background: '#0a0a0a', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
        Loading...
      </div>
    );
  }

  return (
    <div
      style={{
        height: '100vh',
        width: '100vw',
        background: '#0f0f0f',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        margin: 0,
        padding: 0,
        fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
      }}
    >
      {/* Header */}
      <div
        style={{
          background: '#141414',
          borderBottom: '1px solid #2a2a2a',
          padding: '0 24px',
          height: '56px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexShrink: 0,
          backdropFilter: 'blur(8px)',
          zIndex: 10,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '24px' }}>💻</span>
            <h1 style={{ color: '#4CAF50', margin: 0, fontSize: '20px', fontWeight: 600, letterSpacing: '-0.5px' }}>
              CodeCollab
            </h1>
          </div>
          <div
            style={{
              background: '#1e1e1e',
              padding: '6px 12px',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              border: '1px solid #2a2a2a',
            }}
          >
            <span style={{ fontSize: '12px', color: '#aaa' }}>📍</span>
            <span style={{ color: '#fff', fontSize: '13px', fontFamily: 'monospace' }}>
              {roomId === 'lobby' ? 'Lobby' : roomId}
            </span>
            {roomId !== 'lobby' && (
              <button
                onClick={() => {
                  navigator.clipboard.writeText(roomId);
                  showNotification('Room code copied!', 'success');
                }}
                style={{
                  background: '#2c2c2c',
                  border: 'none',
                  padding: '2px 6px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '10px',
                  color: '#ccc',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={e => (e.target.style.background = '#3a3a3a')}
                onMouseLeave={e => (e.target.style.background = '#2c2c2c')}
              >
                Copy
              </button>
            )}
          </div>
          {roomId !== 'lobby' && (
            <div
              style={{
                background: '#2c2c2c',
                color: '#fff',
                padding: '4px 10px',
                borderRadius: '20px',
                fontSize: '12px',
                fontWeight: '500',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <span>👥</span>
              <span>{participantCount}</span>
            </div>
          )}
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <button
            onClick={() => setShowRoomModal(true)}
            style={{
              padding: '6px 16px',
              background: '#4CAF50',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: 500,
              transition: 'all 0.2s',
              boxShadow: '0 1px 2px rgba(0,0,0,0.2)',
            }}
            onMouseEnter={e => (e.target.style.background = '#45a049')}
            onMouseLeave={e => (e.target.style.background = '#4CAF50')}
          >
            Join/Create Room
          </button>
          {roomId !== 'lobby' && (
            <button
              onClick={leaveRoom}
              style={{
                padding: '6px 16px',
                background: '#dc2626',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: 500,
                transition: 'all 0.2s',
              }}
              onMouseEnter={e => (e.target.style.background = '#b91c1c')}
              onMouseLeave={e => (e.target.style.background = '#dc2626')}
            >
              Exit Room
            </button>
          )}
          <div
            style={{
              width: '34px',
              height: '34px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 'bold',
              fontSize: '14px',
              color: 'white',
              boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
            }}
          >
            {user.username.charAt(0).toUpperCase()}
          </div>
          <span style={{ color: '#ccc', fontSize: '13px', fontWeight: 500 }}>{user.username}</span>
          <button
            onClick={handleLogout}
            style={{
              padding: '6px 14px',
              background: 'transparent',
              color: '#aaa',
              border: '1px solid #2a2a2a',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '12px',
              transition: 'all 0.2s',
            }}
            onMouseEnter={e => {
              e.target.style.background = '#2a2a2a';
              e.target.style.color = '#fff';
            }}
            onMouseLeave={e => {
              e.target.style.background = 'transparent';
              e.target.style.color = '#aaa';
            }}
          >
            Logout
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div
        ref={containerRef}
        style={{
          flex: 1,
          display: 'flex',
          overflow: 'hidden',
          padding: '16px',
          gap: '0',
          minHeight: 0,
          position: 'relative',
        }}
      >
        {/* LEFT PANEL - Friends */}
        <div
          style={{
            width: isLeftOpen ? leftWidth : 48,
            minWidth: 48,
            maxWidth: 450,
            background: '#141414',
            borderRadius: '12px',
            transition: isDraggingLeft ? 'none' : 'width 0.2s ease',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            flexShrink: 0,
            border: '1px solid #2a2a2a',
          }}
        >
          <div
            style={{
              padding: '14px 16px',
              borderBottom: '1px solid #2a2a2a',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            {isLeftOpen && (
              <span
                style={{
                  color: '#ccc',
                  fontSize: '12px',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                }}
              >
                FRIENDS
              </span>
            )}
            <div style={{ display: 'flex', gap: '8px' }}>
              {isLeftOpen && (
                <button
                  onClick={refreshFriends}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    color: '#aaa',
                    fontSize: '14px',
                    padding: '4px',
                    borderRadius: '4px',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={e => (e.target.style.background = '#2a2a2a')}
                  onMouseLeave={e => (e.target.style.background = 'transparent')}
                  title="Refresh friends list"
                >
                  🔄
                </button>
              )}
              <button
                onClick={toggleLeftPanel}
                style={{
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#aaa',
                  fontSize: '14px',
                  padding: '4px',
                  borderRadius: '4px',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={e => (e.target.style.background = '#2a2a2a')}
                onMouseLeave={e => (e.target.style.background = 'transparent')}
              >
                {isLeftOpen ? '◀' : '▶'}
              </button>
            </div>
          </div>
          {isLeftOpen && (
            <div style={{ flex: 1, overflow: 'auto', padding: '12px' }}>
              <FriendsList
                key={refreshKey}
                user={user}
                currentRoom={roomId}
                onJoinRoom={handleJoinRoom}
                socket={socket}
                onNotification={showNotification}
              />
            </div>
          )}
        </div>

        {/* LEFT RESIZE HANDLE */}
        {isLeftOpen && (
          <div
            onMouseDown={() => setIsDraggingLeft(true)}
            style={{
              width: '4px',
              cursor: 'col-resize',
              background: 'transparent',
              transition: 'background 0.2s',
              margin: '0 4px',
              borderRadius: '2px',
            }}
            onMouseEnter={e => (e.target.style.background = '#4CAF50')}
            onMouseLeave={e => (e.target.style.background = 'transparent')}
          />
        )}

        {/* MAIN EDITOR */}
        <div
          style={{
            flex: 1,
            background: '#1a1a1a',
            borderRadius: '12px',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            minWidth: 300,
            border: '1px solid #2a2a2a',
          }}
        >
          <CodeEditor user={user} roomId={roomId} />
        </div>

        {/* RIGHT RESIZE HANDLE */}
        {isRightOpen && (
          <div
            onMouseDown={() => setIsDraggingRight(true)}
            style={{
              width: '4px',
              cursor: 'col-resize',
              background: 'transparent',
              transition: 'background 0.2s',
              margin: '0 4px',
              borderRadius: '2px',
            }}
            onMouseEnter={e => (e.target.style.background = '#4CAF50')}
            onMouseLeave={e => (e.target.style.background = 'transparent')}
          />
        )}

        {/* RIGHT PANEL - Chat & Video */}
        <div
          style={{
            width: isRightOpen ? rightWidth : 48,
            minWidth: 48,
            maxWidth: 550,
            background: '#141414',
            borderRadius: '12px',
            transition: isDraggingRight ? 'none' : 'width 0.2s ease',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            flexShrink: 0,
            border: '1px solid #2a2a2a',
          }}
        >
          <div
            style={{
              padding: '14px 16px',
              borderBottom: '1px solid #2a2a2a',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            {isRightOpen && (
              <span
                style={{
                  color: '#ccc',
                  fontSize: '12px',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                }}
              >
                CHAT & VIDEO
              </span>
            )}
            <button
              onClick={toggleRightPanel}
              style={{
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                color: '#aaa',
                fontSize: '14px',
                padding: '4px',
                borderRadius: '4px',
                transition: 'all 0.2s',
              }}
              onMouseEnter={e => (e.target.style.background = '#2a2a2a')}
              onMouseLeave={e => (e.target.style.background = 'transparent')}
            >
              {isRightOpen ? '▶' : '◀'}
            </button>
          </div>
          {isRightOpen && (
            <div
              style={{
                flex: 1,
                overflow: 'auto',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px',
                padding: '16px',
              }}
            >
              {/* Video Chat */}
              {roomId !== 'lobby' ? (
                <div
                  style={{
                    background: '#1a1a1a',
                    borderRadius: '12px',
                    overflow: 'hidden',
                    height: '220px',
                    flexShrink: 0,
                    resize: 'vertical',
                    minHeight: '150px',
                    border: '1px solid #2a2a2a',
                  }}
                >
                  <GameChat key={roomId} user={user} roomId={roomId} />
                </div>
              ) : (
                <div
                  style={{
                    background: '#1a1a1a',
                    borderRadius: '12px',
                    height: '220px',
                    flexShrink: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexDirection: 'column',
                    gap: '12px',
                    color: '#888',
                    border: '1px solid #2a2a2a',
                  }}
                >
                  <span style={{ fontSize: '48px', opacity: 0.5 }}>🎥</span>
                  <p style={{ fontSize: '14px', margin: 0 }}>Join a room to start video call</p>
                </div>
              )}
              {/* Text Chat */}
              <div
                style={{
                  background: '#1a1a1a',
                  borderRadius: '12px',
                  overflow: 'hidden',
                  flex: 1,
                  minHeight: 0,
                  border: '1px solid #2a2a2a',
                }}
              >
                <Chat user={user} roomId={roomId} />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Room Modal */}
      {showRoomModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.7)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 2000,
          }}
        >
          <div
            style={{
              background: '#1a1a1a',
              borderRadius: '16px',
              width: '420px',
              maxWidth: '90%',
              padding: '28px',
              border: '1px solid #2a2a2a',
              boxShadow: '0 20px 35px rgba(0,0,0,0.4)',
            }}
          >
            <h2 style={{ margin: '0 0 8px 0', color: '#fff', fontSize: '22px', fontWeight: 600 }}>
              Join or Create Room
            </h2>
            <p style={{ color: '#888', marginBottom: '24px', fontSize: '14px' }}>
              Collaborate with friends in real-time
            </p>
            <div style={{ marginBottom: '24px' }}>
              <label
                style={{
                  color: '#ccc',
                  fontSize: '13px',
                  marginBottom: '8px',
                  display: 'block',
                  fontWeight: 500,
                }}
              >
                Create New Room
              </label>
              <input
                type="text"
                placeholder="Room name"
                value={newRoomName}
                onChange={e => setNewRoomName(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  background: '#2a2a2a',
                  border: '1px solid #3a3a3a',
                  borderRadius: '8px',
                  color: '#fff',
                  fontSize: '14px',
                  outline: 'none',
                  marginBottom: '12px',
                }}
              />
              <button
                onClick={createRoom}
                style={{
                  width: '100%',
                  padding: '10px',
                  background: '#4CAF50',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: 500,
                }}
              >
                Create Room
              </button>
            </div>
            <div style={{ marginBottom: '24px' }}>
              <label
                style={{
                  color: '#ccc',
                  fontSize: '13px',
                  marginBottom: '8px',
                  display: 'block',
                  fontWeight: 500,
                }}
              >
                Join Existing Room
              </label>
              <input
                type="text"
                placeholder="Enter room code"
                value={joinRoomId}
                onChange={e => setJoinRoomId(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  background: '#2a2a2a',
                  border: '1px solid #3a3a3a',
                  borderRadius: '8px',
                  color: '#fff',
                  fontSize: '14px',
                  outline: 'none',
                  marginBottom: '12px',
                }}
              />
              <button
                onClick={joinRoom}
                style={{
                  width: '100%',
                  padding: '10px',
                  background: '#2196F3',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: 500,
                }}
              >
                Join Room
              </button>
            </div>
            <button
              onClick={() => setShowRoomModal(false)}
              style={{
                width: '100%',
                padding: '10px',
                background: '#dc2626',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '14px',
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;