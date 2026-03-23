import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import socket from '../socket';               // ✅ Use the singleton socket
import GameChat from '../components/GameChat';
import Chat from '../components/Chat';
import FriendsList from '../components/FriendsList';
import CodeEditor from '../components/CodeEditor';
import { useNotification } from '../context/NotificationContext';
import { useTheme } from '../App';

// Icons (unchanged)
const Icons = {
  Code: () => ( /* ... */ ),
  Users: () => ( /* ... */ ),
  Copy: () => ( /* ... */ ),
  Plus: () => ( /* ... */ ),
  LogOut: () => ( /* ... */ ),
  X: () => ( /* ... */ ),
  ChevronLeft: () => ( /* ... */ ),
  ChevronRight: () => ( /* ... */ ),
  Sun: () => ( /* ... */ ),
  Moon: () => ( /* ... */ ),
  Refresh: () => ( /* ... */ ),
  Video: () => ( /* ... */ ),
  MessageCircle: () => ( /* ... */ ),
  Settings: () => ( /* ... */ ),
  Wifi: () => ( /* ... */ ),
  WifiOff: () => ( /* ... */ ),
  DoorOpen: () => ( /* ... */ ),
};

const Dashboard = () => {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const [user, setUser] = useState(null);
  const [roomId, setRoomId] = useState('lobby');
  const [showRoomModal, setShowRoomModal] = useState(false);
  const [newRoomName, setNewRoomName] = useState('');
  const [joinRoomId, setJoinRoomId] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  const [participantCount, setParticipantCount] = useState(0);
  const [socketReady, setSocketReady] = useState(false);
  const { showNotification } = useNotification();

  // Panel resizing
  const [leftWidth, setLeftWidth] = useState(280);
  const [rightWidth, setRightWidth] = useState(340);
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

  // Socket connection and event listeners
  useEffect(() => {
    if (!user) return;

    // Connect if not already connected
    if (!socket.connected) {
      socket.connect();
    }

    const onConnect = () => {
      console.log('Socket connected with ID:', socket.id);
      setSocketReady(true);
      socket.emit('register-user', { userId: user._id });
      socket.emit('user-online', { userId: user._id });
    };

    const onConnectError = (error) => {
      console.error('Socket connection error:', error.message);
      showNotification('Connection error. Please refresh the page.', 'error');
      setSocketReady(false);
    };

    const onUserJoined = ({ username, roomId: joinedRoom }) => {
      if (joinedRoom === roomId) {
        showNotification(`${username} joined the room`, 'success');
      }
    };

    const onUserLeft = ({ username }) => {
      if (roomId !== 'lobby') {
        showNotification(`${username} left the room`, 'info');
      }
    };

    const onRoomCount = ({ roomId: updatedRoomId, count }) => {
      if (updatedRoomId === roomId) {
        setParticipantCount(count);
      }
    };

    socket.on('connect', onConnect);
    socket.on('connect_error', onConnectError);
    socket.on('user-joined-notification', onUserJoined);
    socket.on('user-left-notification', onUserLeft);
    socket.on('room-participants-count', onRoomCount);

    // If already connected, set ready immediately
    if (socket.connected) {
      setSocketReady(true);
    }

    return () => {
      socket.off('connect', onConnect);
      socket.off('connect_error', onConnectError);
      socket.off('user-joined-notification', onUserJoined);
      socket.off('user-left-notification', onUserLeft);
      socket.off('room-participants-count', onRoomCount);
    };
  }, [user, roomId, showNotification]);

  // Join room when roomId changes (and socket is ready)
  useEffect(() => {
    if (!socketReady || !user) return;

    if (roomId !== 'lobby') {
      console.log(`Joining room: ${roomId}`);
      socket.emit('join-room', { roomId, userId: user._id, username: user.username });
    }
  }, [roomId, socketReady, user]);

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

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
        e.preventDefault();
        toggleLeftPanel();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === '.') {
        e.preventDefault();
        toggleRightPanel();
      }
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'N') {
        e.preventDefault();
        setShowRoomModal(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Handlers
  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('currentRoom');
    navigate('/login');
  };

  const createRoom = () => {
    if (newRoomName.trim()) {
      const roomCode = newRoomName.toLowerCase().replace(/\s/g, '-') + '-' + Math.random().toString(36).substr(2, 6);
      setRoomId(roomCode);
      setShowRoomModal(false);
      setNewRoomName('');
      showNotification('Room created successfully', 'success');
    }
  };

  const joinRoom = () => {
    if (joinRoomId.trim()) {
      setRoomId(joinRoomId);
      setShowRoomModal(false);
      setJoinRoomId('');
      showNotification('Joined room successfully', 'success');
    }
  };

  const handleJoinRoom = (newRoomId) => {
    setRoomId(newRoomId);
  };

  const leaveRoom = () => {
    if (socketReady && roomId !== 'lobby') {
      socket.emit('leave-room', { userId: user._id, username: user.username });
      setRoomId('lobby');
      setParticipantCount(0);
      localStorage.removeItem('currentRoom');
      showNotification('You left the room', 'info');
    }
  };

  const copyRoomId = useCallback(() => {
    navigator.clipboard.writeText(roomId);
    showNotification('Room code copied to clipboard', 'success');
  }, [roomId, showNotification]);

  // Resize handlers (unchanged)
  const handleResize = useCallback(() => {
    const width = window.innerWidth;
    if (width < 768) {
      setIsLeftOpen(false);
      setIsRightOpen(false);
    } else {
      setIsLeftOpen(true);
      setIsRightOpen(true);
      if (width < 1024) {
        setLeftWidth(240);
        setRightWidth(300);
      } else {
        setLeftWidth(280);
        setRightWidth(340);
      }
    }
  }, []);

  useEffect(() => {
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [handleResize]);

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (isDraggingLeft && containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const newWidth = e.clientX - rect.left;
        const clamped = Math.min(Math.max(newWidth, 200), 400);
        setLeftWidth(clamped);
        if (clamped < 60) setIsLeftOpen(false);
        else setIsLeftOpen(true);
      }
      if (isDraggingRight && containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const newWidth = rect.right - e.clientX;
        const clamped = Math.min(Math.max(newWidth, 260), 500);
        setRightWidth(clamped);
        if (clamped < 60) setIsRightOpen(false);
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

  const toggleLeftPanel = useCallback(() => {
    if (isLeftOpen) {
      setLeftWidth(0);
      setIsLeftOpen(false);
    } else {
      setLeftWidth(280);
      setIsLeftOpen(true);
    }
  }, [isLeftOpen]);
  
  const toggleRightPanel = useCallback(() => {
    if (isRightOpen) {
      setRightWidth(0);
      setIsRightOpen(false);
    } else {
      setRightWidth(340);
      setIsRightOpen(true);
    }
  }, [isRightOpen]);
  
  const refreshFriends = useCallback(() => {
    setRefreshKey(prev => prev + 1);
    showNotification('Refreshing friends list...', 'info');
  }, [showNotification]);

  if (!user) {
    return (
      <div style={{
        height: '100vh',
        background: 'var(--bg-primary)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'var(--text-primary)'
      }}>
        <div className="spinner-lg" />
      </div>
    );
  }

  return (
    <div
      style={{
        height: '100vh',
        width: '100vw',
        background: 'var(--bg-primary)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        fontFamily: 'var(--font-sans)',
      }}
    >
      {/* Header */}
      <header
        style={{
          background: 'var(--bg-secondary)',
          borderBottom: '1px solid var(--border-primary)',
          padding: '0 20px',
          height: '56px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexShrink: 0,
          zIndex: 100,
        }}
      >
        {/* Left Section */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '34px',
                height: '34px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, var(--primary) 0%, #059669 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
              }}
            >
              <Icons.Code />
            </div>
            <h1
              style={{
                color: 'var(--text-primary)',
                margin: 0,
                fontSize: '18px',
                fontWeight: 600,
                letterSpacing: '-0.5px',
              }}
            >
              CodeCollab
            </h1>
          </div>

          {/* Room Badge */}
          <div
            style={{
              background: 'var(--bg-tertiary)',
              padding: '6px 12px',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              border: '1px solid var(--border-primary)',
            }}
          >
            <div
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: roomId === 'lobby' ? 'var(--text-muted)' : 'var(--primary)',
                boxShadow: roomId !== 'lobby' ? '0 0 8px var(--primary)' : 'none',
              }}
            />
            <span
              style={{
                color: 'var(--text-primary)',
                fontSize: '13px',
                fontFamily: 'var(--font-mono)',
                maxWidth: '180px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {roomId === 'lobby' ? 'Lobby' : roomId}
            </span>
            {roomId !== 'lobby' && (
              <button
                onClick={copyRoomId}
                style={{
                  background: 'var(--bg-hover)',
                  border: 'none',
                  padding: '4px 6px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  color: 'var(--text-secondary)',
                  display: 'flex',
                  alignItems: 'center',
                  transition: 'all var(--transition-fast)',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = 'var(--border-secondary)';
                  e.currentTarget.style.color = 'var(--text-primary)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = 'var(--bg-hover)';
                  e.currentTarget.style.color = 'var(--text-secondary)';
                }}
                title="Copy room code"
              >
                <Icons.Copy />
              </button>
            )}
          </div>

          {/* Participants */}
          {roomId !== 'lobby' && (
            <div
              style={{
                background: 'var(--accent-light)',
                color: 'var(--accent)',
                padding: '5px 12px',
                borderRadius: '20px',
                fontSize: '12px',
                fontWeight: 500,
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                border: '1px solid rgba(59, 130, 246, 0.2)',
              }}
            >
              <Icons.Users />
              <span>{participantCount} online</span>
            </div>
          )}

          {/* Connection Status */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              color: socketReady ? 'var(--success)' : 'var(--error)',
              fontSize: '12px',
            }}
          >
            {socketReady ? <Icons.Wifi /> : <Icons.WifiOff />}
            <span style={{ fontWeight: 500 }}>{socketReady ? 'Connected' : 'Disconnected'}</span>
          </div>
        </div>

        {/* Right Section */}
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            style={{
              padding: '8px',
              background: 'transparent',
              color: 'var(--text-secondary)',
              border: '1px solid var(--border-primary)',
              borderRadius: '8px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all var(--transition-fast)',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'var(--bg-hover)';
              e.currentTarget.style.color = 'var(--text-primary)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.color = 'var(--text-secondary)';
            }}
            title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          >
            {theme === 'dark' ? <Icons.Sun /> : <Icons.Moon />}
          </button>

          {/* Room Actions */}
          <button
            onClick={() => setShowRoomModal(true)}
            style={{
              padding: '8px 16px',
              background: 'var(--primary)',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: 500,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all var(--transition-fast)',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'var(--primary-hover)';
              e.currentTarget.style.transform = 'translateY(-1px)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'var(--primary)';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            <Icons.Plus />
            Join / Create Room
          </button>

          {roomId !== 'lobby' && (
            <button
              onClick={leaveRoom}
              style={{
                padding: '8px 16px',
                background: 'var(--error)',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: 500,
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all var(--transition-fast)',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = '#dc2626';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'var(--error)';
              }}
            >
              <Icons.DoorOpen />
              Leave Room
            </button>
          )}

          {/* User Avatar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginLeft: '8px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 600,
                fontSize: '14px',
                color: 'white',
                boxShadow: '0 2px 8px rgba(99, 102, 241, 0.3)',
              }}
            >
              {user.username.charAt(0).toUpperCase()}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <span style={{ color: 'var(--text-primary)', fontSize: '13px', fontWeight: 500 }}>
                {user.username}
              </span>
              <span style={{ color: 'var(--text-tertiary)', fontSize: '11px' }}>Online</span>
            </div>
          </div>

          {/* Logout */}
          <button
            onClick={handleLogout}
            style={{
              padding: '8px',
              background: 'transparent',
              color: 'var(--text-secondary)',
              border: '1px solid var(--border-primary)',
              borderRadius: '8px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all var(--transition-fast)',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'var(--bg-hover)';
              e.currentTarget.style.borderColor = 'var(--error)';
              e.currentTarget.style.color = 'var(--error)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.borderColor = 'var(--border-primary)';
              e.currentTarget.style.color = 'var(--text-secondary)';
            }}
            title="Logout"
          >
            <Icons.LogOut />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <div
        ref={containerRef}
        style={{
          flex: 1,
          display: 'flex',
          overflow: 'hidden',
          padding: '12px',
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
            background: 'var(--bg-secondary)',
            borderRadius: '12px',
            transition: isDraggingLeft ? 'none' : 'width 0.2s ease',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            flexShrink: 0,
            border: '1px solid var(--border-primary)',
          }}
        >
          <div
            style={{
              padding: '12px 14px',
              borderBottom: '1px solid var(--border-primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '8px',
            }}
          >
            {isLeftOpen && (
              <span
                style={{
                  color: 'var(--text-secondary)',
                  fontSize: '11px',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                }}
              >
                Friends
              </span>
            )}
            <div style={{ display: 'flex', gap: '4px' }}>
              {isLeftOpen && (
                <button
                  onClick={refreshFriends}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'var(--text-tertiary)',
                    padding: '6px',
                    borderRadius: '6px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all var(--transition-fast)',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.background = 'var(--bg-hover)';
                    e.currentTarget.style.color = 'var(--text-primary)';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.color = 'var(--text-tertiary)';
                  }}
                  title="Refresh friends list"
                >
                  <Icons.Refresh />
                </button>
              )}
              <button
                onClick={toggleLeftPanel}
                style={{
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--text-tertiary)',
                  padding: '6px',
                  borderRadius: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all var(--transition-fast)',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = 'var(--bg-hover)';
                  e.currentTarget.style.color = 'var(--text-primary)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.color = 'var(--text-tertiary)';
                }}
                title={isLeftOpen ? 'Collapse panel' : 'Expand panel'}
              >
                {isLeftOpen ? <Icons.ChevronLeft /> : <Icons.ChevronRight />}
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
                socket={socket}               // ✅ use the imported socket
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
              width: '6px',
              cursor: 'col-resize',
              background: 'transparent',
              transition: 'background 0.2s',
              margin: '0 2px',
              borderRadius: '3px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--primary)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          />
        )}

        {/* MAIN EDITOR */}
        <div
          style={{
            flex: 1,
            background: 'var(--bg-secondary)',
            borderRadius: '12px',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            minWidth: 300,
            border: '1px solid var(--border-primary)',
          }}
        >
          <CodeEditor user={user} roomId={roomId} />
        </div>

        {/* RIGHT RESIZE HANDLE */}
        {isRightOpen && (
          <div
            onMouseDown={() => setIsDraggingRight(true)}
            style={{
              width: '6px',
              cursor: 'col-resize',
              background: 'transparent',
              transition: 'background 0.2s',
              margin: '0 2px',
              borderRadius: '3px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--primary)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          />
        )}

        {/* RIGHT PANEL - Chat & Video */}
        <div
          style={{
            width: isRightOpen ? rightWidth : 48,
            minWidth: 48,
            maxWidth: 550,
            background: 'var(--bg-secondary)',
            borderRadius: '12px',
            transition: isDraggingRight ? 'none' : 'width 0.2s ease',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            flexShrink: 0,
            border: '1px solid var(--border-primary)',
          }}
        >
          <div
            style={{
              padding: '12px 14px',
              borderBottom: '1px solid var(--border-primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            {isRightOpen && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Icons.MessageCircle />
                <span
                  style={{
                    color: 'var(--text-secondary)',
                    fontSize: '11px',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                  }}
                >
                  Communication
                </span>
              </div>
            )}
            <button
              onClick={toggleRightPanel}
              style={{
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--text-tertiary)',
                padding: '6px',
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all var(--transition-fast)',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = 'var(--bg-hover)';
                e.currentTarget.style.color = 'var(--text-primary)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.color = 'var(--text-tertiary)';
              }}
              title={isRightOpen ? 'Collapse panel' : 'Expand panel'}
            >
              {isRightOpen ? <Icons.ChevronRight /> : <Icons.ChevronLeft />}
            </button>
          </div>
          {isRightOpen && (
            <div
              style={{
                flex: 1,
                overflow: 'auto',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                padding: '12px',
              }}
            >
              {/* Video Chat */}
              {roomId !== 'lobby' ? (
                <div
                  style={{
                    background: 'var(--bg-tertiary)',
                    borderRadius: '10px',
                    overflow: 'hidden',
                    height: '200px',
                    flexShrink: 0,
                    resize: 'vertical',
                    minHeight: '150px',
                    border: '1px solid var(--border-primary)',
                  }}
                >
                  <GameChat key={roomId} user={user} roomId={roomId} socket={socket} />
                </div>
              ) : (
                <div
                  style={{
                    background: 'var(--bg-tertiary)',
                    borderRadius: '10px',
                    height: '200px',
                    flexShrink: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexDirection: 'column',
                    gap: '12px',
                    color: 'var(--text-tertiary)',
                    border: '1px solid var(--border-primary)',
                  }}
                >
                  <Icons.Video />
                  <p style={{ fontSize: '13px', margin: 0 }}>Join a room to start video call</p>
                </div>
              )}

              {/* Text Chat */}
              <div
                style={{
                  background: 'var(--bg-tertiary)',
                  borderRadius: '10px',
                  overflow: 'hidden',
                  flex: 1,
                  minHeight: 0,
                  border: '1px solid var(--border-primary)',
                }}
              >
                <Chat user={user} roomId={roomId} socket={socket} />
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
            inset: 0,
            background: 'rgba(0, 0, 0, 0.7)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 2000,
            animation: 'fadeIn 0.2s ease',
          }}
          onClick={(e) => e.target === e.currentTarget && setShowRoomModal(false)}
        >
          <div
            style={{
              background: 'var(--bg-secondary)',
              borderRadius: '16px',
              width: '440px',
              maxWidth: '90%',
              padding: '24px',
              border: '1px solid var(--border-primary)',
              boxShadow: 'var(--shadow-xl)',
              animation: 'scaleIn 0.2s ease',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div>
                <h2 style={{ margin: '0 0 4px 0', color: 'var(--text-primary)', fontSize: '20px', fontWeight: 600 }}>
                  Join or Create Room
                </h2>
                <p style={{ color: 'var(--text-tertiary)', margin: 0, fontSize: '13px' }}>
                  Collaborate with friends in real-time
                </p>
              </div>
              <button
                onClick={() => setShowRoomModal(false)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--text-tertiary)',
                  padding: '8px',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all var(--transition-fast)',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = 'var(--bg-hover)';
                  e.currentTarget.style.color = 'var(--text-primary)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.color = 'var(--text-tertiary)';
                }}
              >
                <Icons.X />
              </button>
            </div>

            {/* Create Room */}
            <div style={{ marginBottom: '24px' }}>
              <label
                style={{
                  color: 'var(--text-secondary)',
                  fontSize: '12px',
                  marginBottom: '8px',
                  display: 'block',
                  fontWeight: 500,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                }}
              >
                Create New Room
              </label>
              <input
                type="text"
                placeholder="Enter room name..."
                value={newRoomName}
                onChange={e => setNewRoomName(e.target.value)}
                onKeyPress={e => e.key === 'Enter' && createRoom()}
                className="input"
                style={{ marginBottom: '10px' }}
              />
              <button
                onClick={createRoom}
                className="btn btn-primary"
                style={{ width: '100%' }}
              >
                Create Room
              </button>
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                marginBottom: '24px',
              }}
            >
              <div style={{ flex: 1, height: '1px', background: 'var(--border-primary)' }} />
              <span style={{ color: 'var(--text-tertiary)', fontSize: '12px', fontWeight: 500 }}>OR</span>
              <div style={{ flex: 1, height: '1px', background: 'var(--border-primary)' }} />
            </div>

            {/* Join Room */}
            <div style={{ marginBottom: '20px' }}>
              <label
                style={{
                  color: 'var(--text-secondary)',
                  fontSize: '12px',
                  marginBottom: '8px',
                  display: 'block',
                  fontWeight: 500,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                }}
              >
                Join Existing Room
              </label>
              <input
                type="text"
                placeholder="Enter room code..."
                value={joinRoomId}
                onChange={e => setJoinRoomId(e.target.value)}
                onKeyPress={e => e.key === 'Enter' && joinRoom()}
                className="input"
                style={{ marginBottom: '10px' }}
              />
              <button
                onClick={joinRoom}
                className="btn btn-secondary"
                style={{ width: '100%', background: 'var(--accent)', color: 'white', border: 'none' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--accent-hover)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'var(--accent)')}
              >
                Join Room
              </button>
            </div>

            <button
              onClick={() => setShowRoomModal(false)}
              className="btn btn-ghost"
              style={{ width: '100%' }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Keyboard Shortcuts Hint */}
      <div
        style={{
          position: 'fixed',
          bottom: '16px',
          left: '16px',
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          padding: '8px 12px',
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border-primary)',
          borderRadius: '8px',
          fontSize: '11px',
          color: 'var(--text-tertiary)',
          zIndex: 50,
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <kbd className="kbd">Ctrl</kbd>
          <kbd className="kbd">B</kbd>
          <span>Toggle Friends</span>
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <kbd className="kbd">Ctrl</kbd>
          <kbd className="kbd">.</kbd>
          <span>Toggle Chat</span>
        </span>
      </div>
    </div>
  );
};

export default Dashboard;
