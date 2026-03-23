import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import io from 'socket.io-client';
import GameChat from '../components/GameChat';
import Chat from '../components/Chat';
import FriendsList from '../components/FriendsList';
import CodeEditor from '../components/CodeEditor';
import { useNotification } from '../context/NotificationContext';
import { useTheme } from '../App';

// Socket connection helper
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL;

// Icons as components
const Icons = {
  Code: () => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="16 18 22 12 16 6" />
      <polyline points="8 6 2 12 8 18" />
    </svg>
  ),
  Users: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
  Copy: () => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  ),
  Plus: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  ),
  LogOut: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  ),
  X: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  ),
  ChevronLeft: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15 18 9 12 15 6" />
    </svg>
  ),
  ChevronRight: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  ),
  Sun: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="5" />
      <line x1="12" y1="1" x2="12" y2="3" />
      <line x1="12" y1="21" x2="12" y2="23" />
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
      <line x1="1" y1="12" x2="3" y2="12" />
      <line x1="21" y1="12" x2="23" y2="12" />
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
    </svg>
  ),
  Moon: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  ),
  Refresh: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 4 23 10 17 10" />
      <polyline points="1 20 1 14 7 14" />
      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
    </svg>
  ),
  Video: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="23 7 16 12 23 17 23 7" />
      <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
    </svg>
  ),
  MessageCircle: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
    </svg>
  ),
  Settings: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  ),
  Wifi: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12.55a11 11 0 0 1 14.08 0" />
      <path d="M1.42 9a16 16 0 0 1 21.16 0" />
      <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
      <line x1="12" y1="20" x2="12.01" y2="20" />
    </svg>
  ),
  WifiOff: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="1" y1="1" x2="23" y2="23" />
      <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55" />
      <path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39" />
      <path d="M10.71 5.05A16 16 0 0 1 22.58 9" />
      <path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88" />
      <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
      <line x1="12" y1="20" x2="12.01" y2="20" />
    </svg>
  ),
  DoorOpen: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M13 4h3a2 2 0 0 1 2 2v14" />
      <path d="M2 20h3" />
      <path d="M13 20h9" />
      <path d="M10 12v.01" />
      <path d="M13 4.562v16.157a1 1 0 0 1-1.242.97L5 20V5.562a2 2 0 0 1 1.515-1.94l4-1A2 2 0 0 1 13 4.561Z" />
    </svg>
  ),
};

const Dashboard = () => {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
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

  // Initialize Socket.IO connection
  useEffect(() => {
    if (!user) return;

    console.log('Connecting to Socket.IO at:', SOCKET_URL);
    const newSocket = io(SOCKET_URL, {
      withCredentials: true,
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000
    });

    newSocket.on('connect', () => {
      console.log('Socket connected with ID:', newSocket.id);
      setSocketReady(true);
      newSocket.emit('register-user', { userId: user._id });
      newSocket.emit('user-online', { userId: user._id });
    });

    newSocket.on('connect_error', (error) => {
      console.error('Socket connection error:', error.message);
      showNotification('Connection error. Please refresh the page.', 'error');
    });

    newSocket.on('user-joined-notification', ({ username, roomId: joinedRoom }) => {
      if (joinedRoom === roomId) {
        showNotification(`${username} joined the room`, 'success');
      }
    });

    newSocket.on('user-left-notification', ({ username }) => {
      if (roomId !== 'lobby') {
        showNotification(`${username} left the room`, 'info');
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
  }, [user, showNotification]);

  // Join room when roomId changes
  useEffect(() => {
    if (!socket || !socketReady || !user) return;
    
    if (roomId !== 'lobby') {
      console.log(`Joining room: ${roomId}`);
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

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ctrl/Cmd + B - Toggle left panel
      if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
        e.preventDefault();
        toggleLeftPanel();
      }
      // Ctrl/Cmd + . - Toggle right panel
      if ((e.ctrlKey || e.metaKey) && e.key === '.') {
        e.preventDefault();
        toggleRightPanel();
      }
      // Ctrl/Cmd + Shift + N - New room
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'N') {
        e.preventDefault();
        setShowRoomModal(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

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
    if (socket && socketReady && roomId !== 'lobby') {
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

  // Responsive & resize handlers
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
                  <GameChat key={roomId} user={user} roomId={roomId} />
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
