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

  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [remoteParticipant, setRemoteParticipant] = useState(null);
  const [callError, setCallError] = useState(null);

  useEffect(() => {
    if (!roomUrl) return;

    // 1. Create headless call object (we render our own UI, not the Daily iframe)
    const call = DailyIframe.createCallObject();
    dailyRef.current = call;

    // 2. Listen for local & remote track events to attach to <video> & <audio> elements
    call.on('track-started', (event) => {
      const { participant, track } = event;

      if (participant.local) {
        // Local track: attach to PIP video element (mirrored by CSS)
        if (track.kind === 'video' && localVideoRef.current) {
          localVideoRef.current.srcObject = new MediaStream([track]);
        }
      } else {
        // Remote track: attach video to main element, audio to audio element
        if (track.kind === 'video' && remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = new MediaStream([track]);
        }
        if (track.kind === 'audio' && remoteAudioRef.current) {
          remoteAudioRef.current.srcObject = new MediaStream([track]);
        }
        // Notify caller that remote media has started — triggers startedAt logging
        if (onCallConnected) onCallConnected();
      }
    });

    call.on('track-stopped', (event) => {
      const { participant, track } = event;
      if (participant.local && track.kind === 'video' && localVideoRef.current) {
        localVideoRef.current.srcObject = null;
      } else if (!participant.local) {
        if (track.kind === 'video' && remoteVideoRef.current) {
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

    // Remote peer left — trigger hangup flow on local side
    call.on('participant-left', (event) => {
      if (!event.participant.local) {
        setRemoteParticipant(null);
        if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
        if (remoteAudioRef.current) remoteAudioRef.current.srcObject = null;
        if (onCallEnded) onCallEnded();
      }
    });

    call.on('error', (err) => {
      console.error('[Daily] Call error:', err);
      setCallError('Video call error. Please try again.');
    });

    // 3. Join the Daily room
    call.join({ url: roomUrl }).catch((err) => {
      console.error('[Daily] join() failed:', err);
      setCallError('Could not join the video room. Check your camera/microphone permissions.');
    });

    // 4. Cleanup: leave and destroy when component unmounts or roomUrl changes
    return () => {
      call
        .leave()
        .catch(() => {}) // swallow leave errors on forced unmount
        .finally(() => {
          call.destroy();
          dailyRef.current = null;
        });
    };
  }, [roomUrl]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Media toggle helpers (Daily API — no manual track.enabled manipulation) ───

  const toggleAudio = () => {
    if (!dailyRef.current) return;
    const next = !isAudioMuted;
    dailyRef.current.setLocalAudio(!next); // true = audio ON, false = audio OFF
    setIsAudioMuted(next);
  };

  const toggleVideo = () => {
    if (!dailyRef.current) return;
    const next = !isVideoOff;
    dailyRef.current.setLocalVideo(!next);
    setIsVideoOff(next);
  };

  // ─── Teardown ───────────────────────────────────────────────────────────────
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
    // Clear video and audio elements
    if (localVideoRef.current) localVideoRef.current.srcObject = null;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
    if (remoteAudioRef.current) remoteAudioRef.current.srcObject = null;
  };

  return {
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
  };
};
