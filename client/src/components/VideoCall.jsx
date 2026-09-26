import { useRef, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  PhoneOff,
  Radio,
  ShieldCheck,
  ScreenShare,
  ScreenShareOff,
  Sparkles,
  Waves,
  RefreshCw,
  Disc,
  Square,
} from 'lucide-react';
import { useRecordingStore } from '../store/useRecordingStore';

/**
 * VideoCall
 * Broadcast-grade acoustic video monitor with precision HUD controls,
 * screen sharing, background blur, noise cancellation, and reconnecting state.
 */
const VideoCall = ({
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
  toggleAudio,
  toggleVideo,
  toggleScreenShare,
  toggleBackgroundBlur,
  toggleNoiseCancellation,
  onHangUp,
}) => {
  const {
    isRecording,
    recordingSeconds,
    recordingError,
    lastRecordingUrl,
    setIsRecording,
    setRecordingSeconds,
    setRecordingError,
    setLastRecordingUrl,
  } = useRecordingStore();

  const mediaRecorderRef = useRef(null);
  const recordedChunksRef = useRef([]);
  const animationFrameRef = useRef(null);
  const audioContextRef = useRef(null);
  const timerIntervalRef = useRef(null);
  const compositeStreamRef = useRef(null);
  const localAudioStreamRef = useRef(null);
  const lastUrlRef = useRef(null);

  const formatDuration = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const cleanupResources = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    if (compositeStreamRef.current) {
      compositeStreamRef.current.getTracks().forEach((track) => track.stop());
      compositeStreamRef.current = null;
    }
    if (localAudioStreamRef.current) {
      localAudioStreamRef.current.getTracks().forEach((track) => track.stop());
      localAudioStreamRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
  };

  const stopRecording = () => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    } else {
      cleanupResources();
    }
    setIsRecording(false);
  };

  const startRecording = async () => {
    setRecordingError(null);

    // Feature detect MediaRecorder support and canvas.captureStream
    if (
      typeof window === 'undefined' ||
      !window.MediaRecorder ||
      typeof HTMLCanvasElement.prototype.captureStream !== 'function'
    ) {
      setRecordingError('MediaRecorder is not supported in this browser.');
      return;
    }

    try {
      // 1. Offscreen Canvas setup for video compositing
      const canvas = document.createElement('canvas');
      canvas.width = 1280;
      canvas.height = 720;
      const ctx = canvas.getContext('2d');

      const drawFrame = () => {
        // Clear background with dark tactile tone
        ctx.fillStyle = '#0b0f17';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Draw remote screen share (if active) or remote video
        const remoteVideo = remoteVideoRef?.current;
        const remoteScreen = remoteScreenRef?.current;

        let drewMain = false;
        if (remoteScreen && remoteScreen.readyState >= 2 && !remoteScreen.paused) {
          ctx.drawImage(remoteScreen, 0, 0, canvas.width, canvas.height);
          drewMain = true;
        } else if (remoteVideo && remoteVideo.readyState >= 2 && !remoteVideo.paused) {
          ctx.drawImage(remoteVideo, 0, 0, canvas.width, canvas.height);
          drewMain = true;
        }

        if (!drewMain) {
          ctx.fillStyle = '#334155';
          ctx.font = 'bold 20px monospace';
          ctx.textAlign = 'center';
          ctx.fillText('SONAR TRANSMISSION // AWAITING VIDEO FEED', canvas.width / 2, canvas.height / 2);
        }

        // Draw local Picture-In-Picture in bottom right
        const localVideo = localVideoRef?.current;
        if (localVideo && localVideo.readyState >= 2 && !isVideoOff) {
          const pipWidth = 320;
          const pipHeight = 180;
          const pipX = canvas.width - pipWidth - 24;
          const pipY = canvas.height - pipHeight - 24;

          // PIP background
          ctx.fillStyle = '#000000';
          ctx.fillRect(pipX, pipY, pipWidth, pipHeight);

          // Mirrored local video
          ctx.save();
          ctx.translate(pipX + pipWidth, pipY);
          ctx.scale(-1, 1);
          ctx.drawImage(localVideo, 0, 0, pipWidth, pipHeight);
          ctx.restore();

          // Border
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
          ctx.lineWidth = 2;
          ctx.strokeRect(pipX, pipY, pipWidth, pipHeight);
        }

        animationFrameRef.current = requestAnimationFrame(drawFrame);
      };

      animationFrameRef.current = requestAnimationFrame(drawFrame);
      const canvasStream = canvas.captureStream(30);
      const canvasVideoTrack = canvasStream.getVideoTracks()[0];

      // 2. Mix local + remote audio tracks into one track using Web Audio API
      const AudioCtxClass = window.AudioContext || window.webkitAudioContext;
      const audioCtx = new AudioCtxClass();
      audioContextRef.current = audioCtx;
      const destination = audioCtx.createMediaStreamDestination();

      let hasAudioSource = false;

      // Remote audio track
      const remoteAudioStream = remoteAudioRef?.current?.srcObject;
      if (remoteAudioStream && remoteAudioStream.getAudioTracks().length > 0) {
        const remoteAudioTrack = remoteAudioStream.getAudioTracks()[0];
        const remoteAudioSource = audioCtx.createMediaStreamSource(new MediaStream([remoteAudioTrack]));
        remoteAudioSource.connect(destination);
        hasAudioSource = true;
      }

      // Local audio track: check localVideoRef.srcObject or request microphone
      let localAudioTrack = null;
      const localStream = localVideoRef?.current?.srcObject;
      if (localStream && localStream.getAudioTracks().length > 0) {
        localAudioTrack = localStream.getAudioTracks()[0];
      } else if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        try {
          const userMicStream = await navigator.mediaDevices.getUserMedia({ audio: true });
          localAudioStreamRef.current = userMicStream;
          localAudioTrack = userMicStream.getAudioTracks()[0];
        } catch (micErr) {
          console.warn('Could not acquire local microphone for recording:', micErr);
        }
      }

      if (localAudioTrack) {
        const localAudioSource = audioCtx.createMediaStreamSource(new MediaStream([localAudioTrack]));
        localAudioSource.connect(destination);
        hasAudioSource = true;
      }

      // 3. Combine canvas video track + mixed audio track into one MediaStream
      const tracks = [canvasVideoTrack];
      if (hasAudioSource && destination.stream.getAudioTracks().length > 0) {
        tracks.push(destination.stream.getAudioTracks()[0]);
      }
      const compositeStream = new MediaStream(tracks);
      compositeStreamRef.current = compositeStream;

      // 4. MediaRecorder (webm/vp9 if supported, sensible fallback otherwise)
      const mimeTypes = [
        'video/webm;codecs=vp9,opus',
        'video/webm;codecs=vp8,opus',
        'video/webm;codecs=h264,opus',
        'video/webm',
        'video/mp4',
      ];
      const selectedMime = mimeTypes.find((t) => MediaRecorder.isTypeSupported(t)) || '';
      const recorder = new MediaRecorder(
        compositeStream,
        selectedMime ? { mimeType: selectedMime } : undefined
      );
      mediaRecorderRef.current = recorder;
      recordedChunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };

      recorder.onerror = (event) => {
        setRecordingError('Recording error: ' + (event.error?.message || 'unknown error'));
        stopRecording();
      };

      recorder.onstop = () => {
        const blob = new Blob(recordedChunksRef.current, {
          type: selectedMime || 'video/webm',
        });

        if (blob.size > 0) {
          const url = URL.createObjectURL(blob);
          if (lastUrlRef.current) {
            URL.revokeObjectURL(lastUrlRef.current);
          }
          lastUrlRef.current = url;
          setLastRecordingUrl(url);

          const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
          const a = document.createElement('a');
          a.style.display = 'none';
          a.href = url;
          a.download = `sonar-call-${timestamp}.webm`;
          document.body.appendChild(a);
          a.click();
          setTimeout(() => {
            if (document.body.contains(a)) {
              document.body.removeChild(a);
            }
          }, 100);
        }
        cleanupResources();
      };

      recorder.start(1000);
      setIsRecording(true);
      setRecordingSeconds(0);

      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
      timerIntervalRef.current = setInterval(() => {
        setRecordingSeconds((s) => s + 1);
      }, 1000);
    } catch (err) {
      console.error('Failed to start call recording:', err);
      setRecordingError(err.message || 'Failed to start call recording.');
      cleanupResources();
      setIsRecording(false);
    }
  };

  useEffect(() => {
    return () => {
      cleanupResources();
      if (lastUrlRef.current) {
        URL.revokeObjectURL(lastUrlRef.current);
      }
    };
  }, []);

  return (
    <div className="relative w-full h-full min-h-[420px] lg:min-h-[500px] bg-panel rounded-3xl overflow-hidden border border-border dark:border-border-dark shadow-tactile-lg flex items-center justify-center">
      {/* ── Remote audio element ── */}
      <audio ref={remoteAudioRef} autoPlay playsInline />

      {/* ── Remote main video element ── */}
      <video
        ref={remoteVideoRef}
        autoPlay
        playsInline
        className="w-full h-full object-cover"
      />

      {/* ── Remote screen share video element (if active) ── */}
      <video
        ref={remoteScreenRef}
        autoPlay
        playsInline
        className="absolute inset-0 w-full h-full object-contain bg-black/90 z-10 empty:hidden"
      />

      {/* ── Precision HUD Overlays ── */}
      {/* Top Left: Stream Telemetry */}
      <div className="absolute top-4 left-4 z-20 flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-black/60 backdrop-blur-md border border-white/10 text-white font-mono text-[11px]">
          <span
            className={`w-2 h-2 rounded-full ${
              networkState === 'reconnecting'
                ? 'bg-warning animate-ping'
                : remoteParticipant
                ? 'bg-success animate-pulse'
                : 'bg-primary'
            }`}
          />
          <span>
            {networkState === 'reconnecting'
              ? 'RECONNECTING // JITTER DROP'
              : remoteParticipant
              ? 'CARRIER LOCK // 1080p'
              : 'SCANNING // 48kHz'}
          </span>
        </div>
        <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-black/60 backdrop-blur-md border border-white/10 text-white/70 font-mono text-[11px]">
          <ShieldCheck className="w-3.5 h-3.5 text-accent" />
          <span>E2E WEBRTC</span>
        </div>

        {/* Noise Cancellation Badge */}
        {isNoiseCancellation && (
          <div className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-accent/20 border border-accent/40 text-accent font-mono text-[10px]">
            <Waves className="w-3 h-3" />
            <span>KRISP ANC</span>
          </div>
        )}

        {/* Background Blur Badge */}
        {isBackgroundBlur && (
          <div className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-primary/20 border border-primary/40 text-primary-light font-mono text-[10px]">
            <Sparkles className="w-3 h-3" />
            <span>BLUR ON</span>
          </div>
        )}

        {/* Recording Active HUD Badge */}
        {isRecording && (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-danger/20 border border-danger/40 text-white font-mono text-[10px] animate-pulse">
            <span className="w-2 h-2 rounded-full bg-danger inline-block" />
            <span>REC {formatDuration(recordingSeconds)}</span>
          </div>
        )}

        {/* Last Recording Download Link */}
        {lastRecordingUrl && !isRecording && (
          <a
            href={lastRecordingUrl}
            download="sonar-call-last.webm"
            className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white/90 font-mono text-[10px] transition-colors"
            title="Download Last Recording"
          >
            <span>LAST REC ↓</span>
          </a>
        )}

        {/* Recording Error Notice */}
        {recordingError && (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-danger/30 border border-danger/50 text-white font-mono text-[10px]">
            <span>REC ERR: {recordingError}</span>
          </div>
        )}
      </div>

      {/* Viewfinder Corner Markings */}
      <div className="absolute top-3 right-3 w-6 h-6 border-t-2 border-r-2 border-white/20 pointer-events-none rounded-tr-lg" />
      <div className="absolute bottom-3 left-3 w-6 h-6 border-b-2 border-l-2 border-white/20 pointer-events-none rounded-bl-lg" />

      {/* Reconnecting Overlay during network drop */}
      {networkState === 'reconnecting' && (
        <div className="absolute inset-0 z-25 flex flex-col items-center justify-center bg-black/75 backdrop-blur-sm p-6 text-center">
          <div className="w-14 h-14 rounded-2xl bg-warning/20 border border-warning/40 flex items-center justify-center text-warning mb-3">
            <RefreshCw className="w-7 h-7 animate-spin" />
          </div>
          <h4 className="font-display font-bold text-base text-white">Transmission Interrupted</h4>
          <p className="text-white/70 text-xs font-mono mt-1">Re-establishing carrier frequency lock…</p>
        </div>
      )}

      {/* Waiting State if remote peer hasn't joined */}
      {!remoteParticipant && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-surface-dark/95 backdrop-blur-md p-6 text-center">
          <div className="relative mb-6">
            <div className="w-20 h-20 rounded-full bg-primary/20 animate-ping absolute inset-0" />
            <div className="w-20 h-20 rounded-2xl bg-surface-2-dark border border-border-dark flex items-center justify-center text-primary-dark">
              <Radio className="w-8 h-8 animate-pulse" />
            </div>
          </div>
          <h3 className="font-display font-bold text-xl text-text-dark tracking-tight">
            Carrier Frequency Active
          </h3>
          <p className="text-text-muted-dark text-xs max-w-sm mt-1.5 font-mono">
            Awaiting remote station signal handshake. Audio channel initialized.
          </p>
        </div>
      )}

      {/* ── Local Picture-in-Picture (PIP) (Bottom-Right) ── */}
      <div className="absolute bottom-20 sm:bottom-6 right-4 sm:right-6 z-20 w-32 sm:w-44 aspect-video rounded-2xl overflow-hidden border-2 border-white/20 shadow-tactile-lg bg-black group">
        <video
          ref={localVideoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-cover"
          style={{ transform: 'scaleX(-1)' }}
        />
        {isVideoOff && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-surface-dark text-text-muted-dark text-xs gap-1">
            <VideoOff className="w-5 h-5 text-danger" />
            <span className="font-mono text-[9px]">CAM MUTED</span>
          </div>
        )}
        <div className="absolute bottom-1 left-2 pointer-events-none">
          <span className="text-[9px] font-mono uppercase bg-black/70 px-1.5 py-0.5 rounded text-white/80">
            Local PIP
          </span>
        </div>
      </div>

      {/* ── Floating Tactile Controls Deck ── */}
      <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-30 flex items-center gap-1.5 sm:gap-2.5 p-2 rounded-2xl bg-black/75 backdrop-blur-xl border border-white/15 shadow-tactile-lg">
        {/* Toggle Audio */}
        <motion.button
          whileHover={{ scale: 1.06 }}
          whileTap={{ scale: 0.94 }}
          onClick={toggleAudio}
          title={isAudioMuted ? 'Unmute Microphone' : 'Mute Microphone'}
          className={`w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center transition-all ${
            isAudioMuted
              ? 'bg-danger text-white shadow-tactile-sm'
              : 'bg-white/15 text-white hover:bg-white/25'
          }`}
        >
          {isAudioMuted ? <MicOff className="w-4 h-4 sm:w-5 sm:h-5" /> : <Mic className="w-4 h-4 sm:w-5 sm:h-5" />}
        </motion.button>

        {/* Toggle Video */}
        <motion.button
          whileHover={{ scale: 1.06 }}
          whileTap={{ scale: 0.94 }}
          onClick={toggleVideo}
          title={isVideoOff ? 'Enable Camera' : 'Disable Camera'}
          className={`w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center transition-all ${
            isVideoOff
              ? 'bg-danger text-white shadow-tactile-sm'
              : 'bg-white/15 text-white hover:bg-white/25'
          }`}
        >
          {isVideoOff ? <VideoOff className="w-4 h-4 sm:w-5 sm:h-5" /> : <Video className="w-4 h-4 sm:w-5 sm:h-5" />}
        </motion.button>

        {/* Screen Sharing Toggle */}
        <motion.button
          whileHover={{ scale: 1.06 }}
          whileTap={{ scale: 0.94 }}
          onClick={toggleScreenShare}
          title={isScreenSharing ? 'Stop Screen Sharing' : 'Share Screen'}
          className={`w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center transition-all ${
            isScreenSharing
              ? 'bg-accent text-white shadow-tactile-sm'
              : 'bg-white/15 text-white hover:bg-white/25'
          }`}
        >
          {isScreenSharing ? (
            <ScreenShareOff className="w-4 h-4 sm:w-5 sm:h-5" />
          ) : (
            <ScreenShare className="w-4 h-4 sm:w-5 sm:h-5" />
          )}
        </motion.button>

        {/* Background Blur Toggle */}
        <motion.button
          whileHover={{ scale: 1.06 }}
          whileTap={{ scale: 0.94 }}
          onClick={toggleBackgroundBlur}
          title={isBackgroundBlur ? 'Disable Background Blur' : 'Enable Background Blur'}
          className={`w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center transition-all ${
            isBackgroundBlur
              ? 'bg-primary text-white shadow-tactile-sm'
              : 'bg-white/15 text-white hover:bg-white/25'
          }`}
        >
          <Sparkles className="w-4 h-4 sm:w-5 sm:h-5" />
        </motion.button>

        {/* Noise Cancellation Toggle */}
        <motion.button
          whileHover={{ scale: 1.06 }}
          whileTap={{ scale: 0.94 }}
          onClick={toggleNoiseCancellation}
          title={isNoiseCancellation ? 'Disable Noise Cancellation' : 'Enable Acoustic Noise Cancellation'}
          className={`w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center transition-all ${
            isNoiseCancellation
              ? 'bg-secondary text-white shadow-tactile-sm'
              : 'bg-white/15 text-white hover:bg-white/25'
          }`}
        >
          <Waves className="w-4 h-4 sm:w-5 sm:h-5" />
        </motion.button>

        {/* Call Recording Toggle */}
        <motion.button
          whileHover={{ scale: 1.06 }}
          whileTap={{ scale: 0.94 }}
          onClick={isRecording ? stopRecording : startRecording}
          title={isRecording ? `Stop Recording (${formatDuration(recordingSeconds)})` : 'Record Call Session'}
          className={`tactile-btn w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center transition-all ${
            isRecording
              ? 'bg-danger text-white shadow-tactile-sm animate-pulse'
              : 'bg-white/15 text-white hover:bg-white/25'
          }`}
        >
          {isRecording ? (
            <Square className="w-4 h-4 sm:w-5 sm:h-5 fill-current" />
          ) : (
            <Disc className="w-4 h-4 sm:w-5 sm:h-5 text-danger" />
          )}
        </motion.button>

        <div className="w-[1px] h-6 bg-white/20 mx-0.5 sm:mx-1" />

        {/* Hang Up Button */}
        <motion.button
          whileHover={{ scale: 1.06 }}
          whileTap={{ scale: 0.94 }}
          onClick={onHangUp}
          title="Terminate Transmission"
          className="px-4 sm:px-5 h-10 sm:h-11 rounded-xl bg-danger hover:bg-danger/90 text-white font-display font-semibold text-xs flex items-center gap-1.5 sm:gap-2 shadow-tactile-md"
        >
          <PhoneOff className="w-4 h-4" />
          <span className="hidden sm:inline">Terminate</span>
        </motion.button>
      </div>
    </div>
  );
};

export default VideoCall;
