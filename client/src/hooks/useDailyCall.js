import { useEffect, useRef, useState } from 'react';
import DailyIframe from '@daily-co/daily-js';

// Module-level singleton reference and deferred cleanup timer.
// In React 18+ development mode, StrictMode intentionally mounts, unmounts,
// and immediately re-mounts components to detect unsafe side effects.
// Because Daily.co enforces a strict single-instance constraint per document
// ("Duplicate DailyIframe instances are not allowed"), an immediate synchronous
// destroy/recreate would race against Daily's asynchronous teardown.
// This pattern defers destruction across the tick so StrictMode's immediate
// second mount reuses the surviving call instance instead of creating a duplicate.
let sharedCallObject = null;
let pendingDestroyTimeout = null;

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

    // 1. Resolve or create Daily call object using singleton + deferred-cleanup pattern
    if (pendingDestroyTimeout) {
      clearTimeout(pendingDestroyTimeout);
      pendingDestroyTimeout = null;
    }

    let call = sharedCallObject || DailyIframe.getCallInstance();
    if (!call) {
      call = DailyIframe.createCallObject();
      sharedCallObject = call;
    } else {
      sharedCallObject = call;
    }
    dailyRef.current = call;

    // 2. Event listener handlers
    const handleTrackStarted = (event) => {
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
    };

    const handleTrackStopped = (event) => {
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
    };

    const handleParticipantJoined = (event) => {
      if (!event.participant.local) {
        setRemoteParticipant(event.participant);
      }
    };

    const handleParticipantUpdated = (event) => {
      if (!event.participant.local) {
        setRemoteParticipant(event.participant);
      }
    };

    const handleParticipantLeft = (event) => {
      if (!event.participant.local) {
        setRemoteParticipant(null);
        if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
        if (remoteAudioRef.current) remoteAudioRef.current.srcObject = null;
        if (remoteScreenRef.current) remoteScreenRef.current.srcObject = null;
        if (onCallEnded) onCallEnded();
      }
    };

    const handleScreenShareStarted = () => {
      setIsScreenSharing(true);
    };

    const handleScreenShareStopped = () => {
      setIsScreenSharing(false);
    };

    const handleCameraError = (err) => {
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
    };

    const handleNonfatalError = (err) => {
      console.warn('[Daily] Nonfatal error:', err);
      const msg = err?.errorMsg || 'A momentary transmission jitter occurred.';
      setCallError((prev) => prev || `Notice: ${msg}`);
    };

    const handleNetworkConnection = (event) => {
      console.log('[Daily] Network status:', event);
      if (event.event === 'interrupted' || event.event === 'reconnecting') {
        setNetworkState('reconnecting');
      } else if (event.event === 'connected') {
        setNetworkState('connected');
      }
    };

    const handleError = (err) => {
      console.error('[Daily] Call error:', err);
      setCallError('Video transmission error. Please check your network connection.');
    };

    // Attach listeners
    call.on('track-started', handleTrackStarted);
    call.on('track-stopped', handleTrackStopped);
    call.on('participant-joined', handleParticipantJoined);
    call.on('participant-updated', handleParticipantUpdated);
    call.on('participant-left', handleParticipantLeft);
    call.on('local-screen-share-started', handleScreenShareStarted);
    call.on('local-screen-share-stopped', handleScreenShareStopped);
    call.on('camera-error', handleCameraError);
    call.on('nonfatal-error', handleNonfatalError);
    call.on('network-connection', handleNetworkConnection);
    call.on('error', handleError);

    // 3. Join the Daily room only if not already joined or joining
    const meetingState = typeof call.meetingState === 'function' ? call.meetingState() : 'new';
    if (meetingState === 'new' || meetingState === 'loaded') {
      call.join({ url: roomUrl }).catch((err) => {
        console.error('[Daily] join() failed:', err);
        setCallError('Could not connect to video server. Ensure valid DAILY_API_KEY is configured in server/.env.');
      });
    } else if (meetingState === 'joined-meeting' && typeof call.participants === 'function') {
      // If already joined on StrictMode remount, sync existing participant state
      const participants = call.participants();
      const remote = Object.values(participants).find((p) => !p.local);
      if (remote) setRemoteParticipant(remote);
    }

    // 4. Deferred cleanup: do NOT destroy synchronously
    return () => {
      call.off('track-started', handleTrackStarted);
      call.off('track-stopped', handleTrackStopped);
      call.off('participant-joined', handleParticipantJoined);
      call.off('participant-updated', handleParticipantUpdated);
      call.off('participant-left', handleParticipantLeft);
      call.off('local-screen-share-started', handleScreenShareStarted);
      call.off('local-screen-share-stopped', handleScreenShareStopped);
      call.off('camera-error', handleCameraError);
      call.off('nonfatal-error', handleNonfatalError);
      call.off('network-connection', handleNetworkConnection);
      call.off('error', handleError);

      if (pendingDestroyTimeout) {
        clearTimeout(pendingDestroyTimeout);
      }
      pendingDestroyTimeout = setTimeout(() => {
        pendingDestroyTimeout = null;
        if (sharedCallObject) {
          const callToDestroy = sharedCallObject;
          sharedCallObject = null;
          dailyRef.current = null;
          callToDestroy
            .leave()
            .catch(() => {})
            .finally(() => {
              try {
                callToDestroy.destroy();
              } catch (_) {}
            });
        }
      }, 0);
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
    if (pendingDestroyTimeout) {
      clearTimeout(pendingDestroyTimeout);
      pendingDestroyTimeout = null;
    }
    const call = dailyRef.current || sharedCallObject;
    if (call) {
      try {
        await call.leave();
        call.destroy();
      } catch {
        // Ignore errors during manual hang-up
      } finally {
        dailyRef.current = null;
        sharedCallObject = null;
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
