import { motion } from 'motion/react';
import { Phone, PhoneOff, Radio, Volume2 } from 'lucide-react';

/**
 * IncomingCallModal
 * Acoustic Intercom Modal triggered by socket 'call:incoming'.
 */
const IncomingCallModal = ({ callId, caller, onAccept, onReject }) => {
  const callerInitial = caller?.name ? caller.name.charAt(0).toUpperCase() : '?';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-overlay/80 dark:bg-overlay-dark/90 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.92, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94, y: 12 }}
        transition={{ duration: 0.22, ease: 'easeOut' }}
        className="relative w-full max-w-sm rounded-3xl bg-surface dark:bg-surface-dark border border-border dark:border-border-dark shadow-tactile-lg p-7 text-center overflow-hidden bg-noise"
      >
        {/* Acoustic frequency indicator top badge */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary-tint dark:bg-primary-tint-dark text-primary dark:text-primary-dark font-mono text-[11px] font-semibold mb-6 border border-primary/20">
          <Radio className="w-3.5 h-3.5 animate-pulse" />
          <span>INCOMING SIGNAL // {callId?.slice(-4) || 'LIVE'}</span>
        </div>

        {/* Concentric Pulsing Radar Rings */}
        <div className="relative mx-auto mb-6 w-24 h-24 flex items-center justify-center">
          <div className="absolute inset-0 rounded-full bg-primary/20 dark:bg-primary-dark/20 animate-pulse-ring" />
          <div className="absolute inset-2 rounded-full bg-accent/20 dark:bg-accent-dark/20 animate-ping opacity-30" />
          <div className="relative w-20 h-20 rounded-2xl bg-primary text-on-primary flex items-center justify-center font-display font-bold text-3xl shadow-tactile-md">
            {callerInitial}
          </div>
        </div>

        {/* Caller Info */}
        <div className="space-y-1 mb-8">
          <p className="text-[11px] font-mono uppercase tracking-widest text-text-muted dark:text-text-muted-dark">
            TRANSMISSION DETECTED FROM
          </p>
          <h2 className="font-display font-bold text-2xl text-text dark:text-text-dark tracking-tight">
            {caller?.name || 'Remote Station'}
          </h2>
          <div className="flex items-center justify-center gap-2 text-xs text-text-2 dark:text-text-2-dark pt-1">
            <Volume2 className="w-3.5 h-3.5 text-accent animate-bounce" />
            <span className="font-mono text-[11px]">Ringing Carrier Channel</span>
          </div>
        </div>

        {/* Controls */}
        <div className="grid grid-cols-2 gap-3">
          {/* Decline */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.96 }}
            onClick={onReject}
            className="py-3.5 px-4 rounded-xl font-display font-semibold text-xs flex items-center justify-center gap-2 bg-danger-tint dark:bg-danger-tint-dark text-danger dark:text-danger-dark border border-danger/40 hover:bg-danger hover:text-on-primary transition-all duration-150"
          >
            <PhoneOff className="w-4 h-4" />
            <span>Decline</span>
          </motion.button>

          {/* Accept */}
          <motion.button
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            onClick={onAccept}
            className="py-3.5 px-4 rounded-xl font-display font-semibold text-xs flex items-center justify-center gap-2 bg-success text-on-primary hover:bg-success/90 dark:bg-success-dark dark:text-on-primary-dark shadow-tactile-md transition-all duration-150"
          >
            <Phone className="w-4 h-4 animate-pulse" />
            <span>Connect</span>
          </motion.button>
        </div>
      </motion.div>
    </div>
  );
};

export default IncomingCallModal;
