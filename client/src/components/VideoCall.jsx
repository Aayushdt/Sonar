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
} from 'lucide-react';

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
