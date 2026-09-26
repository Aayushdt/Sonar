import { useEffect, useRef, useState } from 'react';
import DailyIframe from '@daily-co/daily-js';

/**
 * useDailyCall
 * Encapsulates the Daily.co call object lifecycle.
 *
 * @param {string|null} roomUrl - Daily room URL received from call:accepted
 * @param {function} onCallConnected - Called when remote participant's track is received
 * @param {function} onCallEnded   - Called when remote participant leaves
 */
export const useDailyCall = (roomUrl, onCallConnected, onCallEnded) => {
  // Persist Daily call object across re-renders — must NOT be in state
  const dailyRef = useRef(null);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const remoteAudioRef = useRef(null);
  const remoteScreenRef = useRef(null);

  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isBackgroundBlur, setIsBackgroundBlur] = useState(false);
  const [isNoiseCancellation, setIsNoiseCancellation] = useState(false);
  const [networkState, setNetworkState] = useState('connected'); // 'connected' | 'reconnecting' | 'interrupted'
  const [remoteParticipant, setRemoteParticipant] = useState(null);
  const [callError, setCallError] = useState(null);

  useEffect(() => {
    if (!roomUrl) return;

    // 1. Create headless call object
    const call = DailyIframe.createCallObject();
    dailyRef.current = call;

    // 2. Listen for local & remote track events
    call.on('track-started', (event) => {
      const { participant, track, type } = event;

      if (participant.local) {
        if (track.kind === 'video' && type !== 'screenVideo' && localVideoRef.current) {
          localVideoRef.current.srcObject = new MediaStream([track]);
        }
      } else {
        if (type === 'screenVideo') {
          if (remoteScreenRef.current) {
            remoteScreenRef.current.srcObject = new MediaStream([track]);
          } else if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = new MediaStream([track]);
          }
        } else if (track.kind === 'video' && remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = new MediaStream([track]);
        }

        if (track.kind === 'audio' && remoteAudioRef.current) {
          remoteAudioRef.current.srcObject = new MediaStream([track]);
        }

        if (onCallConnected) onCallConnected();
      }
    });

    call.on('track-stopped', (event) => {
      const { participant, track, type } = event;
      if (participant.local) {
        if (track.kind === 'video' && type !== 'screenVideo' && localVideoRef.current) {
          localVideoRef.current.srcObject = null;
        }
      } else {
        if (type === 'screenVideo') {
          if (remoteScreenRef.current) remoteScreenRef.current.srcObject = null;
        } else if (track.kind === 'video' && remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = null;
        }
        if (track.kind === 'audio' && remoteAudioRef.current) {
          remoteAudioRef.current.srcObject = null;
        }
      }
    });

    call.on('participant-joined', (event) => {
      if (!event.participant.local) {
        setRemoteParticipant(event.participant);
      }
    });

    call.on('participant-updated', (event) => {
      if (!event.participant.local) {
        setRemoteParticipant(event.participant);
      }
    });

    call.on('participant-left', (event) => {
      if (!event.participant.local) {
        setRemoteParticipant(null);
        if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
        if (remoteAudioRef.current) remoteAudioRef.current.srcObject = null;
        if (remoteScreenRef.current) remoteScreenRef.current.srcObject = null;
        if (onCallEnded) onCallEnded();
      }
    });

    // ── Screen sharing events ──
    call.on('local-screen-share-started', () => {
      setIsScreenSharing(true);
    });

    call.on('local-screen-share-stopped', () => {
      setIsScreenSharing(false);
    });

    // ── Surface Daily's permission-denied & camera errors with clear UI messaging ──
    call.on('camera-error', (err) => {
      console.warn('[Daily] Camera error:', err);
      const msg = err?.errorMsg?.errorMsg || err?.errorMsg || String(err);
      if (
        msg.toLowerCase().includes('notallowed') ||
        msg.toLowerCase().includes('not-allowed') ||
        msg.toLowerCase().includes('permission')
      ) {
        setCallError('Camera or microphone access was blocked. Please allow permissions in your browser URL bar.');
      } else if (msg.toLowerCase().includes('notfound') || msg.toLowerCase().includes('devices')) {
        setCallError('No camera/mic detected on your system. Continuing in receive-only mode.');
      } else {
        setCallError(`Hardware warning: ${msg}`);
      }
    });

    call.on('nonfatal-error', (err) => {
      console.warn('[Daily] Nonfatal error:', err);
      const msg = err?.errorMsg || 'A momentary transmission jitter occurred.';
      // Don't override critical permission errors
      setCallError((prev) => prev || `Notice: ${msg}`);
    });

    // ── Network status tracking (reconnecting instead of frozen tile) ──
    call.on('network-connection', (event) => {
      console.log('[Daily] Network status:', event);
      if (event.event === 'interrupted' || event.event === 'reconnecting') {
        setNetworkState('reconnecting');
      } else if (event.event === 'connected') {
        setNetworkState('connected');
      }
    });

    call.on('error', (err) => {
      console.error('[Daily] Call error:', err);
      setCallError('Video transmission error. Please check your network connection.');
    });

    // 3. Join the Daily room
    call.join({ url: roomUrl }).catch((err) => {
      console.error('[Daily] join() failed:', err);
      setCallError('Could not connect to video server. Ensure valid DAILY_API_KEY is configured in server/.env.');
    });

    // 4. Cleanup: leave and destroy
    return () => {
      call
        .leave()
        .catch(() => {})
        .finally(() => {
          call.destroy();
          dailyRef.current = null;
        });
    };
  }, [roomUrl]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Media toggle helpers ───

  const toggleAudio = () => {
    if (!dailyRef.current) return;
    const next = !isAudioMuted;
    dailyRef.current.setLocalAudio(!next);
    setIsAudioMuted(next);
  };

  const toggleVideo = () => {
    if (!dailyRef.current) return;
    const next = !isVideoOff;
    dailyRef.current.setLocalVideo(!next);
    setIsVideoOff(next);
  };

  // ─── Screen Sharing ───
  const toggleScreenShare = async () => {
    if (!dailyRef.current) return;
    try {
      if (isScreenSharing) {
        await dailyRef.current.stopScreenShare();
        setIsScreenSharing(false);
      } else {
        await dailyRef.current.startScreenShare();
        setIsScreenSharing(true);
      }
    } catch (err) {
      console.warn('[Daily] Screen share error/cancelled:', err);
      setIsScreenSharing(false);
    }
  };

  // ─── Background Blur ───
  const toggleBackgroundBlur = async () => {
    if (!dailyRef.current || !dailyRef.current.updateInputSettings) return;
    try {
      const next = !isBackgroundBlur;
      await dailyRef.current.updateInputSettings({
        video: {
          processor: next ? { type: 'background-blur' } : { type: 'none' },
        },
      });
      setIsBackgroundBlur(next);
    } catch (err) {
      console.warn('[Daily] Background blur unsupported or failed:', err);
      setCallError('Background blur is not supported by your current browser/hardware.');
    }
  };

  // ─── Noise Cancellation (Krisp) ───
  const toggleNoiseCancellation = async () => {
    if (!dailyRef.current || !dailyRef.current.updateInputSettings) return;
    try {
      const next = !isNoiseCancellation;
      await dailyRef.current.updateInputSettings({
        audio: {
          processor: next ? { type: 'noise-cancellation' } : { type: 'none' },
        },
      });
      setIsNoiseCancellation(next);
    } catch (err) {
      console.warn('[Daily] Noise cancellation unsupported or failed:', err);
      setCallError('Acoustic noise cancellation is not supported on this device.');
    }
  };

  // ─── Teardown ───
  const hangUp = async () => {
    if (dailyRef.current) {
      try {
        await dailyRef.current.leave();
        dailyRef.current.destroy();
      } catch {
        // Ignore errors during manual hang-up
      } finally {
        dailyRef.current = null;
      }
    }
    if (localVideoRef.current) localVideoRef.current.srcObject = null;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
    if (remoteAudioRef.current) remoteAudioRef.current.srcObject = null;
    if (remoteScreenRef.current) remoteScreenRef.current.srcObject = null;
  };

  return {
    localVideoRef,
    remoteVideoRef,
    remoteAudioRef,
    remoteScreenRef,
    isAudioMuted,
    isVideoOff,
    isScreenSharing,
    isBackgroundBlur,
    isNoiseCancellation,
    networkState,
    remoteParticipant,
    callError,
    toggleAudio,
    toggleVideo,
    toggleScreenShare,
    toggleBackgroundBlur,
    toggleNoiseCancellation,
    hangUp,
  };
};
