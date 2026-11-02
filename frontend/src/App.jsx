

import React, { useState, useEffect } from 'react';
import { apiRequest } from './services/api';
import './App.css';

function App() {
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
  const [loungeName, setLoungeName] = useState('');
  const [vibe, setVibe] = useState('chill');
  const [targetBpm, setTargetBpm] = useState(120);
  const [inviteCode, setInviteCode] = useState('');
  const [activeLounge, setActiveLounge] = useState(null);
  const [loungeLoading, setLoungeLoading] = useState(false);
  const [queueItems, setQueueItems] = useState([]);
  const [wsStatus, setWsStatus] = useState('Disconnected');
  const [connectedClients, setConnectedClients] = useState(0);
  const [selectedTrackId, setSelectedTrackId] = useState('');
  const [queueLoading, setQueueLoading] = useState(false);
  const [queueError, setQueueError] = useState('');

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
    if (!activeLounge || !user) return;
    const wsUrl = `ws://127.0.0.1:8000/ws/lounges/${activeLounge.id}?token=${encodeURIComponent(user.token)}`;
    const socket = new WebSocket(wsUrl);
    setWsStatus('Connecting');
    socket.onopen = () => {
      setWsStatus('Connected');
    };
    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
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
    };
    socket.onerror = () => {
      setWsStatus('Connection error');
    };
    socket.onclose = () => {
      setWsStatus('Disconnected');
    };
    return () => {
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
            <p>
              Invite code: <strong>{activeLounge.invite_code}</strong>
            </p>
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
      </section>

      <footer>AI-DJ-STUDIO · COLLABORATE THROUGH MUSIC</footer>
    </main>
  );
}

export default App;
