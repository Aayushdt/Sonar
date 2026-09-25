import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import Navbar from '../components/Navbar';
import IncomingCallModal from '../components/IncomingCallModal';

const API_BASE = 'http://localhost:5000/api';

const formatDuration = (seconds) => {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
};

const formatDate = (isoString) =>
  new Date(isoString).toLocaleDateString([], {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

const Dashboard = ({ theme, onToggleTheme }) => {
  const { user, token } = useAuth();
  const { socketRef, onlineUserIds, incomingCall, clearIncomingCall } = useSocket();
  const navigate = useNavigate();

  const [allUsers, setAllUsers] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState([]); // full user objects for online peers
  const [callHistory, setCallHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [callingUserId, setCallingUserId] = useState(null); // who we're currently calling
  const [toast, setToast] = useState(null); // { type: 'info'|'error', msg }

  // ── Fetch all users and call history on mount / token change ─────────
  const fetchDashboardData = useCallback(async () => {
    if (!token) return;
    try {
      const [usersRes, callsRes] = await Promise.all([
        fetch(`${API_BASE}/auth/users`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API_BASE}/calls`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (usersRes.ok) {
        const { users } = await usersRes.json();
        setAllUsers(users || []);
      }

      if (callsRes.ok) {
        const { calls } = await callsRes.json();
        setCallHistory(calls || []);
      }
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setHistoryLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // ── Map onlineUserIds to real user names from allUsers / callHistory ──
  useEffect(() => {
    const userMap = {};
    allUsers.forEach((u) => {
      userMap[u._id] = u.name;
    });
    callHistory.forEach((c) => {
      if (c.caller?._id) userMap[c.caller._id] = c.caller.name;
      if (c.receiver?._id) userMap[c.receiver._id] = c.receiver.name;
    });

    setOnlineUsers(
      onlineUserIds.map((id) => ({
        _id: id,
        name: userMap[id] || `User ${id.slice(-4)}`,
      }))
    );
  }, [onlineUserIds, allUsers, callHistory]);

  const refreshHistory = useCallback(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const showToast = useCallback((type, msg) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 4000);
  }, []);

  // ── Socket event listeners for call flow ────────────────────────────
  useEffect(() => {
    const socket = socketRef.current;
    if (!socket) return;

    const handleAccepted = ({ callId, roomUrl }) => {
      setCallingUserId(null);
      navigate(`/call/${callId}`, { state: { roomUrl } });
    };

    const handleRejected = () => {
      setCallingUserId(null);
      showToast('error', 'Call was declined.');
    };

    const handleError = ({ message }) => {
      setCallingUserId(null);
      showToast('error', message);
    };

    socket.on('call:accepted', handleAccepted);
    socket.on('call:rejected', handleRejected);
    socket.on('call:error', handleError);

    return () => {
      socket.off('call:accepted', handleAccepted);
      socket.off('call:rejected', handleRejected);
      socket.off('call:error', handleError);
    };
  }, [socketRef.current, navigate, showToast]); // eslint-disable-line

  // ── Start a call ─────────────────────────────────────────────────────
  const startCall = (recipientId) => {
    const socket = socketRef.current;
    if (!socket) return;
    setCallingUserId(recipientId);
    socket.emit('call:invite', { recipientId });
  };

  const cancelCall = () => {
    setCallingUserId(null);
  };

  // ── Incoming call: Accept / Reject ───────────────────────────────────
  const acceptCall = () => {
    const socket = socketRef.current;
    if (!socket || !incomingCall) return;
    socket.emit('call:accept', { callId: incomingCall.callId, callerId: incomingCall.caller.id });
    clearIncomingCall();
  };

  const rejectCall = () => {
    const socket = socketRef.current;
    if (!socket || !incomingCall) return;
    socket.emit('call:reject', { callId: incomingCall.callId, callerId: incomingCall.caller.id });
    clearIncomingCall();
  };

  return (
    <div className="min-h-screen bg-bg">
      <Navbar theme={theme} onToggleTheme={onToggleTheme} />

      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-16 right-4 z-50 px-5 py-3 rounded-xl shadow-sonar-light text-sm font-medium
            ${toast.type === 'error' ? 'bg-danger text-on-primary' : 'bg-success text-on-primary'}`}
        >
          {toast.msg}
        </div>
      )}

      {/* Incoming call modal */}
      {incomingCall && (
        <IncomingCallModal
          callId={incomingCall.callId}
          caller={incomingCall.caller}
          onAccept={acceptCall}
          onReject={rejectCall}
        />
      )}

      <div className="max-w-6xl mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Online users ─────────────────────────────────────────────── */}
        <div className="lg:col-span-1">
          <div className="bg-surface border border-border rounded-2xl shadow-sonar-light overflow-hidden">
            <div className="px-5 py-4 border-b border-border flex items-center justify-between">
              <h2 className="font-bold text-text">Online Now</h2>
              <span className="bg-success-tint text-success text-xs font-semibold px-2.5 py-0.5 rounded-full">
                {onlineUsers.length}
              </span>
            </div>

            {onlineUsers.length === 0 ? (
              <div className="px-5 py-8 text-center text-text-muted text-sm">
                <p className="text-3xl mb-2">🌐</p>
                No other users online right now.
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {onlineUsers.map((u) => (
                  <li key={u._id} className="px-5 py-3 flex items-center justify-between hover:bg-surface-2 transition-colors">
                    <div className="flex items-center gap-3">
                      <span className="w-2 h-2 rounded-full bg-success flex-shrink-0" />
                      <span className="font-medium text-text text-sm">{u.name}</span>
                    </div>
                    {callingUserId === u._id ? (
                      <button
                        onClick={cancelCall}
                        className="text-xs font-semibold px-3 py-1.5 rounded-lg
                                   bg-warning-tint text-warning hover:opacity-90 transition-opacity"
                      >
                        Cancel…
                      </button>
                    ) : (
                      <button
                        onClick={() => startCall(u._id)}
                        disabled={!!callingUserId}
                        className="text-xs font-semibold px-3 py-1.5 rounded-lg
                                   bg-primary hover:bg-primary-hover text-on-primary
                                   disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                      >
                        📹 Call
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* ── Call History ─────────────────────────────────────────────── */}
        <div className="lg:col-span-2">
          <div className="bg-surface border border-border rounded-2xl shadow-sonar-light overflow-hidden">
            <div className="px-5 py-4 border-b border-border flex items-center justify-between">
              <h2 className="font-bold text-text">Call History</h2>
              <button
                onClick={refreshHistory}
                className="text-xs text-text-muted hover:text-text transition-colors"
              >
                Refresh
              </button>
            </div>

            {historyLoading ? (
              <div className="px-5 py-8 text-center text-text-muted text-sm">Loading…</div>
            ) : callHistory.length === 0 ? (
              <div className="px-5 py-8 text-center text-text-muted text-sm">
                <p className="text-3xl mb-2">📋</p>
                No calls yet. Start your first call!
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-surface-2">
                      <th className="px-5 py-3 text-left font-semibold text-text-muted">Caller</th>
                      <th className="px-5 py-3 text-left font-semibold text-text-muted">Receiver</th>
                      <th className="px-5 py-3 text-left font-semibold text-text-muted">Duration</th>
                      <th className="px-5 py-3 text-left font-semibold text-text-muted">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {callHistory.map((call) => (
                      <tr key={call._id} className="hover:bg-surface-2 transition-colors">
                        <td className="px-5 py-3 text-text font-medium">
                          {call.caller?.name || '—'}
                          {call.caller?._id === user._id && (
                            <span className="ml-1.5 text-xs text-text-muted">(you)</span>
                          )}
                        </td>
                        <td className="px-5 py-3 text-text">
                          {call.receiver?.name || '—'}
                          {call.receiver?._id === user._id && (
                            <span className="ml-1.5 text-xs text-text-muted">(you)</span>
                          )}
                        </td>
                        <td className="px-5 py-3 text-text-2 font-mono">
                          {formatDuration(call.durationSeconds)}
                        </td>
                        <td className="px-5 py-3 text-text-muted">{formatDate(call.startedAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
