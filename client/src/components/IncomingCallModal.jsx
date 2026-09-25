/**
 * IncomingCallModal
 * Displays when the user receives a call:incoming socket event.
 * Accepts or Rejects — no auto-timeout per the implementation plan.
 */
const IncomingCallModal = ({ callId, caller, onAccept, onReject }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4
                    bg-overlay backdrop-blur-sm">
      <div className="relative w-full max-w-sm bg-surface border border-border
                      rounded-2xl shadow-sonar-light p-8 text-center animate-bounce-in">
        {/* Avatar ring */}
        <div className="mx-auto mb-4 w-20 h-20 rounded-full bg-primary-tint
                        flex items-center justify-center text-4xl">
          📞
        </div>

        <p className="text-text-muted text-sm mb-1">Incoming call from</p>
        <h2 className="text-2xl font-bold text-text mb-6">{caller?.name}</h2>

        <div className="flex gap-3 justify-center">
          {/* Reject */}
          <button
            onClick={onReject}
            className="flex-1 py-3 rounded-xl font-semibold text-sm
                       bg-danger text-on-primary hover:opacity-90 transition-opacity"
          >
            ✕ Decline
          </button>
          {/* Accept */}
          <button
            onClick={onAccept}
            className="flex-1 py-3 rounded-xl font-semibold text-sm
                       bg-success text-on-primary hover:opacity-90 transition-opacity"
          >
            ✓ Accept
          </button>
        </div>
      </div>
    </div>
  );
};

export default IncomingCallModal;
