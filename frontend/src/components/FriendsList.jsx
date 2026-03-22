import React, { useState, useEffect, useCallback } from 'react';
import AddFriend from './AddFriend';

// Icons
const Icons = {
  UserPlus: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="8.5" cy="7" r="4" />
      <line x1="20" y1="8" x2="20" y2="14" />
      <line x1="23" y1="11" x2="17" y2="11" />
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
  Code: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="16 18 22 12 16 6" />
      <polyline points="8 6 2 12 8 18" />
    </svg>
  ),
  Check: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  ),
  X: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  ),
  Bell: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  ),
  ChevronDown: () => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  ),
  ChevronUp: () => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="18 15 12 9 6 15" />
    </svg>
  ),
  MapPin: () => (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  ),
};

const FriendsList = ({ user, currentRoom, onJoinRoom, socket, onNotification }) => {
  const [friends, setFriends] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [showRequests, setShowRequests] = useState(false);
  const [pendingInvites, setPendingInvites] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

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
    if (!socket) return;

    const loadFriends = async () => {
      setIsLoading(true);
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${import.meta.env.VITE_API_URL}/api/users/friends`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await response.json();
        if (response.ok) {
          const formatted = data.map(friend => ({
            ...friend,
            statusDisplay: friend.status === 'online'
              ? (friend.currentRoom ? friend.currentRoom : 'Online')
              : 'Offline'
          }));
          setFriends(formatted);
        }
      } catch (err) {
        console.error('Error loading friends:', err);
      } finally {
        setIsLoading(false);
      }
    };
    loadFriends();

    socket.on('friend-request-received', ({ from, fromUsername }) => {
      onNotification(`Friend request from ${fromUsername}`, 'info');
      setPendingRequests(prev => {
        if (!prev.find(r => r.userId === from)) {
          return [...prev, { userId: from, username: fromUsername }];
        }
        return prev;
      });
    });

    socket.on('invite-received', ({ from, room, fromUsername }) => {
      const invite = { from, room, fromUsername, timestamp: Date.now() };
      setPendingInvites(prev => [...prev, invite]);
      setTimeout(() => {
        setPendingInvites(prev => prev.filter(inv => inv.timestamp !== invite.timestamp));
      }, 15000);
    });

    socket.on('friend-request-accepted', ({ friend }) => {
      loadFriends();
      onNotification(`${friend.username} accepted your request!`, 'success');
    });

    socket.on('friend-status-changed', ({ username, status, currentRoom: friendRoom }) => {
      let statusDisplay = status === 'online' 
        ? (friendRoom ? friendRoom : 'Online') 
        : 'Offline';

      setFriends(prev =>
        prev.map(f =>
          f.username === username
            ? { ...f, status, currentRoom: friendRoom, statusDisplay }
            : f
        )
      );
    });

    socket.on('invite-accepted', ({ fromUsername }) => {
      onNotification(`${fromUsername} accepted your invite!`, 'success');
    });

    socket.on('invite-rejected', ({ fromUsername }) => {
      onNotification(`${fromUsername} declined your invite`, 'warning');
    });

    return () => {
      socket.off('friend-request-received');
      socket.off('invite-received');
      socket.off('friend-request-accepted');
      socket.off('friend-status-changed');
      socket.off('invite-accepted');
      socket.off('invite-rejected');
    };
  }, [socket, user._id, onNotification]);

  const acceptInvite = useCallback((invite) => {
    socket.emit('accept-invite', {
      to: invite.from,
      from: user._id,
      fromUsername: user.username,
      room: invite.room
    });
    setPendingInvites(prev => prev.filter(inv => inv.timestamp !== invite.timestamp));
    onJoinRoom(invite.room);
    onNotification(`Joined ${invite.fromUsername}'s room`, 'success');
  }, [socket, user, onJoinRoom, onNotification]);

  const rejectInvite = useCallback((invite) => {
    socket.emit('reject-invite', {
      to: invite.from,
      from: user._id,
      fromUsername: user.username,
      room: invite.room
    });
    setPendingInvites(prev => prev.filter(inv => inv.timestamp !== invite.timestamp));
  }, [socket, user]);

  const acceptRequest = useCallback((friendId, username) => {
    socket.emit('accept-friend-request', {
      to: friendId,
      from: user._id,
      fromUsername: user.username
    });
    setPendingRequests(prev => prev.filter(r => r.userId !== friendId));
    onNotification(`Added ${username} as a friend`, 'success');
  }, [socket, user, onNotification]);

  const rejectRequest = useCallback((friendId) => {
    socket.emit('reject-friend-request', {
      to: friendId,
      from: user._id
    });
    setPendingRequests(prev => prev.filter(r => r.userId !== friendId));
  }, [socket, user]);

  const sendInvite = useCallback((friendId, friendUsername, friendCurrentRoom) => {
    if (currentRoom === 'lobby') {
      onNotification('Join a room first to invite friends', 'warning');
      return;
    }
    socket.emit('send-invite', {
      to: friendId,
      from: user._id,
      fromUsername: user.username,
      room: currentRoom
    });
    onNotification(`Invite sent to ${friendUsername}`, 'info');
  }, [socket, user, currentRoom, onNotification]);

  const onlineFriends = friends.filter(f => f.status === 'online');
  const offlineFriends = friends.filter(f => f.status !== 'online');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {/* Add Friend Section */}
      <AddFriend user={user} socket={socket} onFriendAdded={() => {}} onNotification={onNotification} />

      {/* Pending Invites */}
      {pendingInvites.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {pendingInvites.map(invite => (
            <div
              key={invite.timestamp}
              style={{
                background: 'var(--primary-light)',
                border: '1px solid var(--primary-border)',
                borderRadius: '10px',
                padding: '12px',
                animation: 'fadeInUp 0.3s ease',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div
                    style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '50%',
                      background: getAvatarColor(invite.fromUsername),
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                      fontWeight: 600,
                      fontSize: '11px',
                    }}
                  >
                    {invite.fromUsername?.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                      {invite.fromUsername}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>
                      invites you to code together
                    </div>
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => acceptInvite(invite)}
                  style={{
                    flex: 1,
                    padding: '6px 12px',
                    background: 'var(--primary)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '12px',
                    fontWeight: 500,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '4px',
                    transition: 'all var(--transition-fast)',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--primary-hover)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'var(--primary)'}
                >
                  <Icons.Check /> Accept
                </button>
                <button
                  onClick={() => rejectInvite(invite)}
                  style={{
                    padding: '6px 12px',
                    background: 'transparent',
                    color: 'var(--text-secondary)',
                    border: '1px solid var(--border-primary)',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '12px',
                    fontWeight: 500,
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
                >
                  <Icons.X />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pending Requests */}
      {pendingRequests.length > 0 && (
        <div>
          <button
            onClick={() => setShowRequests(!showRequests)}
            style={{
              width: '100%',
              padding: '10px 12px',
              background: 'var(--warning)',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: 500,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              transition: 'all var(--transition-fast)',
            }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Icons.Bell />
              Friend Requests ({pendingRequests.length})
            </span>
            {showRequests ? <Icons.ChevronUp /> : <Icons.ChevronDown />}
          </button>

          {showRequests && (
            <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {pendingRequests.map(req => (
                <div
                  key={req.userId}
                  style={{
                    background: 'var(--bg-tertiary)',
                    padding: '10px',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    border: '1px solid var(--border-primary)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div
                      style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: '50%',
                        background: getAvatarColor(req.username),
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                        fontWeight: 600,
                        fontSize: '11px',
                      }}
                    >
                      {req.username?.charAt(0).toUpperCase()}
                    </div>
                    <span style={{ fontSize: '13px', color: 'var(--text-primary)', fontWeight: 500 }}>
                      {req.username}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button
                      onClick={() => acceptRequest(req.userId, req.username)}
                      style={{
                        padding: '5px 10px',
                        background: 'var(--primary)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '5px',
                        cursor: 'pointer',
                        fontSize: '11px',
                        fontWeight: 500,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '3px',
                      }}
                    >
                      <Icons.Check /> Accept
                    </button>
                    <button
                      onClick={() => rejectRequest(req.userId)}
                      style={{
                        padding: '5px 8px',
                        background: 'transparent',
                        color: 'var(--text-tertiary)',
                        border: '1px solid var(--border-primary)',
                        borderRadius: '5px',
                        cursor: 'pointer',
                        fontSize: '11px',
                        display: 'flex',
                        alignItems: 'center',
                      }}
                    >
                      <Icons.X />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Friends List */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
          <Icons.Users />
          <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Friends ({friends.length})
          </span>
        </div>

        {isLoading ? (
          <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-tertiary)' }}>
            <div className="spinner" style={{ margin: '0 auto 8px' }} />
            <p style={{ fontSize: '12px', margin: 0 }}>Loading friends...</p>
          </div>
        ) : friends.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-tertiary)' }}>
            <Icons.UserPlus />
            <p style={{ fontSize: '12px', margin: '8px 0 0' }}>No friends yet. Add some above!</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {/* Online Friends */}
            {onlineFriends.length > 0 && (
              <>
                <div style={{ fontSize: '10px', color: 'var(--success)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginTop: '4px' }}>
                  Online ({onlineFriends.length})
                </div>
                {onlineFriends.map(friend => (
                  <FriendCard
                    key={friend._id}
                    friend={friend}
                    currentRoom={currentRoom}
                    onInvite={sendInvite}
                    getAvatarColor={getAvatarColor}
                  />
                ))}
              </>
            )}

            {/* Offline Friends */}
            {offlineFriends.length > 0 && (
              <>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginTop: '8px' }}>
                  Offline ({offlineFriends.length})
                </div>
                {offlineFriends.map(friend => (
                  <FriendCard
                    key={friend._id}
                    friend={friend}
                    currentRoom={currentRoom}
                    onInvite={sendInvite}
                    getAvatarColor={getAvatarColor}
                  />
                ))}
              </>
            )}
          </div>
        )}
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
      `}</style>
    </div>
  );
};

// Friend Card Component
const FriendCard = ({ friend, currentRoom, onInvite, getAvatarColor }) => {
  const isOnline = friend.status === 'online';
  const inRoom = friend.currentRoom && friend.currentRoom !== 'lobby';

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '10px',
        background: 'var(--bg-tertiary)',
        borderRadius: '8px',
        border: '1px solid var(--border-primary)',
        transition: 'all var(--transition-fast)',
      }}
      onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
      onMouseLeave={e => e.currentTarget.style.background = 'var(--bg-tertiary)'}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <div style={{ position: 'relative' }}>
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              background: getAvatarColor(friend.username),
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontWeight: 600,
              fontSize: '12px',
              opacity: isOnline ? 1 : 0.6,
            }}
          >
            {friend.username?.charAt(0).toUpperCase()}
          </div>
          <div
            style={{
              position: 'absolute',
              bottom: '-1px',
              right: '-1px',
              width: '10px',
              height: '10px',
              borderRadius: '50%',
              background: isOnline ? 'var(--success)' : 'var(--text-muted)',
              border: '2px solid var(--bg-tertiary)',
              boxShadow: isOnline ? '0 0 6px var(--success)' : 'none',
            }}
          />
        </div>
        <div>
          <div style={{ fontSize: '13px', fontWeight: 500, color: isOnline ? 'var(--text-primary)' : 'var(--text-tertiary)' }}>
            {friend.username}
          </div>
          <div style={{ fontSize: '11px', color: inRoom ? 'var(--warning)' : (isOnline ? 'var(--success)' : 'var(--text-muted)'), display: 'flex', alignItems: 'center', gap: '4px' }}>
            {inRoom && <Icons.MapPin />}
            {friend.statusDisplay}
          </div>
        </div>
      </div>

      {isOnline && (
        <button
          onClick={() => onInvite(friend._id, friend.username, friend.currentRoom)}
          style={{
            padding: '6px 10px',
            background: currentRoom !== 'lobby' ? 'var(--accent)' : 'var(--bg-hover)',
            color: currentRoom !== 'lobby' ? 'white' : 'var(--text-muted)',
            border: 'none',
            borderRadius: '6px',
            cursor: currentRoom !== 'lobby' ? 'pointer' : 'not-allowed',
            fontSize: '11px',
            fontWeight: 500,
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            transition: 'all var(--transition-fast)',
          }}
          disabled={currentRoom === 'lobby'}
          onMouseEnter={e => {
            if (currentRoom !== 'lobby') {
              e.currentTarget.style.background = 'var(--accent-hover)';
              e.currentTarget.style.transform = 'scale(1.02)';
            }
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = currentRoom !== 'lobby' ? 'var(--accent)' : 'var(--bg-hover)';
            e.currentTarget.style.transform = 'scale(1)';
          }}
          title={currentRoom === 'lobby' ? 'Join a room first' : 'Invite to code'}
        >
          <Icons.Code />
          Invite
        </button>
      )}
    </div>
  );
};

export default FriendsList;
