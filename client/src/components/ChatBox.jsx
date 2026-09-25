import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

/**
 * ChatBox — ephemeral in-call chat via Socket.io.
 * Messages are NOT persisted to MongoDB; they exist only for the call duration.
 *
 * Props: socket, callId, messages, onSendMessage
 */
const ChatBox = ({ socket, callId, messages, onSendMessage }) => {
  const { user } = useAuth();
  const [text, setText] = useState('');
  const messagesEndRef = useRef(null);

  // Auto-scroll to newest message
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

    // Emit to server — server forwards to other peer
    socket.emit('chat:message', payload);
    // Show our own message locally immediately
    onSendMessage(payload);
    setText('');
  };

  const formatTime = (isoString) => {
    return new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="flex flex-col h-full bg-surface border border-border rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border flex items-center gap-2">
        <span className="text-lg">💬</span>
        <span className="font-semibold text-text text-sm">In-Call Chat</span>
        <span className="ml-auto text-xs text-text-muted italic">ephemeral</span>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2 min-h-0">
        {messages.length === 0 && (
          <p className="text-center text-text-muted text-sm mt-8">
            Say hello! 👋
          </p>
        )}
        {messages.map((msg, idx) => {
          const isOwn = msg.senderId === user._id;
          return (
            <div key={idx} className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'}`}>
              <div
                className={`max-w-[85%] px-3 py-2 rounded-xl text-sm leading-relaxed
                  ${isOwn
                    ? 'bg-primary text-on-primary rounded-br-sm'
                    : 'bg-surface-2 text-text rounded-bl-sm'
                  }`}
              >
                {!isOwn && (
                  <p className="font-semibold text-xs text-text-muted mb-0.5">{msg.senderName}</p>
                )}
                <p>{msg.text}</p>
              </div>
              <span className="text-xs text-text-muted mt-0.5 px-1">{formatTime(msg.timestamp)}</span>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSend} className="px-3 py-3 border-t border-border flex gap-2">
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Type a message…"
          className="flex-1 bg-bg border border-border rounded-lg px-3 py-2 text-sm
                     text-text placeholder-text-muted outline-none
                     focus:ring-2 focus:ring-focus-ring transition-all"
        />
        <button
          type="submit"
          disabled={!text.trim()}
          className="px-3 py-2 rounded-lg bg-primary text-on-primary font-semibold text-sm
                     hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          ↑
        </button>
      </form>
    </div>
  );
};

export default ChatBox;
