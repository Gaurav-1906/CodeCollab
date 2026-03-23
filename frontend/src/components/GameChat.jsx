import React, { useState, useEffect, useRef, useCallback } from 'react';
import socket from '../socket';
import Peer from 'simple-peer';

// Browser polyfill for simple-peer
window.global = window;
window.process = window.process || { nextTick: (fn) => setTimeout(fn, 0) };

// Icons
const Icons = {
  Mic: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <line x1="12" y1="19" x2="12" y2="23" />
      <line x1="8" y1="23" x2="16" y2="23" />
    </svg>
  ),
  MicOff: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="1" y1="1" x2="23" y2="23" />
      <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6" />
      <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23" />
      <line x1="12" y1="19" x2="12" y2="23" />
      <line x1="8" y1="23" x2="16" y2="23" />
    </svg>
  ),
  Video: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="23 7 16 12 23 17 23 7" />
      <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
    </svg>
  ),
  VideoOff: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 16v1a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h2m5.66 0H14a2 2 0 0 1 2 2v3.34l1 1L23 7v10" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  ),
  PhoneOff: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7 2 2 0 0 1 1.72 2v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.42 19.42 0 0 1-3.33-2.67m-2.67-3.34a19.79 19.79 0 0 1-3.07-8.63A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91" />
      <line x1="23" y1="1" x2="1" y2="23" />
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
  Users: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
};

const GameChat = ({ user, roomId }) => {
  const [peers, setPeers] = useState([]);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [stream, setStream] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('Initializing...');
  const [statusType, setStatusType] = useState('connecting'); // 'connected', 'connecting', 'error'
  const socketRef = useRef();
  const userVideoRef = useRef();
  const peersRef = useRef({});
  const mountedRef = useRef(true);

  const SOCKET_URL = import.meta.env.VITE_SOCKET_URL;

  const getAvatarColor = useCallback((username) => {
    const colors = [
      'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
      'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
      'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
      'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
    ];
    let hash = 0;
    if (!username) return colors[0];
    for (let i = 0; i < username.length; i++) {
      hash = ((hash << 5) - hash) + username.charCodeAt(i);
    }
    return colors[Math.abs(hash) % colors.length];
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    
    if (roomId === 'lobby') {
      setConnectionStatus('Join a room to start');
      setStatusType('connecting');
      return;
    }

    if (!SOCKET_URL) {
      setConnectionStatus('Configuration error');
      setStatusType('error');
      return;
    }
    
    setConnectionStatus('Requesting camera...');
    setStatusType('connecting');

    socketRef.current = socket;

    if (!socketRef.current.connected) {
      socketRef.current.connect();
    }

    navigator.mediaDevices.getUserMedia({ audio: true, video: true })
      .then(mediaStream => {
        if (!mountedRef.current) return;
        setStream(mediaStream);
        if (userVideoRef.current) {
          userVideoRef.current.srcObject = mediaStream;
        }
        setConnectionStatus('Joining room...');
        socketRef.current.emit('join-room', {
          roomId,
          userId: user._id,
          username: user.username,
        });
      })
      .catch(err => {
        console.warn('Media not available, continuing without local camera/microphone:', err);
        if (!mountedRef.current) return;
        setStream(null);
        setConnectionStatus('No local camera/mic; joining room nonetheless');
        socketRef.current.emit('join-room', {
          roomId,
          userId: user._id,
          username: user.username,
        });
      });

    // Make sure room join is not blocked by the media request
    setTimeout(() => {
      if (mountedRef.current) {
        setConnectionStatus('Waiting for peers...');
        setStatusType('connecting');
      }
    }, 600);


    socketRef.current.on('user-joined', ({ userId, username }) => {
      if (!mountedRef.current) return;
      setConnectionStatus(`${username} joined`);
      setStatusType('connected');
      // Existing members do not create initiator peer here; incoming offer arrives via receive-call.
    });

    socketRef.current.on('all-users', ({ users }) => {
      if (!mountedRef.current) return;
      if (!users || users.length === 0) return;
      users.forEach(({ userId, username }) => {
        if (userId === user._id) return;
        if (peersRef.current[userId]) return; // avoid duplicates
        const peer = createPeer(userId, socketRef.current.id, stream);
        peersRef.current[userId] = { peer, username, peerId: userId };
      });
      setPeers(Object.values(peersRef.current));
      setConnectionStatus('Connected');
      setStatusType('connected');
    });

    socketRef.current.on('receive-call', ({ signal, from, username }) => {
      if (!mountedRef.current) return;
      setConnectionStatus(`Connecting to ${username}`);
      if (!peersRef.current[from]) {
        const peer = addPeer(signal, from, stream);
        peersRef.current[from] = { peer, username, peerId: from };
        setPeers(Object.values(peersRef.current));
      }
    });

    socketRef.current.on('signal-returned', ({ signal, from }) => {
      if (!mountedRef.current) return;
      if (peersRef.current[from]) {
        peersRef.current[from].peer.signal(signal);
      }
    });

    socketRef.current.on('user-left', (userId) => {
      if (!mountedRef.current) return;
      if (peersRef.current[userId]) {
        peersRef.current[userId].peer.destroy();
        delete peersRef.current[userId];
        setPeers(Object.values(peersRef.current));
        setConnectionStatus('User disconnected');
      }
    });

    return () => {
      mountedRef.current = false;
      // Do not disconnect shared socket; Dashboard and other modules may also use it.
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      Object.values(peersRef.current).forEach(({ peer }) => peer.destroy());
    };
  }, [roomId, user?._id, user?.username]);

  const createPeer = (targetUserId, callerId, stream) => {
    const peer = new Peer({
      initiator: true,
      trickle: false,
      stream: stream || undefined,
      config: {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
        ],
      },
    });

    peer.on('signal', signal => {
      if (socketRef.current) {
        socketRef.current.emit('send-signal', {
          signal,
          to: targetUserId,
          from: callerId,
          username: user?.username,
        });
      }
    });

    peer.on('stream', remoteStream => {
      const videoEl = document.getElementById(`video-${targetUserId}`);
      if (videoEl) videoEl.srcObject = remoteStream;
      const avatarEl = document.getElementById(`avatar-${targetUserId}`);
      if (avatarEl) avatarEl.style.display = 'none';
      setConnectionStatus(`Connected`);
      setStatusType('connected');
    });

    peer.on('error', err => console.error('Peer error:', err));
    return peer;
  };

  const addPeer = (incomingSignal, callerId, stream) => {
    const peer = new Peer({
      initiator: false,
      trickle: false,
      stream: stream || undefined,
      config: {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
        ],
      },
    });

    peer.on('signal', signal => {
      if (socketRef.current) {
        socketRef.current.emit('return-signal', { signal, to: callerId });
      }
    });

    peer.on('stream', remoteStream => {
      const videoEl = document.getElementById(`video-${callerId}`);
      if (videoEl) videoEl.srcObject = remoteStream;
      const avatarEl = document.getElementById(`avatar-${callerId}`);
      if (avatarEl) avatarEl.style.display = 'none';
      setConnectionStatus(`Connected`);
      setStatusType('connected');
    });

    peer.on('error', err => console.error('Peer error:', err));
    peer.signal(incomingSignal);
    return peer;
  };

  const toggleAudio = useCallback(() => {
    if (stream) {
      stream.getAudioTracks().forEach(track => (track.enabled = !audioEnabled));
      setAudioEnabled(!audioEnabled);
    }
  }, [stream, audioEnabled]);

  const toggleVideo = useCallback(() => {
    if (stream) {
      stream.getVideoTracks().forEach(track => (track.enabled = !videoEnabled));
      setVideoEnabled(!videoEnabled);
    }
  }, [stream, videoEnabled]);

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
        gap: '8px',
      }}>
        <Icons.Video />
        <p style={{ fontSize: '12px', margin: 0 }}>Join a room to start video</p>
      </div>
    );
  }

  const statusColors = {
    connected: { bg: 'rgba(16, 185, 129, 0.1)', text: 'var(--success)', border: 'rgba(16, 185, 129, 0.3)' },
    connecting: { bg: 'rgba(245, 158, 11, 0.1)', text: 'var(--warning)', border: 'rgba(245, 158, 11, 0.3)' },
    error: { bg: 'rgba(239, 68, 68, 0.1)', text: 'var(--error)', border: 'rgba(239, 68, 68, 0.3)' },
  };

  const currentStatusColor = statusColors[statusType] || statusColors.connecting;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--bg-tertiary)' }}>
      {/* Status Bar */}
      <div
        style={{
          padding: '6px 12px',
          background: currentStatusColor.bg,
          borderBottom: `1px solid ${currentStatusColor.border}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div
            style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              background: currentStatusColor.text,
              boxShadow: statusType === 'connected' ? `0 0 8px ${currentStatusColor.text}` : 'none',
            }}
          />
          <span style={{ fontSize: '11px', fontWeight: 500, color: currentStatusColor.text }}>
            {connectionStatus}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '10px', color: 'var(--text-tertiary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Icons.Users />
            {peers.length + 1}
          </span>
        </div>
      </div>

      {/* Video Grid */}
      <div
        style={{
          flex: 1,
          display: 'grid',
          gridTemplateColumns: peers.length === 0 ? '1fr' : peers.length === 1 ? 'repeat(2, 1fr)' : 'repeat(auto-fit, minmax(140px, 1fr))',
          gap: '8px',
          padding: '8px',
          overflow: 'auto',
        }}
      >
        {/* Local Video */}
        <div
          style={{
            position: 'relative',
            background: 'var(--bg-secondary)',
            borderRadius: '8px',
            overflow: 'hidden',
            aspectRatio: '16/9',
            border: '2px solid var(--primary)',
          }}
        >
          <video
            ref={userVideoRef}
            autoPlay
            muted
            playsInline
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              display: videoEnabled && stream ? 'block' : 'none',
              transform: 'scaleX(-1)',
            }}
          />
          {(!videoEnabled || !stream) && (
            <div
              style={{
                width: '100%',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                background: getAvatarColor(user?.username),
              }}
            >
              <div
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '50%',
                  background: 'rgba(0,0,0,0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '20px',
                  fontWeight: 700,
                  color: 'white',
                }}
              >
                {user?.username?.charAt(0).toUpperCase() || '?'}
              </div>
            </div>
          )}
          <div
            style={{
              position: 'absolute',
              bottom: '6px',
              left: '6px',
              background: 'rgba(0,0,0,0.6)',
              backdropFilter: 'blur(4px)',
              color: 'white',
              padding: '3px 8px',
              borderRadius: '4px',
              fontSize: '10px',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              fontWeight: 500,
            }}
          >
            <span>{user?.username || 'You'}</span>
            <span style={{ opacity: 0.7 }}>(You)</span>
            {!audioEnabled && <Icons.MicOff />}
          </div>
        </div>

        {/* Remote Videos */}
        {peers.map(peer => (
          <div
            key={peer.peerId}
            style={{
              position: 'relative',
              background: 'var(--bg-secondary)',
              borderRadius: '8px',
              overflow: 'hidden',
              aspectRatio: '16/9',
              border: '1px solid var(--border-primary)',
            }}
          >
            <video
              id={`video-${peer.peerId}`}
              autoPlay
              playsInline
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
            <div
              id={`avatar-${peer.peerId}`}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                background: getAvatarColor(peer.username),
              }}
            >
              <div
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '50%',
                  background: 'rgba(0,0,0,0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '20px',
                  fontWeight: 700,
                  color: 'white',
                }}
              >
                {peer.username?.charAt(0).toUpperCase() || '?'}
              </div>
            </div>
            <div
              style={{
                position: 'absolute',
                bottom: '6px',
                left: '6px',
                background: 'rgba(0,0,0,0.6)',
                backdropFilter: 'blur(4px)',
                color: 'white',
                padding: '3px 8px',
                borderRadius: '4px',
                fontSize: '10px',
                fontWeight: 500,
              }}
            >
              {peer.username}
            </div>
          </div>
        ))}
      </div>

      {/* Controls */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          gap: '12px',
          padding: '10px',
          background: 'var(--bg-secondary)',
          borderTop: '1px solid var(--border-primary)',
        }}
      >
        <button
          onClick={toggleAudio}
          style={{
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            border: 'none',
            background: audioEnabled ? 'var(--bg-tertiary)' : 'var(--error)',
            color: audioEnabled ? 'var(--text-primary)' : 'white',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all var(--transition-fast)',
            boxShadow: 'var(--shadow-sm)',
          }}
          onMouseEnter={e => {
            if (audioEnabled) e.currentTarget.style.background = 'var(--bg-hover)';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = audioEnabled ? 'var(--bg-tertiary)' : 'var(--error)';
          }}
          title={audioEnabled ? 'Mute' : 'Unmute'}
        >
          {audioEnabled ? <Icons.Mic /> : <Icons.MicOff />}
        </button>

        <button
          onClick={toggleVideo}
          style={{
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            border: 'none',
            background: videoEnabled ? 'var(--bg-tertiary)' : 'var(--error)',
            color: videoEnabled ? 'var(--text-primary)' : 'white',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all var(--transition-fast)',
            boxShadow: 'var(--shadow-sm)',
          }}
          onMouseEnter={e => {
            if (videoEnabled) e.currentTarget.style.background = 'var(--bg-hover)';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = videoEnabled ? 'var(--bg-tertiary)' : 'var(--error)';
          }}
          title={videoEnabled ? 'Turn off camera' : 'Turn on camera'}
        >
          {videoEnabled ? <Icons.Video /> : <Icons.VideoOff />}
        </button>
      </div>
    </div>
  );
};

export default GameChat;
