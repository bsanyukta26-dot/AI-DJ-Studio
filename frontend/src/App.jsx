

import React, { useState, useEffect, useRef } from 'react';
import { apiRequest, API_BASE_URL } from './services/api';
import './App.css';

function App() {
  const wsRef = useRef(null);
  const [mode, setMode] = useState('login');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('dj_user');
    return saved ? JSON.parse(saved) : null;
  });

  const [tracks, setTracks] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [recommendationLoading, setRecommendationLoading] = useState(false);
  const [recommendationError, setRecommendationError] = useState('');
  const [selectedRecommendationTrack, setSelectedRecommendationTrack] = useState(null);
  const [loungeName, setLoungeName] = useState('');
  const [vibe, setVibe] = useState('chill');
  const [targetBpm, setTargetBpm] = useState(120);
  const [inviteCode, setInviteCode] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return (params.get('invite') || '').trim().toUpperCase();
  });
  const [activeLounge, setActiveLounge] = useState(null);
  const [loungeLoading, setLoungeLoading] = useState(false);
  const [queueItems, setQueueItems] = useState([]);
  const [wsStatus, setWsStatus] = useState('Disconnected');
  const [connectedClients, setConnectedClients] = useState(0);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [chatError, setChatError] = useState('');
  const [roomSentiment, setRoomSentiment] = useState({
    sentiment: 'neutral',
    score: 0,
    message_count: 0,
  });
  const [selectedTrackId, setSelectedTrackId] = useState('');
  const [queueLoading, setQueueLoading] = useState(false);
  const [queueError, setQueueError] = useState('');
  const [opponentId, setOpponentId] = useState('');
  const [battles, setBattles] = useState([]);
  const [battleLoading, setBattleLoading] = useState(false);
  const [battleError, setBattleError] = useState('');
  const [battleSubmissions, setBattleSubmissions] = useState({});
  const [battleTrackSelections, setBattleTrackSelections] = useState({});

  useEffect(() => {
    if (user) {
      loadTracks();
    }
  }, [user]);
  useEffect(() => {
    if (activeLounge && user) {
      loadQueue();
    }
  }, [activeLounge, user]);
  useEffect(() => {
    if (activeLounge && user) {
      loadBattles();
    }
  }, [activeLounge, user]);
  useEffect(() => {
    if (!activeLounge || !user) return;
    const wsBaseUrl = API_BASE_URL.replace(/^http/, 'ws');
    const wsUrl = `${wsBaseUrl}/ws/lounges/${activeLounge.id}?token=${encodeURIComponent(user.token)}`;
    const socket = new WebSocket(wsUrl);
    wsRef.current = socket;
    setWsStatus('Connecting');
    socket.onopen = () => {
      setWsStatus('Connected');
    };
    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      console.log('WEBSOCKET EVENT:', data.event, JSON.stringify(data.payload));
      if (data.event === 'lounge.queue.update') {
        const updatedQueue = data.payload.queue;
        if (updatedQueue) {
          setQueueItems(updatedQueue);
        }
      }
      if (data.event === 'lounge.presence.update') {
        setConnectedClients(
          data.payload.connected_clients || 0
        );
      }
      if (data.event === 'lounge.chat.message') {
        setChatMessages((previousMessages) => [
          ...previousMessages,
          {
            username: data.payload.username,
            message: data.payload.message,
          },
        ]);
      }
      if (data.event === 'lounge.sentiment.update') {
        console.log('ROOM SENTIMENT DATA:', data.payload);
        setRoomSentiment(data.payload);
      }
    };

    socket.onerror = (event) => {
      console.error('WebSocket error:', event);
      setWsStatus('Connection error');
    };

    socket.onclose = (event) => {
      console.log(
        'WebSocket closed:',
        event.code,
        event.reason,
        event.wasClean
      );
      setWsStatus('Disconnected');
    };
    return () => {
      if (wsRef.current === socket) {
        wsRef.current = null;
      }
      socket.close();
    };
  }, [activeLounge, user]);

  async function loadTracks() {
    try {
      const result = await apiRequest('/tracks');
      setTracks(result);
    } catch (err) {
      setError('Could not load tracks: ' + err.message);
    }
  }

  async function loadRecommendations(trackId) {
    setRecommendationLoading(true);
    setRecommendationError('');
    setRecommendations([]);
    setSelectedRecommendationTrack(trackId);

    try {
      const result = await apiRequest(
        `/tracks/${trackId}/recommendations`,
        {},
        user.token
      );

      setRecommendations(result);
    } catch (err) {
      setRecommendationError(
        'Could not load recommendations: ' + err.message
      );
    } finally {
      setRecommendationLoading(false);
    }
  }

  async function loadQueue() {
    if (!activeLounge || !user) return;

    setQueueLoading(true);
    setQueueError('');

    try {
      const result = await apiRequest(
        `/lounges/${activeLounge.id}/queue`,
        {},
        user.token
      );
      setQueueItems(result.queue || []);
    } catch (err) {
      setQueueError(err.message);
    } finally {
      setQueueLoading(false);
    }
  }

  async function loadBattles() {
    if (!activeLounge || !user) return;

    setBattleLoading(true);
    setBattleError('');

    try {
      const result = await apiRequest(
        `/lounges/${activeLounge.id}/battles`,
        {},
        user.token
      );

      const battleList = Array.isArray(result) ? result : [];
      setBattles(battleList);

      await Promise.all(
        battleList
          .filter(battle => battle.status === 'active')
          .map(battle => loadBattleSubmissions(battle.battle_id))
      );
    } 
    catch (err) {
      setBattleError(err.message);
    } finally {
      setBattleLoading(false);
    }
  }

  async function createBattle(event) {
    event.preventDefault();

    if (!opponentId || Number(opponentId) === user.userId) {
      setBattleError('Enter another DJ user ID.');
      return;
    }

    setBattleError('');

    try {
      await apiRequest(
        `/lounges/${activeLounge.id}/battles`,
        {
          method: 'POST',
          body: JSON.stringify({
            lounge_id: activeLounge.id,
            challenger_id: user.userId,
            opponent_id: Number(opponentId)
          })
        },
        user.token
      );

      setOpponentId('');
      setSuccess('DJ Battle created successfully!');
      await loadBattles();
    } catch (err) {
      setBattleError(err.message);
    }
  }

  async function updateBattleStatus(battleId, status, winnerId = null) {
    setBattleError('');

    try {
      const body = { status };

      if (winnerId !== null) {
        body.winner_id = winnerId;
      }

      await apiRequest(
        `/battles/${battleId}/status`,
        {
          method: 'PATCH',
          body: JSON.stringify(body)
        },
        user.token
      );

      setSuccess('Battle status updated successfully!');
      await loadBattles();
    } catch (err) {
      setBattleError(err.message);
    }
  }

  async function loadBattleSubmissions(battleId) {
    try {
      const result = await apiRequest(
        `/battles/${battleId}/submissions`,
        {},
        user.token
      );
  
      setBattleSubmissions(prev => ({
        ...prev,
        [battleId]: result
      }));
    } catch (err) {
      setBattleError(err.message);
    }
  }
  
  async function submitBattleTrack(event, battleId) {
    event.preventDefault();
  
    const trackId = battleTrackSelections[battleId];
  
    if (!trackId) {
      setBattleError('Please select a track.');
      return;
    }
  
    try {
      await apiRequest(
        `/battles/${battleId}/submissions`,
        {
          method: 'POST',
          body: JSON.stringify({
            track_id: Number(trackId)
          })
        },
        user.token
      );
  
      setSuccess('Track submitted successfully!');
      await loadBattleSubmissions(battleId);
    } catch (err) {
      setBattleError(err.message);
    }
  }
  
  async function voteBattleTrack(battleId, submissionId) {
    try {
      await apiRequest(
        `/battles/${battleId}/votes`,
        {
          method: 'POST',
          body: JSON.stringify({
            submission_id: submissionId
          })
        },
        user.token
      );
  
      setSuccess('Your vote has been recorded!');
      await loadBattleSubmissions(battleId);
    } catch (err) {
      setBattleError(err.message);
    }
  }

  async function addToQueue(event) {
    event.preventDefault();

    if (!activeLounge || !selectedTrackId) {
      setQueueError('Please select a track and an active lounge.');
      return;
    }
    setQueueLoading(true);
    setQueueError('');
    setSuccess('');

    try {
      await apiRequest(
        `/lounges/${activeLounge.id}/queue`,
        {
          method: 'POST',
          body: JSON.stringify({
            lounge_id: activeLounge.id,
            track_id: Number(selectedTrackId),
            user_id: user.userId,
          }),
        },
        user.token
      );

      setSelectedTrackId('');
      setSuccess('Track added to the live queue!');

      await loadQueue();
    } catch (err) {
      setQueueError(err.message);
    } finally {
      setQueueLoading(false);
    }
  }

  async function voteForQueueItem(queueItemId, vote) {
    setQueueError('');
    setQueueLoading(true);

    try {
      await apiRequest(
        `/lounges/${activeLounge.id}/queue/${queueItemId}/vote`,
        {
          method: 'POST',
          body: JSON.stringify({
            user_id: user.userId,
            vote: vote,
          }),
        },
        user.token
      );

      const result = await apiRequest(
        `/lounges/${activeLounge.id}/queue`,
        {},
        user.token
      );

      setQueueItems(result.queue || []);

    } catch (err) {
      setQueueError(err.message);
    } finally {
      setQueueLoading(false);
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      if (mode === 'register') {
        const result = await apiRequest('/register', {
          method: 'POST',
          body: JSON.stringify({ username, email, password }),
        });

        setSuccess(result.message + '. You can now log in.');
        setMode('login');
        setPassword('');
      } else {
        const result = await apiRequest('/login', {
          method: 'POST',
          body: JSON.stringify({ username, password }),
        });

        const token = result.access_token;
        const payload = JSON.parse(
          atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))
        );

        const userData = {
          token,
          userId: Number(payload.sub),
          role: payload.role,
          username,
        };

        localStorage.setItem('dj_user', JSON.stringify(userData));
        setUser(userData);
        setSuccess('Welcome to AI-DJ-Studio!');
        setPassword('');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function copyInvitationText(text, message) {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.opacity = '0';
        document.body.appendChild(textArea);
        textArea.select();

        const copied = document.execCommand('copy');
        document.body.removeChild(textArea);

        if (!copied) {
          throw new Error('Copy failed');
        }
      }

      setSuccess(message);
      setError('');
    } catch (err) {
      setError('Unable to copy. Please copy the text manually.');
    }
  }

  function copyInviteCode() {
    if (!activeLounge?.invite_code) return;

    copyInvitationText(
      activeLounge.invite_code,
      'Invitation code copied successfully!'
    );
  }

  function copyInviteLink() {
    if (!activeLounge?.invite_code) return;

    const link =
      window.location.origin +
      '/?invite=' +
      encodeURIComponent(activeLounge.invite_code);

    copyInvitationText(
      link,
      'Invitation link copied successfully!'
    );
  }

  async function createLounge(event) {
    event.preventDefault();
    setError('');
    setSuccess('');
    setLoungeLoading(true);

    try {
      const result = await apiRequest(
        '/lounges',
        {
          method: 'POST',
          body: JSON.stringify({
            name: loungeName,
            vibe,
            target_bpm: Number(targetBpm),
            bpm_tolerance: 5,
          }),
        },
        user.token
      );

      setActiveLounge({
        id: result.id,
        name: result.name,
        invite_code: result.invite_code,
      });

      setSuccess(
        'Lounge created! Invite code: ' + result.invite_code
      );
      setLoungeName('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoungeLoading(false);
    }
  }

  async function joinLounge(event) {
    event.preventDefault();
    setError('');
    setSuccess('');
    setLoungeLoading(true);

    try {
      const result = await apiRequest(
        '/lounges/join',
        {
          method: 'POST',
          body: JSON.stringify({
            invite_code: inviteCode,
          }),
        },
        user.token
      );

      setActiveLounge({
        id: result.lounge_id,
        name: result.lounge_name,
      });

      setSuccess('Successfully joined ' + result.lounge_name);
      setInviteCode('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoungeLoading(false);
    }
  }
  function sendChatMessage(event) {
    event.preventDefault();
    const message = chatInput.trim();
    if (!message) return;
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      setChatError('Chat is not connected. Please wait and try again.');
      return;
    }
    wsRef.current.send(JSON.stringify({
      event: 'lounge.chat.message',
      payload: { message: message },
    }));

    setChatInput('');
    setChatError('');
  }

  function logout() {
    localStorage.removeItem('dj_user');
    setUser(null);
    setUsername('');
    setEmail('');
    setPassword('');
    setError('');
    setSuccess('');
    setActiveLounge(null);
    setMode('login');
  }

  if (!user) {
    return (
      <main className="app-container">
        <header className="topbar">
          <h1>AI<span>DJ</span> STUDIO</h1>
          <p>COLLABORATIVE MUSIC EXPERIENCE</p>
        </header>

        <section className="auth-layout">
          <div className="intro-panel">
            <p className="eyebrow">FEEL THE MUSIC. SHAPE THE VIBE.</p>
            <h2>
              One lounge.<br />
              Many DJs.<br />
              <span>One live rhythm.</span>
            </h2>
            <p>
              Create a collaborative music experience where listeners
              and DJs build the queue together.
            </p>
            <div className="music-decoration">♫</div>
          </div>

          <div className="auth-card">
            <div className="tab-buttons">
              <button
                className={mode === 'login' ? 'tab active' : 'tab'}
                onClick={() => {
                  setMode('login');
                  setError('');
                  setSuccess('');
                }}
              >
                Login
              </button>

              <button
                className={mode === 'register' ? 'tab active' : 'tab'}
                onClick={() => {
                  setMode('register');
                  setError('');
                  setSuccess('');
                }}
              >
                Register
              </button>
            </div>

            <h2>
              {mode === 'login' ? 'Welcome back' : 'Create your account'}
            </h2>

            <p className="form-description">
              {mode === 'login'
                ? 'Log in to enter your music lounge.'
                : 'Join the AI-DJ-Studio community.'}
            </p>

            <form onSubmit={handleSubmit}>
              <label htmlFor="username">Username</label>
              <input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your username"
                minLength="3"
                maxLength="50"
                required
/>

              {mode === 'register' && (
                <>
                  <label htmlFor="email">Email address</label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email"
                    required
                  />
                </>
              )}

              <label htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                minLength="8"
                required
              />

              {error && <p className="message error">{error}</p>}
              {success && <p className="message success">{success}</p>}

              <button className="primary-button" disabled={loading}>
                {loading
                  ? 'Please wait...'
                  : mode === 'login'
                    ? 'Login to Studio'
                    : 'Create Account'}
              </button>
            </form>

            <p className="security-note">
              Secure authentication powered by FastAPI and JWT.
            </p>
          </div>
        </section>

        <footer>AI-DJ-STUDIO · COLLABORATE THROUGH MUSIC</footer>
      </main>
    );
  }

  return (
    <main className="app-container dashboard">
      <header className="topbar">
        <h1>AI<span>DJ</span> STUDIO</h1>

        <div className="user-info">
          <span>{user.username} · {user.role}</span>
          <button className="secondary-button" onClick={logout}>
            Log out
          </button>
        </div>
      </header>

      <section className="dashboard-heading">
        <p className="eyebrow">YOUR MUSIC. YOUR LOUNGE.</p>
        <h2>Welcome back, {user.username}!</h2>
        <p>Discover tracks and create your collaborative music experience.</p>
      </section>

      {error && <p className="message error">{error}</p>}
      {success && <p className="message success">{success}</p>}

      {activeLounge && (
        <section className="active-lounge">
          <p className="eyebrow">ACTIVE LOUNGE</p>
          <h2>{activeLounge.name}</h2>
          <p>Lounge ID: {activeLounge.id}</p>
          {activeLounge.invite_code && (
            <div className="invitation-sharing">
              <p>
                 Invite code: <strong>{activeLounge.invite_code}</strong>
              </p>

              <button
                type="button"
                className="secondary-button"
                onClick={copyInviteCode}
              >
                Copy Invite Code
              </button>

              <button
                type="button"
                className="primary-button"
                onClick={copyInviteLink}
              >
                Copy Invitation Link
              </button>

              <p className="role-note">
                Share this link with people you want to invite to your lounge.
              </p>
            </div>
          )}

        </section>
      )}

      <section className="dashboard-grid">
        <div className="studio-card">
          <h2>♫ Create a Lounge</h2>
          <p>Start a new collaborative music session.</p>

          {['Host', 'Admin'].includes(user.role) ? (
            <form onSubmit={createLounge}>
              <label>Lounge name</label>
              <input
                value={loungeName}
                onChange={(e) => setLoungeName(e.target.value)}
                placeholder="Friday Night Mix"
                minLength="3"
                maxLength="100"
                required
              />
              <label>Music vibe</label>
              <select
                value={vibe}
                onChange={(e) => setVibe(e.target.value)}
              >
                <option value="chill">Chill</option>
                <option value="party">Party</option>
                <option value="energetic">Energetic</option>
                <option value="focus">Focus</option>
              </select>

              <label>Target BPM: {targetBpm}</label>
              <input
                type="number"
                min="60"
                max="200"
                value={targetBpm}
                onChange={(e) => setTargetBpm(e.target.value)}
                required
              />

              <button className="primary-button" disabled={loungeLoading}>
                {loungeLoading ? 'Creating...' : 'Create Lounge'}
              </button>
            </form>
          ) : (
            <p className="role-note">
              Lounge creation is available to Host and Admin accounts.
            </p>
          )}
        </div>

        <div className="studio-card">
          <h2>⌁ Join a Lounge</h2>
          <p>Enter an invitation code to join a session.</p>

          <form onSubmit={joinLounge}>
            <label>Invitation code</label>
            <input
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value)}
              placeholder="Enter lounge code"
              maxLength="20"
              required
            />

            <button className="primary-button" disabled={loungeLoading}>
              {loungeLoading ? 'Joining...' : 'Join Lounge'}
            </button>
          </form>
        </div>
      </section>

      {activeLounge && (
  <section className="live-queue-section">
    <div className="section-heading">
      <div>
        <p className="eyebrow">COLLABORATIVE SESSION</p>
        <h2>Live Queue</h2>
        <p className="ws-status">
          WebSocket: {wsStatus}
        </p>

        <p className="ws-presence">
          Connected members: {connectedClients}
        </p>
        <p>Now curating: {activeLounge.name}</p>
      </div>

      <button
        className="secondary-button"
        onClick={loadQueue}
        disabled={queueLoading}
      >
        {queueLoading ? 'Loading...' : 'Refresh Queue'}
      </button>
    </div>

    {activeLounge && (
  <section className="chat-section">
    <div className="section-heading">
      <div>
        <p className="eyebrow">LOUNGE CONVERSATION</p>
        <h2>Live Chat</h2>
        <div className="room-sentiment">
          <strong>Room Mood: </strong>
          <span>
            {roomSentiment.sentiment.toUpperCase()}
          </span>
          <p>
            Sentiment Score: {roomSentiment.score}
          </p>
          <p>
            Messages Analyzed: {roomSentiment.message_count}
          </p>
        </div>
      </div>
    </div>

    <div className="chat-messages" aria-live="polite">
      {chatMessages.length === 0 ? (
        <p>No messages yet. Say hello!</p>
      ) : (
        chatMessages.map((item, index) => (
          <article className="chat-message" key={index}>
            <strong>{item.username}</strong>
            <p>{item.message}</p>
          </article>
        ))
      )}
    </div>

    <form className="chat-form" onSubmit={sendChatMessage}>
      <input
        type="text"
        value={chatInput}
        onChange={(event) => setChatInput(event.target.value)}
        maxLength={1000}
        placeholder="Type a message..."
      />

      <button
        type="submit"
        className="primary-button"
        disabled={!chatInput.trim() || wsStatus !== 'Connected'}
      >
        Send
      </button>
    </form>

    {chatError && <p className="message error">{chatError}</p>}
  </section>
)}

    <form className="queue-form" onSubmit={addToQueue}>
      <label htmlFor="queue-track">Select a track</label>

      <select
        id="queue-track"
        value={selectedTrackId}
        onChange={(e) => setSelectedTrackId(e.target.value)}
        required
      >
        <option value="">Choose from Track Library</option>

        {tracks.map((track) => (
          <option key={track.id} value={track.id}>
            {track.title} — {track.artist}
          </option>
        ))}
      </select>

      <button
        className="primary-button"
        disabled={queueLoading || !selectedTrackId}
      >
        Add to Queue
      </button>
    </form>

    {queueError && (
      <p className="message error">{queueError}</p>
    )}

    <div className="queue-list">
      {queueItems.length === 0 ? (
        <p>No tracks in the queue yet. Add the first track!</p>
      ) : (
        queueItems.map((item) => (
          <article
            className="queue-item"
            key={item.queue_item_id}
          >
            <div className="track-art">♫</div>

            <div className="track-details">
              <h3>{item.position}. {item.track_title}</h3>
              <p>{item.artist}</p>
            </div>

            <div className="queue-actions">
              <span className="queue-position">
              #{item.position}
              </span>

              <button
                className="vote-button"
                onClick={() => voteForQueueItem(item.queue_item_id, 1)}
                title="Upvote this track"
              >
              ▲
              </button>

              <button
                className="vote-button"
                onClick={() => voteForQueueItem(item.queue_item_id, -1)}
                title="Downvote this track"
              >
              ▼
              </button>
            </div>
          </article>
        ))
      )}
    </div>
  </section>
)}

{activeLounge && (
  <section className="studio-card battle-section">
    <h2>⚔ DJ Battle Arena</h2>
    <p>Challenge another DJ and compete in your music lounge.</p>

    <form onSubmit={createBattle}>
      <label>Opponent DJ User ID</label>

      <input
        type="number"
        min="1"
        value={opponentId}
        onChange={(e) => setOpponentId(e.target.value)}
        placeholder="Enter opponent user ID"
        required
      />

      <button
        className="primary-button"
        disabled={!opponentId || battleLoading}
      >
        Create Battle
      </button>
    </form>

    <div className="section-heading">
      <h3>Battle History</h3>

      <button
        className="secondary-button"
        onClick={loadBattles}
        disabled={battleLoading}
      >
        Refresh
      </button>
    </div>

    {battleError && (
      <p className="message error">{battleError}</p>
    )}

    {battleLoading && <p>Loading battles...</p>}

    {battles.length === 0 && !battleLoading ?(
      <p>No battles found in this lounge.</p>
    ) : (
      battles.map((battle) => (
        <article className="queue-item" key={battle.battle_id}>
          <div className="track-details">
            <h3>Battle #{battle.battle_id}</h3>

            <p>
              DJ #{battle.challenger_id} vs DJ #{battle.opponent_id}
            </p>

            <p>Status: {battle.status.toUpperCase()}</p>

            {battle.winner_id && (
              <p>Winner: DJ #{battle.winner_id}</p>
            )}
          </div>

          {battle.status === 'pending' && (
            <button
              className="primary-button"
              onClick={() =>
                updateBattleStatus(battle.battle_id, 'active')
              }
            >
              Start Battle
            </button>
          )}

{battle.status === 'active' && (
  <div className="battle-submission-section">
    <h4>Soundclash Track Submissions</h4>

    {battleSubmissions[battle.battle_id]?.map(submission => (
      <div className="queue-item" key={submission.submission_id}>
        <div className="track-details">
          <strong>{submission.track_title}</strong>
          <p>{submission.artist}</p>
          <p>Submitted by DJ #{submission.dj_id}</p>
        </div>

        {user.userId !== battle.challenger_id &&
          user.userId !== battle.opponent_id && (
            <button
              className="vote-button"
              onClick={() =>
                voteBattleTrack(
                  battle.battle_id,
                  submission.submission_id
                )
              }
            >
              Vote for this track
            </button>
          )}
      </div>
    ))}

    {(user.userId === battle.challenger_id ||
      user.userId === battle.opponent_id) &&
      !(battleSubmissions[battle.battle_id] || [])
        .some(item => item.dj_id === user.userId) && (
        <form onSubmit={event =>
          submitBattleTrack(event, battle.battle_id)
        }>
          <select
            value={battleTrackSelections[battle.battle_id] || ''}
            onChange={event =>
              setBattleTrackSelections(prev => ({
                ...prev,
                [battle.battle_id]: event.target.value
              }))
            }
            required
          >
            <option value="">Select your track</option>
            {tracks.map(track => (
              <option key={track.id} value={track.id}>
                {track.title} - {track.artist}
              </option>
            ))}
          </select>

          <button className="primary-button" type="submit">
            Submit Track
          </button>
        </form>
      )}
        {(user.userId === battle.challenger_id ||
      user.userId === battle.opponent_id) &&
      (battleSubmissions[battle.battle_id] || []).length === 2 && (
        <button
          className="primary-button"
          onClick={() =>
            updateBattleStatus(battle.battle_id, 'completed')
          }
        >
          Complete Battle & Add Winner to Queue
        </button>
      )}
  </div>
)}
        </article>
      ))
    )}
  </section>
)}

      <section className="track-section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">EXPLORE YOUR SOUND</p>
            <h2>Track Library</h2>
          </div>
          <button className="secondary-button" onClick={loadTracks}>
            Refresh Tracks
          </button>
        </div>

        <div className="track-grid">
          {tracks.map((track) => (
            <article className="track-card" key={track.id}>
              <div className="track-art">♫</div>
              <div className="track-details">
                <h3>{track.title}</h3>
                <p>{track.artist}</p>
                <div className="track-tags">
                  <span>{track.bpm} BPM</span>
                  <span>{track.camelot_key}</span>
                </div>
                <button
                className="secondary-button"
                onClick={() => loadRecommendations(track.id)}
                disabled={recommendationLoading}
                >
                Get AI Recommendations
                </button>
                <div className="track-metrics">
                  Energy: {Math.round(track.energy * 100)}%
                  <div className="metric-bar">
                    <div
                      className="metric-fill"
                      style={{ width: `${track.energy * 100}%` }}
                    />
                  </div>
                  Valence: {Math.round(track.valence * 100)}%
                </div>
              </div>
            </article>
          ))}
        </div>

        {tracks.length === 0 && (
          <p>No tracks found. Try refreshing the library.</p>
        )}
        {selectedRecommendationTrack !== null && (
  <div className="recommendation-section">
    <h3>AI Recommended Tracks</h3>

    {recommendationLoading && (
      <p>Finding compatible tracks...</p>
    )}

    {recommendationError && (
      <p className="message error">{recommendationError}</p>
    )}

    {!recommendationLoading &&
      !recommendationError &&
      recommendations.length === 0 && (
        <p>No compatible tracks found for this selection.</p>
      )}

    <div className="track-grid">
      {recommendations.map((track) => (
        <article className="track-card" key={track.id}>
          <div className="track-art">♫</div>
          <div className="track-details">
            <h3>{track.title}</h3>
            <p>{track.artist}</p>
            <div className="track-tags">
              <span>{track.bpm} BPM</span>
              <span>{track.camelot_key}</span>
            </div>
            <p>
              Match Score: {track.match_score}%
            </p>
          </div>
        </article>
      ))}
    </div>
  </div>
)}
      </section>

      <footer>AI-DJ-STUDIO · COLLABORATE THROUGH MUSIC</footer>
    </main>
  );
}

export default App;
