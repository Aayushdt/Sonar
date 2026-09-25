/**
 * VideoCall
 * Renders the two video elements:
 *  - Large: remote participant (main view)
 *  - Small PIP: local user (mirrored, bottom-right overlay)
 *
 * Props: localVideoRef, remoteVideoRef, isAudioMuted, isVideoOff,
 *        remoteParticipant, toggleAudio, toggleVideo, onHangUp
 */
const VideoCall = ({
  localVideoRef,
  remoteVideoRef,
  remoteAudioRef,
  isAudioMuted,
  isVideoOff,
  remoteParticipant,
  toggleAudio,
  toggleVideo,
  onHangUp,
}) => {
  return (
    <div className="relative w-full bg-black rounded-2xl overflow-hidden" style={{ aspectRatio: '16/9' }}>
      {/* ── Remote audio ───────────────────────────────────────────── */}
      <audio ref={remoteAudioRef} autoPlay playsInline />

      {/* ── Remote video (main) ────────────────────────────────────── */}
      <video
        ref={remoteVideoRef}
        autoPlay
        playsInline
        className="w-full h-full object-cover"
      />

      {/* Waiting for remote message */}
      {!remoteParticipant && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-surface-2">
          <div className="text-5xl mb-4 animate-pulse">📡</div>
          <p className="text-text-muted font-medium">Waiting for the other person to join…</p>
        </div>
      )}

      {/* ── Local PIP (bottom-right) ────────────────────────────────── */}
      <div className="absolute bottom-4 right-4 w-32 aspect-video rounded-xl
                      overflow-hidden border-2 border-white/20 shadow-lg bg-black">
        <video
          ref={localVideoRef}
          autoPlay
          playsInline
          muted // local video is always muted to prevent audio feedback
          className="w-full h-full object-cover"
          style={{ transform: 'scaleX(-1)' }} // mirror local view
        />
        {isVideoOff && (
          <div className="absolute inset-0 flex items-center justify-center bg-surface-2 text-xl">
            🚫
          </div>
        )}
      </div>

      {/* ── Controls bar ────────────────────────────────────────────── */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-3
                      bg-black/50 backdrop-blur-md px-4 py-2 rounded-full">
        {/* Mic toggle */}
        <button
          onClick={toggleAudio}
          title={isAudioMuted ? 'Unmute' : 'Mute'}
          className={`w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold
                      transition-all ${
                        isAudioMuted
                          ? 'bg-danger text-white'
                          : 'bg-white/20 text-white hover:bg-white/30'
                      }`}
        >
          {isAudioMuted ? '🔇' : '🎙️'}
        </button>

        {/* Camera toggle */}
        <button
          onClick={toggleVideo}
          title={isVideoOff ? 'Turn camera on' : 'Turn camera off'}
          className={`w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold
                      transition-all ${
                        isVideoOff
                          ? 'bg-danger text-white'
                          : 'bg-white/20 text-white hover:bg-white/30'
                      }`}
        >
          {isVideoOff ? '📷' : '🎥'}
        </button>

        {/* Hang up */}
        <button
          onClick={onHangUp}
          title="End call"
          className="w-12 h-12 rounded-full bg-danger text-white flex items-center
                     justify-center text-xl hover:opacity-90 transition-opacity shadow-lg"
        >
          📵
        </button>
      </div>
    </div>
  );
};

export default VideoCall;
