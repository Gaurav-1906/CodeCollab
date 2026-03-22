import React, { useState, useRef, useEffect } from 'react';
import Peer from 'peerjs';

const VoiceCall = ({ user }) => {
  const [peerId, setPeerId] = useState('Connecting...');
  const [remoteId, setRemoteId] = useState('');
  const [callStatus, setCallStatus] = useState('disconnected');
  const [incomingCall, setIncomingCall] = useState(null);
  const [videoEnabled, setVideoEnabled] = useState(false);
  const [muted, setMuted] = useState(false);
  
  const peerRef = useRef(null);
  const localStreamRef = useRef(null);
  const callRef = useRef(null);
  
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const localAudioRef = useRef(null);
  const remoteAudioRef = useRef(null);

  useEffect(() => {
    const peer = new Peer();

    peer.on('open', (id) => {
      console.log('✅ Connected to PeerJS server with ID:', id);
      setPeerId(id);
    });

    peer.on('call', (call) => {
      console.log('📞 Incoming call from:', call.peer);
      setIncomingCall(call);
    });

    peer.on('error', (err) => {
      console.error('PeerJS error:', err);
    });

    peerRef.current = peer;

    return () => {
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
      }
      if (peerRef.current) {
        peerRef.current.destroy();
      }
    };
  }, []);

  const startLocalStream = async (withVideo = false) => {
    try {
      const constraints = {
        audio: true,
        video: withVideo ? {
          width: { ideal: 640 },
          height: { ideal: 480 }
        } : false
      };
      
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      localStreamRef.current = stream;
      
      if (localAudioRef.current) {
        localAudioRef.current.srcObject = stream;
      }
      
      if (withVideo && localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
        setVideoEnabled(true);
      }
      
      return stream;
    } catch (err) {
      console.error('Media error:', err);
      alert('Please allow camera and microphone access');
      return null;
    }
  };

  const makeCall = async (withVideo = false) => {
    if (!remoteId) {
      alert('Please enter a peer ID');
      return;
    }

    try {
      setCallStatus('connecting');
      const stream = await startLocalStream(withVideo);
      if (!stream) return;

      const call = peerRef.current.call(remoteId, stream);
      callRef.current = call;

      call.on('stream', (remoteStream) => {
        if (remoteAudioRef.current) {
          remoteAudioRef.current.srcObject = remoteStream;
        }
        if (withVideo && remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = remoteStream;
        }
        setCallStatus('connected');
      });

      call.on('close', () => {
        endCall();
      });

    } catch (err) {
      console.error('Call error:', err);
      alert('Call failed');
      setCallStatus('disconnected');
    }
  };

  const answerCall = async () => {
    if (!incomingCall) return;

    try {
      setCallStatus('connecting');
      // Check if incoming call has video
      const hasVideo = incomingCall.metadata?.video || false;
      const stream = await startLocalStream(hasVideo);
      if (!stream) return;

      incomingCall.answer(stream);
      callRef.current = incomingCall;

      incomingCall.on('stream', (remoteStream) => {
        if (remoteAudioRef.current) {
          remoteAudioRef.current.srcObject = remoteStream;
        }
        if (hasVideo && remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = remoteStream;
          setVideoEnabled(true);
        }
        setCallStatus('connected');
        setIncomingCall(null);
      });

    } catch (err) {
      console.error('Answer error:', err);
      setCallStatus('disconnected');
    }
  };

  const rejectCall = () => {
    if (incomingCall) {
      incomingCall.close();
      setIncomingCall(null);
    }
  };

  const endCall = () => {
    if (callRef.current) {
      callRef.current.close();
    }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
    }
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null;
    }
    if (remoteAudioRef.current) {
      remoteAudioRef.current.srcObject = null;
    }
    setCallStatus('disconnected');
    setVideoEnabled(false);
    setMuted(false);
  };

  const toggleMute = () => {
    if (localStreamRef.current) {
      const audioTracks = localStreamRef.current.getAudioTracks();
      audioTracks.forEach(track => {
        track.enabled = muted;
      });
      setMuted(!muted);
    }
  };

  const toggleVideo = () => {
    if (localStreamRef.current) {
      const videoTracks = localStreamRef.current.getVideoTracks();
      if (videoTracks.length > 0) {
        videoTracks.forEach(track => {
          track.enabled = !videoEnabled;
        });
        setVideoEnabled(!videoEnabled);
      }
    }
  };

  return (
    <div style={{
      background: 'white',
      padding: '20px',
      borderRadius: '10px',
      margin: '20px 0',
      boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
    }}>
      <h2 style={{ margin: '0 0 15px 0', color: '#333' }}>📹 Video Call</h2>
      
      {/* Video containers */}
      <div style={{
        display: 'flex',
        gap: '10px',
        marginBottom: '15px'
      }}>
        {/* Local video */}
        <div style={{
          flex: 1,
          background: '#000',
          borderRadius: '5px',
          overflow: 'hidden',
          minHeight: '150px'
        }}>
          <video
            ref={localVideoRef}
            autoPlay
            muted
            playsInline
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              display: videoEnabled ? 'block' : 'none'
            }}
          />
          {!videoEnabled && (
            <div style={{
              color: 'white',
              textAlign: 'center',
              padding: '50px',
              background: '#333'
            }}>
              📹 Camera off
            </div>
          )}
        </div>
        
        {/* Remote video */}
        <div style={{
          flex: 1,
          background: '#000',
          borderRadius: '5px',
          overflow: 'hidden',
          minHeight: '150px'
        }}>
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover'
            }}
          />
        </div>
      </div>

      {/* Hidden audio elements */}
      <audio ref={localAudioRef} autoPlay muted style={{ display: 'none' }} />
      <audio ref={remoteAudioRef} autoPlay style={{ display: 'none' }} />

      {/* Peer ID Status */}
      <div style={{
        background: '#e3f2fd',
        padding: '10px',
        borderRadius: '5px',
        marginBottom: '15px'
      }}>
        <strong>Your Peer ID:</strong> {peerId}
      </div>

      {/* Incoming Call */}
      {incomingCall && (
        <div style={{
          background: '#4CAF50',
          color: 'white',
          padding: '15px',
          borderRadius: '5px',
          marginBottom: '15px',
          textAlign: 'center',
          animation: 'pulse 1.5s infinite'
        }}>
          <p style={{ margin: '0 0 10px 0' }}>📞 Incoming video call...</p>
          <div>
            <button 
              onClick={answerCall}
              style={{
                background: 'white',
                color: '#4CAF50',
                border: 'none',
                padding: '8px 20px',
                margin: '0 5px',
                borderRadius: '5px',
                cursor: 'pointer',
                fontWeight: 'bold'
              }}
            >
              Answer
            </button>
            <button 
              onClick={rejectCall}
              style={{
                background: '#f44336',
                color: 'white',
                border: 'none',
                padding: '8px 20px',
                margin: '0 5px',
                borderRadius: '5px',
                cursor: 'pointer',
                fontWeight: 'bold'
              }}
            >
              Reject
            </button>
          </div>
        </div>
      )}

      {/* Call Controls */}
      {peerId !== 'Connecting...' && (
        <div>
          <input
            type="text"
            placeholder="Enter peer ID to call"
            value={remoteId}
            onChange={(e) => setRemoteId(e.target.value)}
            disabled={callStatus === 'connected'}
            style={{
              width: '100%',
              padding: '10px',
              marginBottom: '10px',
              border: '1px solid #ddd',
              borderRadius: '5px',
              fontSize: '14px'
            }}
          />
          
          {callStatus === 'disconnected' ? (
            <div style={{ display: 'flex', gap: '10px' }}>
              <button 
                onClick={() => makeCall(false)}
                style={{
                  flex: 1,
                  padding: '12px',
                  background: '#4CAF50',
                  color: 'white',
                  border: 'none',
                  borderRadius: '5px',
                  cursor: 'pointer',
                  fontSize: '16px',
                  fontWeight: 'bold'
                }}
              >
                🎤 Voice Call
              </button>
              <button 
                onClick={() => makeCall(true)}
                style={{
                  flex: 1,
                  padding: '12px',
                  background: '#2196F3',
                  color: 'white',
                  border: 'none',
                  borderRadius: '5px',
                  cursor: 'pointer',
                  fontSize: '16px',
                  fontWeight: 'bold'
                }}
              >
                📹 Video Call
              </button>
            </div>
          ) : (
            <div>
              <div style={{ 
                display: 'flex', 
                gap: '10px',
                marginBottom: '10px'
              }}>
                <div style={{
                  flex: 1,
                  padding: '10px',
                  background: '#e8f5e8',
                  borderRadius: '5px',
                  textAlign: 'center',
                  color: '#4CAF50',
                  fontWeight: 'bold'
                }}>
                  {callStatus === 'connecting' ? 'Connecting...' : '🔴 Connected'}
                </div>
                <button 
                  onClick={toggleMute}
                  style={{
                    padding: '10px 20px',
                    background: muted ? '#4CAF50' : '#ff9800',
                    color: 'white',
                    border: 'none',
                    borderRadius: '5px',
                    cursor: 'pointer',
                    fontWeight: 'bold'
                  }}
                >
                  {muted ? 'Unmute' : 'Mute'}
                </button>
                {videoEnabled && (
                  <button 
                    onClick={toggleVideo}
                    style={{
                      padding: '10px 20px',
                      background: '#2196F3',
                      color: 'white',
                      border: 'none',
                      borderRadius: '5px',
                      cursor: 'pointer',
                      fontWeight: 'bold'
                    }}
                  >
                    {videoEnabled ? 'Hide Video' : 'Show Video'}
                  </button>
                )}
              </div>
              <button 
                onClick={endCall}
                style={{
                  width: '100%',
                  padding: '12px',
                  background: '#f44336',
                  color: 'white',
                  border: 'none',
                  borderRadius: '5px',
                  cursor: 'pointer',
                  fontSize: '16px',
                  fontWeight: 'bold'
                }}
              >
                End Call
              </button>
            </div>
          )}
        </div>
      )}

      <style>{`
        @keyframes pulse {
          0% { opacity: 1; }
          50% { opacity: 0.8; }
          100% { opacity: 1; }
        }
      `}</style>
    </div>
  );
};

export default VoiceCall;