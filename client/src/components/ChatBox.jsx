import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MessageSquare, Send, ShieldAlert, Radio, Check, CheckCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

/**
 * ChatBox — Ephemeral in-call chat via Socket.io with typing indicator and read receipts.
 */
const ChatBox = ({ socket, callId, messages, onSendMessage }) => {
  const { user } = useAuth();
  const [text, setText] = useState('');
  const [peerTyping, setPeerTyping] = useState({ isTyping: false, senderName: '' });
  const [readTimestamps, setReadTimestamps] = useState(new Set());
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, peerTyping.isTyping]);

  // Notify peer when an incoming message is viewed (read receipt)
  useEffect(() => {
    if (!socket || !messages.length) return;
    const lastMsg = messages[messages.length - 1];
    if (lastMsg && lastMsg.senderId !== user._id) {
      socket.emit('chat:read', { callId, messageTimestamp: lastMsg.timestamp });
    }
  }, [socket, callId, messages, user._id]);

  // Listen for socket events: typing & read receipts
  useEffect(() => {
    if (!socket) return;

    const onTyping = ({ senderName }) => {
      setPeerTyping({ isTyping: true, senderName: senderName || 'Peer' });
    };

    const onStopTyping = () => {
      setPeerTyping({ isTyping: false, senderName: '' });
    };

    const onRead = ({ messageTimestamp }) => {
      if (messageTimestamp) {
        setReadTimestamps((prev) => new Set([...prev, messageTimestamp]));
      }
    };

    socket.on('chat:typing', onTyping);
    socket.on('chat:stop-typing', onStopTyping);
    socket.on('chat:read', onRead);

    return () => {
      socket.off('chat:typing', onTyping);
      socket.off('chat:stop-typing', onStopTyping);
      socket.off('chat:read', onRead);
    };
  }, [socket]);

  const handleInputChange = (e) => {
    const val = e.target.value;
    setText(val);

    if (!socket) return;

    // Emit typing event
    socket.emit('chat:typing', { callId, senderName: user.name });

    // Debounce stop typing
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit('chat:stop-typing', { callId });
    }, 1400);
  };

  const handleSend = (e) => {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed || !socket) return;

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    socket.emit('chat:stop-typing', { callId });

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
            const isRead = readTimestamps.has(msg.timestamp);

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
                <div className="flex items-center gap-1 font-mono text-[10px] text-text-muted dark:text-text-muted-dark mt-1 px-1">
                  <span>{formatTime(msg.timestamp)}</span>
                  {isOwn && (
                    <span className="inline-flex items-center" title={isRead ? 'Read by peer' : 'Delivered'}>
                      {isRead ? (
                        <CheckCheck className="w-3 h-3 text-accent" />
                      ) : (
                        <Check className="w-3 h-3 text-text-muted/60" />
                      )}
                    </span>
                  )}
                </div>
              </motion.div>
            );
          })
        )}

        {/* Typing Indicator */}
        <AnimatePresence>
          {peerTyping.isTyping && (
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 4 }}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-surface-2/60 dark:bg-surface-2-dark/60 border border-border/40 w-fit text-text-muted dark:text-text-muted-dark text-[11px] font-mono"
            >
              <div className="flex gap-1 items-center">
                <span className="w-1.5 h-1.5 rounded-full bg-accent animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1.5 h-1.5 rounded-full bg-accent animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1.5 h-1.5 rounded-full bg-accent animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
              <span>{peerTyping.senderName} is transmitting…</span>
            </motion.div>
          )}
        </AnimatePresence>

        <div ref={messagesEndRef} />
      </div>

      {/* Input Form */}
      <form onSubmit={handleSend} className="p-3 border-t border-border dark:border-border-dark bg-surface-2/30 dark:bg-surface-2-dark/30 flex gap-2">
        <input
          type="text"
          value={text}
          onChange={handleInputChange}
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
