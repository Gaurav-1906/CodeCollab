import React, { useState, useEffect } from 'react';
import AddFriend from './AddFriend';

const FriendsList = ({ user, currentRoom, onJoinRoom, socket, onNotification }) => {
  const [friends, setFriends] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [showRequests, setShowRequests] = useState(false);
  const [pendingInvites, setPendingInvites] = useState([]);

  useEffect(() => {
    if (!socket) return;
    console.log('✅ FriendsList: Socket ID', socket.id);

    const loadFriends = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch('http://localhost:5000/api/users/friends', {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await response.json();
        if (response.ok) {
          // Format initial status display
          const formatted = data.map(friend => ({
            ...friend,
            statusDisplay: friend.status === 'online'
              ? (friend.currentRoom ? `📍 ${friend.currentRoom}` : '● Online')
              : '● Offline'
          }));
          setFriends(formatted);
        }
      } catch (err) {
        console.error('Error loading friends:', err);
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
      console.log('🎮 INVITE RECEIVED', { from, room, fromUsername });
      const invite = { from, room, fromUsername, timestamp: Date.now() };
      setPendingInvites(prev => [...prev, invite]);
      setTimeout(() => {
        setPendingInvites(prev => prev.filter(inv => inv.timestamp !== invite.timestamp));
      }, 10000);
    });

    socket.on('friend-request-accepted', ({ friend }) => {
      loadFriends();
      onNotification(`${friend.username} accepted your friend request!`, 'success');
    });

    // Correct status update using the `status` field
    socket.on('friend-status-changed', ({ username, status, currentRoom: friendRoom }) => {
      console.log('📡 friend-status-changed:', { username, status, friendRoom });

      // Determine display text
      let statusDisplay = '';
      if (status === 'online') {
        statusDisplay = friendRoom ? `📍 ${friendRoom}` : '● Online';
      } else {
        statusDisplay = '● Offline';
      }

      onNotification(
        `${username} is now ${friendRoom ? `in room: ${friendRoom}` : status === 'online' ? 'online' : 'offline'}`,
        status === 'online' ? 'success' : 'warning'
      );

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
      onNotification(`${fromUsername} rejected your invite.`, 'warning');
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

  const acceptInvite = (invite) => {
    socket.emit('accept-invite', {
      to: invite.from,
      from: user._id,
      fromUsername: user.username,
      room: invite.room
    });
    setPendingInvites(prev => prev.filter(inv => inv.timestamp !== invite.timestamp));
    onJoinRoom(invite.room);
    onNotification(`You joined ${invite.fromUsername}'s room!`, 'success');
  };

  const rejectInvite = (invite) => {
    socket.emit('reject-invite', {
      to: invite.from,
      from: user._id,
      fromUsername: user.username,
      room: invite.room
    });
    setPendingInvites(prev => prev.filter(inv => inv.timestamp !== invite.timestamp));
    onNotification(`You declined ${invite.fromUsername}'s invite.`, 'info');
  };

  const acceptRequest = (friendId, username) => {
    socket.emit('accept-friend-request', {
      to: friendId,
      from: user._id,
      fromUsername: user.username
    });
    setPendingRequests(prev => prev.filter(r => r.userId !== friendId));
  };

  const rejectRequest = (friendId) => {
    socket.emit('reject-friend-request', {
      to: friendId,
      from: user._id
    });
    setPendingRequests(prev => prev.filter(r => r.userId !== friendId));
  };

  const sendInvite = (friendId, friendUsername, friendCurrentRoom) => {
    if (friendCurrentRoom && friendCurrentRoom !== 'lobby') {
      const confirmSend = window.confirm(
        `${friendUsername} is currently in room "${friendCurrentRoom}". Do you still want to send an invite?`
      );
      if (!confirmSend) return;
    }
    console.log('📤 Sending invite to:', friendUsername, 'room:', currentRoom);
    socket.emit('send-invite', {
      to: friendId,
      from: user._id,
      fromUsername: user.username,
      room: currentRoom
    });
    onNotification(`Invite sent to ${friendUsername}!`, 'info');
  };

  return (
    <div style={{ background: '#2d2d2d', borderRadius: '10px', padding: '15px', color: 'white', height: '100%', overflowY: 'auto' }}>
      <AddFriend user={user} socket={socket} onFriendAdded={() => {}} />

      {pendingRequests.length > 0 && (
        <div style={{ marginBottom: '20px' }}>
          <button onClick={() => setShowRequests(!showRequests)} style={{ width: '100%', padding: '8px', background: '#ff9800', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', marginBottom: '10px' }}>
            📨 Friend Requests ({pendingRequests.length})
          </button>
          {showRequests && pendingRequests.map(req => (
            <div key={req.userId} style={{ background: '#3c3c3c', padding: '10px', borderRadius: '5px', marginBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>{req.username}</span>
              <div>
                <button onClick={() => acceptRequest(req.userId, req.username)} style={{ padding: '4px 8px', background: '#4CAF50', color: 'white', border: 'none', borderRadius: '3px', cursor: 'pointer', marginRight: '5px' }}>Accept</button>
                <button onClick={() => rejectRequest(req.userId)} style={{ padding: '4px 8px', background: '#f44336', color: 'white', border: 'none', borderRadius: '3px', cursor: 'pointer' }}>Reject</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {pendingInvites.length > 0 && (
        <div style={{ marginBottom: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {pendingInvites.map(invite => (
            <div key={invite.timestamp} style={{ background: '#3c3c3c', padding: '12px', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: 'bold' }}>{invite.fromUsername}</div>
                <div style={{ fontSize: '11px', color: '#aaa' }}>invited you to room: {invite.room}</div>
              </div>
              <div>
                <button onClick={() => acceptInvite(invite)} style={{ padding: '4px 10px', background: '#4CAF50', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', marginRight: '6px' }}>Accept</button>
                <button onClick={() => rejectInvite(invite)} style={{ padding: '4px 10px', background: '#f44336', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Reject</button>
              </div>
            </div>
          ))}
        </div>
      )}

      <h3 style={{ margin: '0 0 15px 0' }}>👥 Friends ({friends.length})</h3>

      {friends.length === 0 ? (
        <div style={{ textAlign: 'center', color: '#888', padding: '20px' }}>No friends yet. Search for friends above!</div>
      ) : (
        friends.map(friend => (
          <div key={friend._id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px', marginBottom: '8px', background: '#3c3c3c', borderRadius: '8px' }}>
            <div>
              <div style={{ fontWeight: 'bold' }}>{friend.username}</div>
              <div style={{ fontSize: '11px', color: friend.statusDisplay === '● Offline' ? '#888' : (friend.currentRoom ? '#ff9800' : '#4CAF50') }}>
                {friend.statusDisplay}
              </div>
            </div>
            <button
              onClick={() => sendInvite(friend._id, friend.username, friend.currentRoom)}
              style={{ padding: '6px 12px', background: '#2196F3', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontSize: '12px' }}
            >
              🎮 Invite to Code
            </button>
          </div>
        ))
      )}
    </div>
  );
};

export default FriendsList;