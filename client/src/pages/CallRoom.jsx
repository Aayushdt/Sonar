import { useState, useEffect, useCallback } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { Radio, AlertTriangle, ArrowLeft, Clock, ShieldCheck } from 'lucide-react';
import { useSocket } from '../context/SocketContext';
import { useDailyCall } from '../hooks/useDailyCall';
import VideoCall from '../components/VideoCall';
import ChatBox from '../components/ChatBox';

/**
 * CallRoom — Active call screen.
 * Combines Daily.co video via useDailyCall and in-call chat via Socket.io.
 */
const CallRoom = () => {
  const { callId } = useParams();
  const { state } = useLocation();
  const navigate = useNavigate();
  const { socket, socketRef } = useSocket();

  const roomUrl = state?.roomUrl;
  const [messages, setMessages] = useState([]);
  const [callEnded, setCallEnded] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // ── Call Timer ──────────────────────────────────────────────────────
  useEffect(() => {
    const timer = setInterval(() => {
      setElapsedSeconds((s) => s + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatElapsed = (sec) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  // ── Notify server when remote media starts (for startedAt logging) ──
  const handleCallConnected = useCallback(() => {
    const s = socketRef.current;
    if (s && callId) {
      s.emit('call:started', { callId });
    }
  }, [socketRef, callId]);

  // ── Navigate back to dashboard when remote peer leaves ──────────────
  const handleCallEnded = useCallback(() => {
    setCallEnded(true);
  }, []);

  const {
    localVideoRef,
    remoteVideoRef,
    remoteAudioRef,
    isAudioMuted,
    isVideoOff,
    remoteParticipant,
    callError,
    toggleAudio,
    toggleVideo,
    hangUp,
  } = useDailyCall(roomUrl, handleCallConnected, handleCallEnded);

  // ── Handle hang up: emit call:end, then navigate away ───────────────
  const handleHangUp = useCallback(async () => {
    await hangUp();
    const s = socketRef.current;
    if (s && callId) {
      s.emit('call:end', { callId });
    }
    navigate('/dashboard', { replace: true });
  }, [hangUp, socketRef, callId, navigate]);

  useEffect(() => {
    if (callEnded) {
      const s = socketRef.current;
      if (s && callId) {
        s.emit('call:end', { callId });
      }
      hangUp();
      navigate('/dashboard', { replace: true });
    }
  }, [callEnded]); // eslint-disable-line

  useEffect(() => {
    const s = socketRef.current;
    if (!s) return;

    const onCallEnd = ({ callId: endedCallId }) => {
      if (endedCallId === callId) {
        hangUp();
        navigate('/dashboard', { replace: true });
      }
    };

    s.on('call:end', onCallEnd);
    return () => s.off('call:end', onCallEnd);
  }, [socketRef.current, callId]); // eslint-disable-line

  // ── In-call chat: receive messages from server ───────────────────────
  useEffect(() => {
    const s = socketRef.current;
    if (!s) return;

    const onMessage = (msg) => {
      setMessages((prev) => [...prev, msg]);
    };

    s.on('chat:message', onMessage);
    return () => s.off('chat:message', onMessage);
  }, [socketRef.current]); // eslint-disable-line

  const handleSendMessage = (payload) => {
    setMessages((prev) => [...prev, payload]);
  };

  // ── Guard: no roomUrl means we arrived here without call acceptance ─
  if (!roomUrl) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg dark:bg-bg-dark text-text dark:text-text-dark bg-noise-subtle p-6">
        <div className="text-center max-w-sm p-8 rounded-3xl bg-surface dark:bg-surface-dark border border-border dark:border-border-dark shadow-tactile-lg space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-danger-tint dark:bg-danger-tint-dark text-danger dark:text-danger-dark flex items-center justify-center mx-auto">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <h2 className="font-display font-bold text-lg">No Active Session</h2>
          <p className="text-xs text-text-muted dark:text-text-muted-dark">
            Direct access to transmission coordinates is restricted. Please initiate a call from the Signal Deck.
          </p>
          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={() => navigate('/dashboard')}
            className="w-full py-3 rounded-xl bg-primary text-on-primary font-display font-semibold text-xs shadow-tactile-sm"
          >
            Return to Deck
          </motion.button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg dark:bg-bg-dark flex flex-col text-text dark:text-text-dark transition-colors duration-200">
      {/* ── Active Broadcast Header ── */}
      <header className="bg-surface/90 dark:bg-surface-dark/90 backdrop-blur-md border-b border-border dark:border-border-dark px-4 sm:px-6 py-3 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleHangUp}
            className="p-2 rounded-xl bg-surface-2 dark:bg-surface-2-dark border border-border dark:border-border-dark text-text-muted hover:text-text transition-colors"
            title="Leave transmission"
          >
            <ArrowLeft className="w-4 h-4" />
          </motion.button>

          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-primary text-on-primary flex items-center justify-center">
              <Radio className="w-4 h-4 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-display font-bold text-sm tracking-tight text-text dark:text-text-dark">
                  SONAR TRANSMISSION
                </span>
                <span className="font-mono text-[10px] text-text-muted dark:text-text-muted-dark uppercase hidden sm:inline">
                  // {callId?.slice(-6)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Center/Right Status Readout */}
        <div className="flex items-center gap-3">
          {/* Elapsed Timer */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface-2 dark:bg-surface-2-dark border border-border dark:border-border-dark font-mono text-xs font-semibold text-text dark:text-text-dark">
            <Clock className="w-3.5 h-3.5 text-secondary dark:text-secondary-dark" />
            <span>{formatElapsed(elapsedSeconds)}</span>
          </div>

          {/* Live Indicator */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-success-tint dark:bg-success-tint-dark border border-success/30 text-success dark:text-success-dark font-mono text-[11px] font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-success dark:bg-success-dark animate-pulse" />
            <span>LIVE</span>
          </div>
        </div>
      </header>

      {/* Error banner */}
      {callError && (
        <div className="bg-danger-tint dark:bg-danger-tint-dark border-b border-danger/30 px-4 py-2.5 text-danger dark:text-danger-dark text-xs text-center font-mono flex items-center justify-center gap-2">
          <AlertTriangle className="w-4 h-4" />
          <span>{callError}</span>
        </div>
      )}

      {/* Main Broadcast Work Area */}
      <div className="flex-1 flex flex-col lg:flex-row gap-4 p-4 sm:p-6 max-w-7xl mx-auto w-full min-h-0">
        {/* Left: Video Area */}
        <div className="flex-1 min-h-[420px] lg:min-h-0 flex flex-col">
          <VideoCall
            localVideoRef={localVideoRef}
            remoteVideoRef={remoteVideoRef}
            remoteAudioRef={remoteAudioRef}
            isAudioMuted={isAudioMuted}
            isVideoOff={isVideoOff}
            remoteParticipant={remoteParticipant}
            toggleAudio={toggleAudio}
            toggleVideo={toggleVideo}
            onHangUp={handleHangUp}
          />
        </div>

        {/* Right: Ephemeral Chat Sidebar */}
        <div className="lg:w-84 xl:w-96 flex-shrink-0 h-72 lg:h-auto flex flex-col">
          <ChatBox
            socket={socket}
            callId={callId}
            messages={messages}
            onSendMessage={handleSendMessage}
          />
        </div>
      </div>
    </div>
  );
};

export default CallRoom;
