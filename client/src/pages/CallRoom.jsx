import { useState, useEffect, useCallback } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { useSocket } from '../context/SocketContext';
import { useDailyCall } from '../hooks/useDailyCall';
import VideoCall from '../components/VideoCall';
import ChatBox from '../components/ChatBox';

/**
 * CallRoom — Active call screen.
 * Combines Daily.co video via useDailyCall and in-call chat via Socket.io.
 *
 * Route: /call/:callId
 * State: { roomUrl } passed via router navigate() state from Dashboard.
 */
const CallRoom = () => {
  const { callId } = useParams();
  const { state } = useLocation();
  const navigate = useNavigate();
  const { socket, socketRef } = useSocket();

  const roomUrl = state?.roomUrl;
  const [messages, setMessages] = useState([]);
  const [callEnded, setCallEnded] = useState(false);

  // ── Notify server when remote media starts (for startedAt logging) ──
  const handleCallConnected = useCallback(() => {
    const socket = socketRef.current;
    if (socket && callId) {
      socket.emit('call:started', { callId });
    }
  }, [socketRef, callId]);

  // ── Navigate back to dashboard when remote peer leaves ──────────────
  const handleCallEnded = useCallback(() => {
    setCallEnded(true);
  }, []);

  // useDailyCall manages the entire Daily.co lifecycle
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
    const socket = socketRef.current;
    if (socket && callId) {
      socket.emit('call:end', { callId });
    }
    navigate('/dashboard', { replace: true });
  }, [hangUp, socketRef, callId, navigate]);

  // ── Remote peer disconnects (participant-left) triggers callEnded ───
  useEffect(() => {
    if (callEnded) {
      const socket = socketRef.current;
      if (socket && callId) {
        socket.emit('call:end', { callId });
      }
      hangUp();
      navigate('/dashboard', { replace: true });
    }
  }, [callEnded]); // eslint-disable-line

  // ── Listen for call:end from server (other peer hung up) ───────────
  useEffect(() => {
    const socket = socketRef.current;
    if (!socket) return;

    const onCallEnd = ({ callId: endedCallId }) => {
      if (endedCallId === callId) {
        hangUp();
        navigate('/dashboard', { replace: true });
      }
    };

    socket.on('call:end', onCallEnd);
    return () => socket.off('call:end', onCallEnd);
  }, [socketRef.current, callId]); // eslint-disable-line

  // ── In-call chat: receive messages from server ───────────────────────
  useEffect(() => {
    const socket = socketRef.current;
    if (!socket) return;

    const onMessage = (msg) => {
      setMessages((prev) => [...prev, msg]);
    };

    socket.on('chat:message', onMessage);
    return () => socket.off('chat:message', onMessage);
  }, [socketRef.current]); // eslint-disable-line

  const handleSendMessage = (payload) => {
    setMessages((prev) => [...prev, payload]);
  };

  // ── Guard: no roomUrl means we arrived here without call acceptance ─
  if (!roomUrl) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg">
        <div className="text-center">
          <p className="text-text-muted mb-4">No active call session found.</p>
          <button
            onClick={() => navigate('/dashboard')}
            className="px-4 py-2 rounded-lg bg-primary text-on-primary font-semibold"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg flex flex-col">
      {/* Header */}
      <div className="bg-surface border-b border-border px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg">🔊</span>
          <span className="font-bold text-text">Sonar</span>
          <span className="ml-2 text-xs text-text-muted font-mono opacity-60 hidden sm:inline">
            {callId}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
          <span className="text-xs text-success font-medium">Live</span>
        </div>
      </div>

      {/* Error banner */}
      {callError && (
        <div className="bg-danger-tint border-b border-danger/30 px-4 py-2 text-danger text-sm text-center">
          {callError}
        </div>
      )}

      {/* Main area */}
      <div className="flex-1 flex flex-col lg:flex-row gap-4 p-4 max-w-7xl mx-auto w-full">
        {/* Video */}
        <div className="flex-1 min-h-0">
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

        {/* Chat sidebar */}
        <div className="lg:w-80 flex-shrink-0 h-64 lg:h-auto">
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
