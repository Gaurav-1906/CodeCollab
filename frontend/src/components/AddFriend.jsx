import React, { useState } from 'react';

const AddFriend = ({ user, socket, onFriendAdded }) => {
  const [searchId, setSearchId] = useState('');
  const [searchResult, setSearchResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const searchUser = async () => {
    if (!searchId.trim()) {
      setMessage('Please enter a username');
      return;
    }

    setLoading(true);
    setMessage('');
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/api/users/search?q=${encodeURIComponent(searchId)}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setSearchResult(data);
        setMessage(`User found: ${data.username}`);
      } else {
        setMessage(data.message || 'User not found');
        setSearchResult(null);
      }
    } catch (err) {
      console.error('Search error:', err);
      setMessage('Error searching for user');
      setSearchResult(null);
    } finally {
      setLoading(false);
    }
  };

  const sendFriendRequest = () => {
    if (!searchResult) return;
    
    if (!socket) {
      setMessage('❌ Socket not connected. Please refresh the page.');
      return;
    }
    
    socket.emit('send-friend-request', {
      to: searchResult._id,
      from: user._id,
      fromUsername: user.username
    });
    
    setMessage(`Friend request sent to ${searchResult.username}!`);
    setSearchResult(null);
    setSearchId('');
    if (onFriendAdded) onFriendAdded();
  };

  return (
    <div style={{
      background: '#2d2d2d',
      borderRadius: '10px',
      padding: '15px',
      marginBottom: '15px'
    }}>
      <h4 style={{ margin: '0 0 10px 0', color: 'white' }}>➕ Add Friend</h4>
      
      <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
        <input
          type="text"
          placeholder="Enter username (e.g., Narendra)"
          value={searchId}
          onChange={(e) => setSearchId(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && searchUser()}
          style={{
            flex: 1,
            padding: '8px 12px',
            border: 'none',
            borderRadius: '5px',
            background: '#3c3c3c',
            color: 'white',
            outline: 'none'
          }}
        />
        <button
          onClick={searchUser}
          disabled={loading}
          style={{
            padding: '8px 16px',
            background: '#2196F3',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer'
          }}
        >
          {loading ? '...' : 'Search'}
        </button>
      </div>

      {searchResult && (
        <div style={{
          background: '#3c3c3c',
          padding: '10px',
          borderRadius: '5px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <div style={{ color: 'white', fontWeight: 'bold' }}>{searchResult.username}</div>
            <div style={{ color: '#888', fontSize: '12px' }}>ID: {searchResult._id.slice(-8)}</div>
          </div>
          <button
            onClick={sendFriendRequest}
            style={{
              padding: '6px 12px',
              background: '#4CAF50',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer'
            }}
          >
            Add Friend
          </button>
        </div>
      )}

      {message && (
        <div style={{
          marginTop: '10px',
          padding: '8px',
          background: message.includes('sent') || message.includes('found') ? '#4CAF50' : '#f44336',
          color: 'white',
          borderRadius: '5px',
          fontSize: '12px',
          textAlign: 'center'
        }}>
          {message}
        </div>
      )}
    </div>
  );
};

export default AddFriend;