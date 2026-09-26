import { useState, useRef, useEffect } from 'react';
import { motion } from 'motion/react';
import { MessageSquare, Send, ShieldAlert, Radio } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

/**
 * ChatBox — Ephemeral in-call chat via Socket.io.
 * Messages exist strictly for active call lifecycle with zero DB persistence.
 */
const ChatBox = ({ socket, callId, messages, onSendMessage }) => {
  const { user } = useAuth();
  const [text, setText] = useState('');
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = (e) => {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed || !socket) return;

    const payload = {
      callId,
      senderId: user._id,
      senderName: user.name,
      text: trimmed,
      timestamp: new Date().toISOString(),
    };

    socket.emit('chat:message', payload);
    onSendMessage(payload);
    setText('');
  };

  const formatTime = (isoString) => {
    return new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="flex flex-col h-full bg-surface dark:bg-surface-dark border border-border dark:border-border-dark rounded-3xl overflow-hidden shadow-tactile-sm">
      {/* Header */}
      <div className="px-5 py-4 border-b border-border dark:border-border-dark flex items-center justify-between bg-surface-2/40 dark:bg-surface-2-dark/40">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-accent-tint dark:bg-accent-tint-dark text-accent dark:text-accent-dark flex items-center justify-center">
            <MessageSquare className="w-3.5 h-3.5" />
          </div>
          <div>
            <h3 className="font-display font-bold text-xs text-text dark:text-text-dark uppercase tracking-wider">
              IN-CALL TELEMETRY
            </h3>
          </div>
        </div>
        <div className="flex items-center gap-1 text-[10px] font-mono text-text-muted dark:text-text-muted-dark bg-surface-2 dark:bg-surface-2-dark px-2 py-0.5 rounded-md border border-border/60 dark:border-border-dark/60">
          <ShieldAlert className="w-3 h-3 text-secondary dark:text-secondary-dark" />
          <span>EPHEMERAL</span>
        </div>
      </div>

      {/* Messages Feed */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0 scrollbar-thin">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-4 space-y-2 opacity-70">
            <Radio className="w-6 h-6 text-text-muted dark:text-text-muted-dark animate-pulse" />
            <p className="font-display font-medium text-xs text-text dark:text-text-dark">
              Encrypted Channel Open
            </p>
            <p className="text-[11px] text-text-muted dark:text-text-muted-dark max-w-xs font-mono">
              Send messages during this transmission. Transmissions vanish once the call terminates.
            </p>
          </div>
        ) : (
          messages.map((msg, idx) => {
            const isOwn = msg.senderId === user._id;
            return (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.18 }}
                className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-[85%] px-3.5 py-2.5 rounded-2xl text-xs leading-relaxed shadow-tactile-sm ${
                    isOwn
                      ? 'bg-primary dark:bg-primary-dark text-on-primary dark:text-on-primary-dark rounded-br-none'
                      : 'bg-surface-2 dark:bg-surface-2-dark border border-border/80 dark:border-border-dark/80 text-text dark:text-text-dark rounded-bl-none'
                  }`}
                >
                  {!isOwn && (
                    <p className="font-mono font-bold text-[10px] text-accent dark:text-accent-dark mb-1 uppercase tracking-wider">
                      {msg.senderName}
                    </p>
                  )}
                  <p className="break-words">{msg.text}</p>
                </div>
                <span className="font-mono text-[10px] text-text-muted dark:text-text-muted-dark mt-1 px-1">
                  {formatTime(msg.timestamp)}
                </span>
              </motion.div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Form */}
      <form onSubmit={handleSend} className="p-3 border-t border-border dark:border-border-dark bg-surface-2/30 dark:bg-surface-2-dark/30 flex gap-2">
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Transmit message to peer…"
          className="flex-1 bg-surface dark:bg-surface-dark border border-border dark:border-border-dark rounded-xl px-3.5 py-2.5 text-xs text-text dark:text-text-dark placeholder:text-text-muted/60 dark:placeholder:text-text-muted-dark/60 outline-none focus:ring-1 focus:ring-focus-ring shadow-tactile-sm"
        />
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          type="submit"
          disabled={!text.trim()}
          className="w-10 h-10 rounded-xl bg-primary hover:bg-primary-hover dark:bg-primary-dark dark:hover:bg-primary-hover-dark text-on-primary dark:text-on-primary-dark flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed shadow-tactile-sm transition-colors"
        >
          <Send className="w-4 h-4" />
        </motion.button>
      </form>
    </div>
  );
};

export default ChatBox;
