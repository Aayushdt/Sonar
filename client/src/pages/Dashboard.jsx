import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  Radio,
  Video,
  PhoneOff,
  Clock,
  Activity,
  RefreshCw,
  Search,
  PhoneIncoming,
  PhoneOutgoing,
  CheckCircle2,
  AlertCircle,
  Wifi,
  Sparkles,
  Star,
  ChevronLeft,
  ChevronRight,
  XCircle,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import Navbar from '../components/Navbar';
import IncomingCallModal from '../components/IncomingCallModal';

const API_BASE = 'http://localhost:5000/api';

const formatDuration = (seconds = 0) => {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
};

const formatDate = (isoString) => {
  if (!isoString) return '—';
  const d = new Date(isoString);
  return d.toLocaleDateString([], {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const Dashboard = ({ theme, onToggleTheme }) => {
  const { user, token } = useAuth();
  const {
    socketRef,
    onlineUserIds,
    incomingCall,
    clearIncomingCall,
    callNotification,
    dismissCallNotification,
    cancelCall: socketCancelCall,
  } = useSocket();
  const navigate = useNavigate();

  const [allUsers, setAllUsers] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [friendsList, setFriendsList] = useState(user?.friends || []);
  const [callHistory, setCallHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [callingUserId, setCallingUserId] = useState(null);
  const [toast, setToast] = useState(null);
  const [peerSearch, setPeerSearch] = useState('');
  const [historyFilter, setHistoryFilter] = useState('all'); // 'all' | 'outgoing' | 'incoming'
  const [callPage, setCallPage] = useState(1);
  const [callPagination, setCallPagination] = useState({ page: 1, totalPages: 1, total: 0 });

  // Sync friends from user object
  useEffect(() => {
    if (user?.friends) {
      setFriendsList(user.friends);
    }
  }, [user]);

  // ── Fetch all users and call history on mount / page change ─────────
  const fetchDashboardData = useCallback(async () => {
    if (!token) return;
    try {
      const [usersRes, callsRes] = await Promise.all([
        fetch(`${API_BASE}/auth/users`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API_BASE}/calls?page=${callPage}&limit=8`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (usersRes.ok) {
        const { users } = await usersRes.json();
        setAllUsers(users || []);
      }

      if (callsRes.ok) {
        const data = await callsRes.json();
        setCallHistory(data.calls || []);
        if (data.pagination) {
          setCallPagination(data.pagination);
        }
      }
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setHistoryLoading(false);
    }
  }, [token, callPage]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Handle socket call notification toasts
  useEffect(() => {
    if (callNotification) {
      setCallingUserId(null);
      setToast({
        type: callNotification.type === 'missed' ? 'error' : 'info',
        msg: callNotification.message,
      });
      setTimeout(() => {
        dismissCallNotification();
        setToast(null);
      }, 5000);
    }
  }, [callNotification, dismissCallNotification]);

  // Toggle favorite friend
  const toggleFriendContact = async (friendId) => {
    try {
      const res = await fetch(`${API_BASE}/auth/friends/${friendId}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setFriendsList(data.friends || []);
        setToast({ type: 'success', msg: data.message });
        setTimeout(() => setToast(null), 3000);
      }
    } catch (e) {
      console.error('Failed to toggle contact favorite', e);
    }
  };

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
        name: userMap[id] || `Station ${id.slice(-4)}`,
      }))
    );
  }, [onlineUserIds, allUsers, callHistory]);

  const refreshHistory = useCallback(() => {
    setHistoryLoading(true);
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
      showToast('error', 'Transmission declined by remote station.');
    };

    const handleMissed = () => {
      setCallingUserId(null);
      showToast('error', 'Transmission timed out. Recipient did not respond.');
      fetchDashboardData();
    };

    const handleCancelled = () => {
      setCallingUserId(null);
      showToast('info', 'Transmission was cancelled.');
    };

    const handleError = ({ message }) => {
      setCallingUserId(null);
      showToast('error', message || 'Call error encountered.');
    };

    socket.on('call:accepted', handleAccepted);
    socket.on('call:rejected', handleRejected);
    socket.on('call:missed', handleMissed);
    socket.on('call:cancelled', handleCancelled);
    socket.on('call:error', handleError);

    return () => {
      socket.off('call:accepted', handleAccepted);
      socket.off('call:rejected', handleRejected);
      socket.off('call:missed', handleMissed);
      socket.off('call:cancelled', handleCancelled);
      socket.off('call:error', handleError);
    };
  }, [socketRef.current, navigate, showToast, fetchDashboardData]); // eslint-disable-line

  // ── Start a call ─────────────────────────────────────────────────────
  const startCall = (recipientId) => {
    const socket = socketRef.current;
    if (!socket) return;
    setCallingUserId(recipientId);
    socket.emit('call:invite', { recipientId });
  };

  const cancelCall = () => {
    if (callingUserId) {
      socketCancelCall(null, callingUserId);
      setCallingUserId(null);
      showToast('info', 'Outgoing transmission cancelled.');
    }
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

  // ── Telemetry computations ──────────────────────────────────────────
  const totalAirtimeSeconds = useMemo(() => {
    return callHistory.reduce((acc, curr) => acc + (curr.durationSeconds || 0), 0);
  }, [callHistory]);

  const filteredOnlineUsers = useMemo(() => {
    return onlineUsers.filter((u) =>
      u.name.toLowerCase().includes(peerSearch.toLowerCase())
    );
  }, [onlineUsers, peerSearch]);

  const filteredHistory = useMemo(() => {
    if (historyFilter === 'all') return callHistory;
    if (historyFilter === 'outgoing') {
      return callHistory.filter((c) => c.caller?._id === user?._id);
    }
    if (historyFilter === 'incoming') {
      return callHistory.filter((c) => c.receiver?._id === user?._id);
    }
    return callHistory;
  }, [callHistory, historyFilter, user]);

  return (
    <div className="min-h-screen bg-bg dark:bg-bg-dark text-text dark:text-text-dark bg-noise-subtle transition-colors duration-200">
      <Navbar theme={theme} onToggleTheme={onToggleTheme} />

      {/* Toast Alert */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className={`fixed top-20 right-6 z-50 px-5 py-3.5 rounded-xl shadow-tactile-lg text-sm font-medium flex items-center gap-3 border ${
              toast.type === 'error'
                ? 'bg-danger text-on-primary border-danger/40 dark:bg-danger-dark dark:text-on-primary-dark'
                : 'bg-success text-on-primary border-success/40 dark:bg-success-dark dark:text-on-primary-dark'
            }`}
          >
            {toast.type === 'error' ? (
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
            ) : (
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            )}
            <span>{toast.msg}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Incoming Call Intercom Modal */}
      {incomingCall && (
        <IncomingCallModal
          callId={incomingCall.callId}
          caller={incomingCall.caller}
          onAccept={acceptCall}
          onReject={rejectCall}
        />
      )}

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        {/* ── Oversized Hero / Station Masthead ── */}
        <div className="relative rounded-2xl bg-surface dark:bg-surface-dark border border-border dark:border-border-dark p-6 sm:p-8 shadow-tactile-sm overflow-hidden">
          {/* Subtle acoustic line texture */}
          <div className="absolute right-0 top-0 bottom-0 w-1/3 pointer-events-none opacity-5 hidden md:block">
            <svg viewBox="0 0 200 100" className="w-full h-full preserve-3d">
              <path d="M 0 50 Q 50 10 100 50 T 200 50" fill="none" stroke="currentColor" strokeWidth="2" />
              <path d="M 0 50 Q 50 20 100 50 T 200 50" fill="none" stroke="currentColor" strokeWidth="2" />
              <path d="M 0 50 Q 50 30 100 50 T 200 50" fill="none" stroke="currentColor" strokeWidth="2" />
            </svg>
          </div>

          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 relative z-10">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-mono uppercase tracking-wider bg-success-tint dark:bg-success-tint-dark text-success dark:text-success-dark border border-success/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-success dark:bg-success-dark animate-pulse" />
                  CARRIER ACTIVE
                </span>
                <span className="text-text-muted dark:text-text-muted-dark text-xs font-mono">
                  // STATION ID: {user?._id?.slice(-6) || 'ONLINE'}
                </span>
              </div>
              <h1 className="font-display font-bold text-4xl sm:text-5xl lg:text-6xl tracking-tight text-text dark:text-text-dark">
                SIGNAL DECK
              </h1>
              <p className="text-text-2 dark:text-text-2-dark text-sm sm:text-base max-w-xl">
                Ready for high-fidelity 1-to-1 video transmissions. Connect with online peers or inspect session logs.
              </p>
            </div>

            {/* Live Frequency Badge */}
            <div className="flex items-center gap-3 self-start lg:self-auto">
              <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-surface-2 dark:bg-surface-2-dark border border-border dark:border-border-dark">
                <div className="w-8 h-8 rounded-lg bg-accent-tint dark:bg-accent-tint-dark text-accent dark:text-accent-dark flex items-center justify-center">
                  <Activity className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-mono text-xs font-semibold text-text dark:text-text-dark">
                    48kHz WEBRTC
                  </div>
                  <div className="text-[11px] text-text-muted dark:text-text-muted-dark">
                    Zero Signal Drift
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Asymmetric Bento Console ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* ── LEFT BENTO TILE (4 Cols): Live Signal Directory (Online Peers) ── */}
          <div className="lg:col-span-5 xl:col-span-4 space-y-6">
            <div className="rounded-2xl bg-surface dark:bg-surface-dark border border-border dark:border-border-dark shadow-tactile-sm overflow-hidden flex flex-col">
              {/* Directory Header */}
              <div className="p-5 border-b border-border dark:border-border-dark flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-primary-tint dark:bg-primary-tint-dark text-primary dark:text-primary-dark flex items-center justify-center">
                    <Radio className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="font-display font-bold text-base text-text dark:text-text-dark">
                      Online Stations
                    </h2>
                    <p className="text-[11px] font-mono text-text-muted dark:text-text-muted-dark">
                      SIGNAL SCANNER
                    </p>
                  </div>
                </div>
                <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded-md bg-surface-2 dark:bg-surface-2-dark border border-border dark:border-border-dark text-text dark:text-text-dark">
                  {onlineUsers.length} LIVE
                </span>
              </div>

              {/* Search peer input */}
              {onlineUsers.length > 3 && (
                <div className="px-5 pt-3">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted dark:text-text-muted-dark" />
                    <input
                      type="text"
                      placeholder="Search peer callsign..."
                      value={peerSearch}
                      onChange={(e) => setPeerSearch(e.target.value)}
                      className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-surface-2 dark:bg-surface-2-dark border border-border/80 dark:border-border-dark/80 text-xs text-text dark:text-text-dark placeholder:text-text-muted/60 dark:placeholder:text-text-muted-dark/60 outline-none focus:ring-1 focus:ring-focus-ring"
                    />
                  </div>
                </div>
              )}

              {/* Peer List or Expressive Empty State */}
              <div className="p-4 flex-1">
                {filteredOnlineUsers.length === 0 ? (
                  <div className="py-12 px-4 text-center space-y-3">
                    <div className="w-14 h-14 mx-auto rounded-full bg-surface-2 dark:bg-surface-2-dark border border-border dark:border-border-dark flex items-center justify-center text-text-muted dark:text-text-muted-dark">
                      <Wifi className="w-6 h-6 animate-pulse text-secondary dark:text-secondary-dark" />
                    </div>
                    <div className="space-y-1">
                      <p className="font-display font-semibold text-sm text-text dark:text-text-dark">
                        Radar Idle
                      </p>
                      <p className="text-xs text-text-muted dark:text-text-muted-dark max-w-xs mx-auto">
                        No external carrier frequencies broadcasting right now. Open another browser tab to simulate peer.
                      </p>
                    </div>
                  </div>
                ) : (
                  <ul className="space-y-2.5">
                    {filteredOnlineUsers.map((u) => {
                      const isCurrentPeerCalling = callingUserId === u._id;
                      const initial = u.name ? u.name.charAt(0).toUpperCase() : '?';

                      return (
                        <motion.li
                          key={u._id}
                          layout
                          className="p-3 rounded-xl bg-surface-2/60 dark:bg-surface-2-dark/60 border border-border/70 dark:border-border-dark/70 hover:border-border-strong dark:hover:border-border-strong-dark transition-all duration-200 flex items-center justify-between gap-3 shadow-tactile-sm"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="relative flex-shrink-0">
                              <div className="w-9 h-9 rounded-xl bg-primary-tint dark:bg-primary-tint-dark text-primary dark:text-primary-dark font-display font-bold text-sm flex items-center justify-center border border-primary/20">
                                {initial}
                              </div>
                              <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-success dark:bg-success-dark ring-2 ring-surface dark:ring-surface-dark" />
                            </div>
                            <div className="min-w-0">
                              <p className="font-semibold text-xs text-text dark:text-text-dark truncate">
                                {u.name}
                              </p>
                              <p className="font-mono text-[10px] text-text-muted dark:text-text-muted-dark truncate">
                                ID // {u._id.slice(-6)}
                              </p>
                            </div>
                          </div>

                          {/* Action Button & Favorite Toggle */}
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => toggleFriendContact(u._id)}
                              title={
                                friendsList.includes(u._id)
                                  ? 'Remove from favorite contacts'
                                  : 'Star contact as favorite'
                              }
                              className="p-1.5 rounded-lg hover:bg-surface dark:hover:bg-surface-dark transition-colors text-text-muted hover:text-accent"
                            >
                              <Star
                                className={`w-3.5 h-3.5 ${
                                  friendsList.includes(u._id)
                                    ? 'fill-accent text-accent'
                                    : 'text-text-muted/60'
                                }`}
                              />
                            </button>

                            {isCurrentPeerCalling ? (
                              <motion.button
                                whileTap={{ scale: 0.95 }}
                                onClick={cancelCall}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-semibold bg-danger-tint dark:bg-danger-tint-dark text-danger dark:text-danger-dark border border-danger/30 hover:opacity-90 transition-opacity"
                              >
                                <PhoneOff className="w-3 h-3" />
                                <span>Cancel…</span>
                              </motion.button>
                            ) : (
                              <motion.button
                                whileHover={{ scale: 1.04 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => startCall(u._id)}
                                disabled={!!callingUserId}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-display font-semibold bg-primary hover:bg-primary-hover dark:bg-primary-dark dark:hover:bg-primary-hover-dark text-on-primary dark:text-on-primary-dark shadow-tactile-sm transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed"
                              >
                                <Video className="w-3.5 h-3.5" />
                                <span>Call</span>
                              </motion.button>
                            )}
                          </div>
                        </motion.li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </div>

            {/* Quick Station Info Card */}
            <div className="p-4 rounded-2xl bg-surface-2 dark:bg-surface-2-dark border border-border dark:border-border-dark text-xs space-y-2">
              <div className="flex items-center gap-2 text-text font-semibold">
                <Sparkles className="w-3.5 h-3.5 text-accent" />
                <span>Station Operator Guide</span>
              </div>
              <p className="text-text-muted dark:text-text-muted-dark text-[11px] leading-relaxed">
                Sonar establishes direct peer invites via WebSocket signaling. Once remote accepts, high-definition audio/video streams instantly over Daily.co mesh.
              </p>
            </div>
          </div>

          {/* ── RIGHT BENTO TILES (8 Cols): Telemetry + Transmission Log ── */}
          <div className="lg:col-span-7 xl:col-span-8 space-y-6">
            {/* Top Telemetry Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Stat 1: Total Calls */}
              <div className="p-5 rounded-2xl bg-surface dark:bg-surface-dark border border-border dark:border-border-dark shadow-tactile-sm">
                <span className="font-mono text-[11px] uppercase tracking-wider text-text-muted dark:text-text-muted-dark">
                  TOTAL SESSIONS
                </span>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="font-display font-bold text-3xl text-text dark:text-text-dark">
                    {callHistory.length}
                  </span>
                  <span className="text-xs text-text-muted dark:text-text-muted-dark font-mono">
                    transmissions
                  </span>
                </div>
              </div>

              {/* Stat 2: Total Duration */}
              <div className="p-5 rounded-2xl bg-surface dark:bg-surface-dark border border-border dark:border-border-dark shadow-tactile-sm">
                <span className="font-mono text-[11px] uppercase tracking-wider text-text-muted dark:text-text-muted-dark">
                  CUMULATIVE AIRTIME
                </span>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="font-mono font-bold text-3xl text-secondary dark:text-secondary-dark">
                    {formatDuration(totalAirtimeSeconds)}
                  </span>
                  <span className="text-xs text-text-muted dark:text-text-muted-dark font-mono">
                    min:sec
                  </span>
                </div>
              </div>

              {/* Stat 3: Network Status */}
              <div className="p-5 rounded-2xl bg-surface dark:bg-surface-dark border border-border dark:border-border-dark shadow-tactile-sm">
                <span className="font-mono text-[11px] uppercase tracking-wider text-text-muted dark:text-text-muted-dark">
                  CARRIER STATUS
                </span>
                <div className="mt-2 flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-success dark:bg-success-dark animate-pulse" />
                  <span className="font-display font-bold text-xl text-text dark:text-text-dark">
                    OPTIMAL
                  </span>
                </div>
                <p className="mt-1 text-[10px] font-mono text-text-muted dark:text-text-muted-dark">
                  Socket & Daily.co Ready
                </p>
              </div>
            </div>

            {/* Transmission Log (Call History) */}
            <div className="rounded-2xl bg-surface dark:bg-surface-dark border border-border dark:border-border-dark shadow-tactile-sm overflow-hidden">
              {/* Header with filter tabs and refresh */}
              <div className="p-5 border-b border-border dark:border-border-dark flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-secondary-tint dark:bg-secondary-tint-dark text-secondary dark:text-secondary-dark flex items-center justify-center">
                    <Clock className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="font-display font-bold text-base text-text dark:text-text-dark">
                      Transmission Archive
                    </h2>
                    <p className="text-[11px] font-mono text-text-muted dark:text-text-muted-dark">
                      CALL LOGS & HISTORICAL RECORDS
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-auto">
                  {/* Filter Pills */}
                  <div className="flex items-center p-1 rounded-xl bg-surface-2 dark:bg-surface-2-dark border border-border dark:border-border-dark text-xs">
                    <button
                      onClick={() => setHistoryFilter('all')}
                      className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                        historyFilter === 'all'
                          ? 'bg-surface dark:bg-surface-dark text-text dark:text-text-dark shadow-tactile-sm'
                          : 'text-text-muted dark:text-text-muted-dark hover:text-text'
                      }`}
                    >
                      All
                    </button>
                    <button
                      onClick={() => setHistoryFilter('outgoing')}
                      className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                        historyFilter === 'outgoing'
                          ? 'bg-surface dark:bg-surface-dark text-text dark:text-text-dark shadow-tactile-sm'
                          : 'text-text-muted dark:text-text-muted-dark hover:text-text'
                      }`}
                    >
                      Dialed
                    </button>
                    <button
                      onClick={() => setHistoryFilter('incoming')}
                      className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                        historyFilter === 'incoming'
                          ? 'bg-surface dark:bg-surface-dark text-text dark:text-text-dark shadow-tactile-sm'
                          : 'text-text-muted dark:text-text-muted-dark hover:text-text'
                      }`}
                    >
                      Received
                    </button>
                  </div>

                  {/* Refresh Button */}
                  <motion.button
                    whileTap={{ rotate: 180 }}
                    onClick={refreshHistory}
                    className="p-2 rounded-xl bg-surface-2 dark:bg-surface-2-dark border border-border dark:border-border-dark text-text-muted hover:text-text dark:text-text-muted-dark dark:hover:text-text-dark transition-colors"
                    title="Refresh transmission records"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${historyLoading ? 'animate-spin' : ''}`} />
                  </motion.button>
                </div>
              </div>

              {/* Table Body or Loading / Empty States */}
              {historyLoading ? (
                /* Tactile Skeleton Loader */
                <div className="p-5 space-y-3">
                  {[1, 2, 3].map((n) => (
                    <div
                      key={n}
                      className="p-4 rounded-xl bg-surface-2/60 dark:bg-surface-2-dark/60 border border-border/40 dark:border-border-dark/40 flex items-center justify-between animate-pulse"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-border/60 dark:bg-border-dark/60" />
                        <div className="space-y-1.5">
                          <div className="w-32 h-3.5 rounded bg-border/70 dark:bg-border-dark/70" />
                          <div className="w-20 h-2.5 rounded bg-border/40 dark:bg-border-dark/40" />
                        </div>
                      </div>
                      <div className="w-16 h-4 rounded bg-border/50 dark:bg-border-dark/50" />
                    </div>
                  ))}
                </div>
              ) : filteredHistory.length === 0 ? (
                /* Expressive Empty State */
                <div className="py-14 px-6 text-center space-y-3">
                  <div className="w-14 h-14 mx-auto rounded-2xl bg-surface-2 dark:bg-surface-2-dark border border-border dark:border-border-dark flex items-center justify-center text-text-muted dark:text-text-muted-dark">
                    <Clock className="w-6 h-6 text-accent dark:text-accent-dark" />
                  </div>
                  <div className="space-y-1">
                    <p className="font-display font-semibold text-base text-text dark:text-text-dark">
                      Archive Clear
                    </p>
                    <p className="text-xs text-text-muted dark:text-text-muted-dark max-w-sm mx-auto">
                      No matching transmission records found. Initiate a call with any online operator to establish history.
                    </p>
                  </div>
                </div>
              ) : (
                /* History Records List */
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-surface-2/80 dark:bg-surface-2-dark/80 border-b border-border dark:border-border-dark font-mono text-[11px] text-text-muted dark:text-text-muted-dark uppercase tracking-wider">
                        <th className="py-3 px-5">Type / Remote</th>
                        <th className="py-3 px-4">Local</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4">Duration</th>
                        <th className="py-3 px-5 text-right">Timestamp</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60 dark:divide-border-dark/60">
                      {filteredHistory.map((call) => {
                        const isCaller = call.caller?._id === user?._id;
                        const remoteName = isCaller
                          ? call.receiver?.name || 'Remote Station'
                          : call.caller?.name || 'Remote Station';

                        const isMissed = call.status === 'missed';
                        const isRejected = call.status === 'rejected';

                        return (
                          <tr
                            key={call._id}
                            className="hover:bg-surface-2/50 dark:hover:bg-surface-2-dark/50 transition-colors"
                          >
                            <td className="py-3.5 px-5">
                              <div className="flex items-center gap-2.5">
                                <div
                                  className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                                    isMissed
                                      ? 'bg-warning-tint dark:bg-warning-tint-dark text-warning'
                                      : isRejected
                                      ? 'bg-danger-tint dark:bg-danger-tint-dark text-danger'
                                      : isCaller
                                      ? 'bg-secondary-tint dark:bg-secondary-tint-dark text-secondary dark:text-secondary-dark'
                                      : 'bg-success-tint dark:bg-success-tint-dark text-success dark:text-success-dark'
                                  }`}
                                >
                                  {isMissed ? (
                                    <Clock className="w-3.5 h-3.5" />
                                  ) : isRejected ? (
                                    <PhoneOff className="w-3.5 h-3.5" />
                                  ) : isCaller ? (
                                    <PhoneOutgoing className="w-3.5 h-3.5" />
                                  ) : (
                                    <PhoneIncoming className="w-3.5 h-3.5" />
                                  )}
                                </div>
                                <div>
                                  <div className="font-semibold text-text dark:text-text-dark">
                                    {remoteName}
                                  </div>
                                  <div className="font-mono text-[10px] text-text-muted dark:text-text-muted-dark">
                                    {isCaller ? 'OUTGOING CALL' : 'INCOMING CALL'}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="py-3.5 px-4 text-text-2 dark:text-text-2-dark">
                              <span className="px-2 py-0.5 rounded bg-surface-2 dark:bg-surface-2-dark border border-border/60 dark:border-border-dark/60 font-mono text-[11px]">
                                {user?.name}
                              </span>
                            </td>
                            <td className="py-3.5 px-4">
                              <span
                                className={`px-2 py-0.5 rounded font-mono text-[10px] font-semibold uppercase ${
                                  isMissed
                                    ? 'bg-warning-tint text-warning border border-warning/30'
                                    : isRejected
                                    ? 'bg-danger-tint text-danger border border-danger/30'
                                    : 'bg-success-tint text-success border border-success/30'
                                }`}
                              >
                                {call.status || 'COMPLETED'}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 font-mono font-medium text-text dark:text-text-dark">
                              <span className="px-2 py-0.5 rounded bg-primary-tint/60 dark:bg-primary-tint-dark/60 text-primary dark:text-primary-dark">
                                {formatDuration(call.durationSeconds)}
                              </span>
                            </td>
                            <td className="py-3.5 px-5 text-right font-mono text-text-muted dark:text-text-muted-dark">
                              {formatDate(call.startedAt || call.createdAt)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Pagination Controls */}
              {callPagination.totalPages > 1 && (
                <div className="p-4 border-t border-border dark:border-border-dark flex items-center justify-between text-xs font-mono bg-surface-2/30 dark:bg-surface-2-dark/30">
                  <span className="text-text-muted dark:text-text-muted-dark">
                    Page {callPagination.page} of {callPagination.totalPages} ({callPagination.total} logs)
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setCallPage((p) => Math.max(1, p - 1))}
                      disabled={callPage <= 1}
                      className="px-3 py-1.5 rounded-lg border border-border dark:border-border-dark bg-surface dark:bg-surface-dark disabled:opacity-40 disabled:cursor-not-allowed hover:bg-surface-2 transition-colors flex items-center gap-1 shadow-tactile-sm"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                      <span>Prev</span>
                    </button>
                    <button
                      onClick={() => setCallPage((p) => Math.min(callPagination.totalPages, p + 1))}
                      disabled={callPage >= callPagination.totalPages}
                      className="px-3 py-1.5 rounded-lg border border-border dark:border-border-dark bg-surface dark:bg-surface-dark disabled:opacity-40 disabled:cursor-not-allowed hover:bg-surface-2 transition-colors flex items-center gap-1 shadow-tactile-sm"
                    >
                      <span>Next</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
