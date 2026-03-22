import React, { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';
import Peer from 'simple-peer';

// Browser polyfill for simple-peer (fixes "process.nextTick is not a function")
window.global = window;
window.process = window.process || { nextTick: (fn) => setTimeout(fn, 0) };

const GameChat = ({ user, roomId }) => {
  const [peers, setPeers] = useState([]);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [stream, setStream] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('Initializing...');
  const socketRef = useRef();
  const userVideoRef = useRef();
  const peersRef = useRef({});
  const mountedRef = useRef(true);
  const reconnectTimeout = useRef();

  useEffect(() => {
    mountedRef.current = true;
    if (roomId === 'lobby') return;

    console.log('🎥 GameChat mounting for room:', roomId);
    setConnectionStatus('Requesting camera & mic...');

    socketRef.current = io(import.meta.env.VITE_API_URL);

    // Try to get both video and audio
    navigator.mediaDevices.getUserMedia({ audio: true, video: true })
      .then(mediaStream => {
        if (!mountedRef.current) return;
        console.log('✅ Got media stream');
        setStream(mediaStream);
        if (userVideoRef.current) userVideoRef.current.srcObject = mediaStream;
        setConnectionStatus('Camera active – joining room...');
        socketRef.current.emit('join-room', {
          roomId,
          userId: user._id,
          username: user.username,
        });
        setTimeout(() => {
          if (mountedRef.current) setConnectionStatus('Waiting for others...');
        }, 1000);
      })
      .catch(err => {
        console.error('❌ Media error:', err);
        if (!mountedRef.current) return;
        setConnectionStatus('Camera/Mic access denied – audio only');
        // Still join the room without a stream
        socketRef.current.emit('join-room', {
          roomId,
          userId: user._id,
          username: user.username,
        });
      });

    socketRef.current.on('user-joined', ({ userId, username }) => {
      if (!mountedRef.current) return;
      console.log('👤 User joined:', username);
      setConnectionStatus(`${username} joined – connecting...`);
      if (!peersRef.current[userId]) {
        console.log('📞 Creating peer for:', username);
        const peer = createPeer(userId, socketRef.current.id, stream);
        peersRef.current[userId] = { peer, username, peerId: userId };
        setPeers(Object.values(peersRef.current));
      }
    });

    socketRef.current.on('receive-call', ({ signal, from, username }) => {
      if (!mountedRef.current) return;
      console.log('📞 Incoming call from:', username);
      setConnectionStatus(`Incoming call from ${username}...`);
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
      console.log('👋 User left:', userId);
      if (peersRef.current[userId]) {
        peersRef.current[userId].peer.destroy();
        delete peersRef.current[userId];
        setPeers(Object.values(peersRef.current));
        setConnectionStatus('User left');
      }
    });

    return () => {
      mountedRef.current = false;
      console.log('🎥 GameChat unmounting');
      if (reconnectTimeout.current) clearTimeout(reconnectTimeout.current);
      if (socketRef.current) socketRef.current.disconnect();
      if (stream) stream.getTracks().forEach(track => track.stop());
      Object.values(peersRef.current).forEach(({ peer }) => peer.destroy());
    };
  }, [roomId, user._id, user.username]);

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
      socketRef.current.emit('send-signal', {
        signal,
        to: targetUserId,
        from: callerId,
        username: user.username,
      });
    });

    peer.on('stream', remoteStream => {
      console.log('📹 Received remote stream from:', targetUserId);
      const videoEl = document.getElementById(`video-${targetUserId}`);
      if (videoEl) videoEl.srcObject = remoteStream;
      const avatarEl = document.getElementById(`avatar-${targetUserId}`);
      if (avatarEl) avatarEl.style.display = 'none';
      setConnectionStatus(`Connected to ${peersRef.current[targetUserId]?.username || 'user'}`);
    });

    peer.on('connect', () => {
      console.log('✅ Peer connected to:', targetUserId);
      setConnectionStatus(`Connected to ${peersRef.current[targetUserId]?.username || 'user'}`);
    });

    peer.on('error', err => {
      console.error('Peer error:', err);
      setConnectionStatus('Connection error – retrying...');
      reconnectTimeout.current = setTimeout(() => {
        if (mountedRef.current && !peersRef.current[targetUserId]) {
          const newPeer = createPeer(targetUserId, callerId, stream);
          peersRef.current[targetUserId] = { peer: newPeer, username: peersRef.current[targetUserId]?.username || 'user', peerId: targetUserId };
          setPeers(Object.values(peersRef.current));
        }
      }, 2000);
    });

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
      socketRef.current.emit('return-signal', { signal, to: callerId });
    });

    peer.on('stream', remoteStream => {
      console.log('📹 Received remote stream from:', callerId);
      const videoEl = document.getElementById(`video-${callerId}`);
      if (videoEl) videoEl.srcObject = remoteStream;
      const avatarEl = document.getElementById(`avatar-${callerId}`);
      if (avatarEl) avatarEl.style.display = 'none';
      setConnectionStatus(`Connected to ${peersRef.current[callerId]?.username || 'user'}`);
    });

    peer.on('connect', () => {
      console.log('✅ Peer connected to:', callerId);
      setConnectionStatus(`Connected to ${peersRef.current[callerId]?.username || 'user'}`);
    });

    peer.on('error', err => {
      console.error('Peer error:', err);
      setConnectionStatus('Connection error – retrying...');
    });

    peer.signal(incomingSignal);
    return peer;
  };

  const toggleAudio = () => {
    if (stream) {
      stream.getAudioTracks().forEach(track => (track.enabled = !audioEnabled));
      setAudioEnabled(!audioEnabled);
    }
  };

  const toggleVideo = () => {
    if (stream) {
      stream.getVideoTracks().forEach(track => (track.enabled = !videoEnabled));
      setVideoEnabled(!videoEnabled);
    }
  };

  const getInitials = name => name.charAt(0).toUpperCase();
  const getAvatarColor = username => {
    const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7'];
    let hash = 0;
    for (let i = 0; i < username.length; i++) hash = ((hash << 5) - hash) + username.charCodeAt(i);
    return colors[Math.abs(hash) % colors.length];
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#1e1e1e' }}>
      <div
        style={{
          padding: '6px',
          background: connectionStatus.includes('Error') ? '#f44336' : connectionStatus.includes('Connected') ? '#4CAF50' : '#ff9800',
          color: 'white',
          textAlign: 'center',
          fontSize: '11px',
          fontWeight: 500,
        }}
      >
        {connectionStatus}
      </div>

      <div
        style={{
          flex: 1,
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: '10px',
          padding: '10px',
          overflow: 'auto',
        }}
      >
        {/* Local video */}
        <div
          style={{
            position: 'relative',
            background: '#2c2c2c',
            borderRadius: '8px',
            overflow: 'hidden',
            aspectRatio: '16/9',
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
                background: getAvatarColor(user.username),
                color: 'white',
              }}
            >
              <div
                style={{
                  width: '80px',
                  height: '80px',
                  borderRadius: '50%',
                  background: 'rgba(0,0,0,0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '40px',
                  fontWeight: 'bold',
                }}
              >
                {getInitials(user.username)}
              </div>
              <div style={{ marginTop: '10px', fontSize: '14px', fontWeight: 'bold' }}>
                {user.username}
              </div>
              <div style={{ fontSize: '12px', opacity: 0.8, marginTop: '4px' }}>Camera off</div>
            </div>
          )}
          <div
            style={{
              position: 'absolute',
              bottom: '10px',
              left: '10px',
              background: 'rgba(0,0,0,0.6)',
              color: 'white',
              padding: '4px 8px',
              borderRadius: '4px',
              fontSize: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <span>{user.username} (You)</span>
            {!audioEnabled && <span>🔇</span>}
          </div>
        </div>

        {/* Remote videos */}
        {peers.map(peer => (
          <div
            key={peer.peerId}
            style={{
              position: 'relative',
              background: '#2c2c2c',
              borderRadius: '8px',
              overflow: 'hidden',
              aspectRatio: '16/9',
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
                color: 'white',
                zIndex: 5,
              }}
            >
              <div
                style={{
                  width: '80px',
                  height: '80px',
                  borderRadius: '50%',
                  background: 'rgba(0,0,0,0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '40px',
                  fontWeight: 'bold',
                }}
              >
                {getInitials(peer.username)}
              </div>
              <div style={{ marginTop: '10px', fontSize: '14px', fontWeight: 'bold' }}>
                {peer.username}
              </div>
              <div style={{ fontSize: '12px', opacity: 0.8, marginTop: '4px' }}>Camera off</div>
            </div>
            <div
              style={{
                position: 'absolute',
                bottom: '10px',
                left: '10px',
                background: 'rgba(0,0,0,0.6)',
                color: 'white',
                padding: '4px 8px',
                borderRadius: '4px',
                fontSize: '12px',
                zIndex: 10,
              }}
            >
              {peer.username}
            </div>
          </div>
        ))}
      </div>

      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          gap: '15px',
          padding: '15px',
          background: '#2c2c2c',
        }}
      >
        <button
          onClick={toggleAudio}
          style={{
            width: '50px',
            height: '50px',
            borderRadius: '50%',
            border: 'none',
            background: audioEnabled ? '#4CAF50' : '#f44336',
            color: 'white',
            fontSize: '20px',
            cursor: 'pointer',
          }}
        >
          {audioEnabled ? '🎤' : '🔇'}
        </button>
        <button
          onClick={toggleVideo}
          style={{
            width: '50px',
            height: '50px',
            borderRadius: '50%',
            border: 'none',
            background: videoEnabled ? '#2196F3' : '#f44336',
            color: 'white',
            fontSize: '20px',
            cursor: 'pointer',
          }}
        >
          {videoEnabled ? '📹' : '🚫'}
        </button>
      </div>
    </div>
  );
};

export default GameChat;