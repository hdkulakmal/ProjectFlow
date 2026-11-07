import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import StudentLayout from '../components/StudentLayout';
import SupervisorLayout from '../components/SupervisorLayout';
import api from '../services/api';
import { getSocket } from '../services/socket';
import {
  MessageSquare,
  Users,
  Send,
  Loader2,
  Hash,
  ShieldCheck,
  GraduationCap,
  Sparkles,
  Info
} from 'lucide-react';

export default function Communication() {
  const { user, token } = useAuth();
  const [channels, setChannels] = useState([]);
  const [activeChannel, setActiveChannel] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [participants, setParticipants] = useState([]);

  const messagesEndRef = useRef(null);
  const socketRef = useRef(null);

  // Auto scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Initialize Socket.IO connection
  useEffect(() => {
    if (token) {
      try {
        const socket = getSocket(token);
        socketRef.current = socket;

        if (socket) {
          socket.on('message', (newMsg) => {
            setMessages((prev) => {
              const current = Array.isArray(prev) ? prev : [];
              if (current.some((m) => m._id === newMsg._id)) return current;
              return [...current, newMsg];
            });
          });
        }
      } catch (err) {
        console.error('Socket connection error', err);
      }

      return () => {
        if (socketRef.current) {
          socketRef.current.off('message');
        }
      };
    }
  }, [token]);

  // Fetch Channels List
  useEffect(() => {
    const fetchChannels = async () => {
      setLoading(true);
      try {
        const res = await api.get('/channels');
        // Safely extract channels array from { data: [...] } or [...]
        const list = Array.isArray(res.data?.data)
          ? res.data.data
          : Array.isArray(res.data?.channels)
          ? res.data.channels
          : Array.isArray(res.data)
          ? res.data
          : [];

        setChannels(list);
        if (list.length > 0) {
          const first = list.find((c) => c.enabled !== false) || list[0];
          setActiveChannel(first);
        }
      } catch (err) {
        console.error('Failed to load channels', err);
        setChannels([]);
      } finally {
        setLoading(false);
      }
    };

    fetchChannels();
  }, []);

  // When active channel changes, load messages & join room
  useEffect(() => {
    if (!activeChannel?.id) return;

    const channelId = activeChannel.id;

    // Join room via socket
    if (socketRef.current) {
      socketRef.current.emit('join_channel', channelId);
    }

    // Fetch message history from REST API
    const fetchMessages = async () => {
      try {
        const res = await api.get(`/messages/${channelId}`);
        const list = Array.isArray(res.data?.data)
          ? res.data.data
          : Array.isArray(res.data)
          ? res.data
          : [];
        setMessages(list);
      } catch (err) {
        console.error('Failed to load messages', err);
        setMessages([]);
      }
    };

    // Fetch participants
    const fetchParticipants = async () => {
      try {
        const res = await api.get(`/channels/${channelId}/participants`);
        const list = Array.isArray(res.data?.data)
          ? res.data.data
          : Array.isArray(res.data?.participants)
          ? res.data.participants
          : [];
        setParticipants(list);
      } catch {
        setParticipants([]);
      }
    };

    fetchMessages();
    fetchParticipants();

    return () => {
      if (socketRef.current) {
        socketRef.current.emit('leave_channel', channelId);
      }
    };
  }, [activeChannel]);

  // Send message
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!messageText.trim() || !activeChannel || sending) return;

    const text = messageText.trim();
    setMessageText('');
    setSending(true);

    try {
      const res = await api.post('/messages', {
        channel: activeChannel.id,
        message: text,
      });

      const saved = res.data?.data || res.data;
      if (saved) {
        setMessages((prev) => {
          const current = Array.isArray(prev) ? prev : [];
          if (current.some((m) => m._id === saved._id)) return current;
          return [...current, saved];
        });
      }
    } catch (err) {
      console.error('Failed to send message', err);
    } finally {
      setSending(false);
    }
  };

  const Layout = user?.role === 'Supervisor' ? SupervisorLayout : StudentLayout;
  const channelList = Array.isArray(channels) ? channels : [];
  const messageList = Array.isArray(messages) ? messages : [];
  const participantList = Array.isArray(participants) ? participants : [];

  if (loading) {
    return (
      <Layout>
        <div className="flex h-96 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="bg-white border border-outline-variant rounded-2xl shadow-xs overflow-hidden flex h-[calc(100vh-140px)] max-w-7xl mx-auto">

        {/* 1. Left Sidebar: Channels List */}
        <aside className="w-72 border-r border-outline-variant bg-surface flex flex-col shrink-0">
          <div className="p-4 border-b border-outline-variant/60 flex items-center justify-between">
            <h2 className="font-bold text-primary text-base">Communication</h2>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-surface-container text-primary">
              {channelList.length} Channels
            </span>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-1">
            <p className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant px-3 py-2">
              Project Channels
            </p>

            {channelList.length > 0 ? (
              channelList.map((ch) => {
                const isSelected = activeChannel?.id === ch.id;
                const isLocked = ch.enabled === false;

                return (
                  <button
                    key={ch.id}
                    disabled={isLocked}
                    onClick={() => setActiveChannel(ch)}
                    className={`w-full text-left p-3 rounded-xl transition-all flex items-center gap-3 ${
                      isSelected
                        ? 'bg-surface-container-low text-primary border-l-4 border-secondary font-bold shadow-xs'
                        : isLocked
                        ? 'opacity-40 cursor-not-allowed text-outline'
                        : 'text-on-surface-variant hover:bg-surface-container hover:text-primary'
                    }`}
                  >
                    <div
                      className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                        isSelected
                          ? 'bg-primary text-white'
                          : 'bg-surface-container-high text-on-surface-variant'
                      }`}
                    >
                      {ch.type === 'supervisor' ? (
                        <ShieldCheck className="h-4 w-4" />
                      ) : ch.type === 'triad' ? (
                        <GraduationCap className="h-4 w-4" />
                      ) : (
                        <Hash className="h-4 w-4" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold truncate">{ch.title}</p>
                      <p className="text-[10px] text-outline truncate">
                        {isLocked ? 'Locked until accepted' : `${ch.type} discussion`}
                      </p>
                    </div>
                  </button>
                );
              })
            ) : (
              <p className="text-xs text-on-surface-variant p-4 text-center">
                No active channels found.
              </p>
            )}
          </div>
        </aside>

        {/* 2. Center: Chat Area */}
        <section className="flex-1 flex flex-col min-w-0 bg-surface-container-lowest">
          
          {/* Channel Header */}
          <div className="h-16 border-b border-outline-variant px-6 flex items-center justify-between bg-white shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-primary-container text-white flex items-center justify-center">
                <Hash className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-bold text-primary text-sm">
                  {activeChannel?.title || 'Project Channel'}
                </h3>
                <p className="text-[11px] text-on-surface-variant">
                  Real-time project discussion channel
                </p>
              </div>
            </div>
          </div>

          {/* Messages Feed */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {messageList.length > 0 ? (
              messageList.map((msg) => {
                const isMe = String(msg.sender?._id || msg.sender?.id || msg.sender) === String(user?.id);
                const senderName =
                  msg.sender?.fullName || msg.sender?.full_name || msg.sender?.username || 'User';
                const initials = senderName.slice(0, 2).toUpperCase();

                return (
                  <div
                    key={msg._id}
                    className={`flex gap-3 max-w-xl ${isMe ? 'ml-auto flex-row-reverse' : ''}`}
                  >
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5 ${
                        isMe
                          ? 'bg-primary-container text-white'
                          : 'bg-surface-container-high text-primary'
                      }`}
                    >
                      {initials}
                    </div>

                    <div className={`space-y-1 ${isMe ? 'items-end' : ''}`}>
                      <div className={`flex items-baseline gap-2 ${isMe ? 'justify-end' : ''}`}>
                        <span className="text-[11px] font-bold text-primary">
                          {isMe ? 'You' : senderName}
                        </span>
                        <span className="text-[10px] text-outline">
                          {new Date(msg.createdAt).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>

                      <div
                        className={`p-3.5 rounded-2xl text-xs leading-relaxed shadow-xs ${
                          isMe
                            ? 'bg-primary text-white rounded-tr-xs'
                            : 'bg-surface text-on-surface border border-outline-variant/60 rounded-tl-xs'
                        }`}
                      >
                        {msg.message}
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center py-12">
                <div className="w-12 h-12 rounded-2xl bg-surface-container flex items-center justify-center text-primary mb-3">
                  <MessageSquare className="h-6 w-6" />
                </div>
                <h4 className="font-bold text-primary text-sm">No messages yet</h4>
                <p className="text-xs text-on-surface-variant mt-1 max-w-xs">
                  Be the first to start the conversation in {activeChannel?.title}!
                </p>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Message Input Bar */}
          <div className="p-4 bg-white border-t border-outline-variant shrink-0">
            <form onSubmit={handleSendMessage} className="flex items-center gap-2">
              <input
                type="text"
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                placeholder={`Message ${activeChannel?.title || 'channel'}...`}
                className="flex-1 px-4 py-2.5 rounded-xl border border-outline-variant bg-surface text-xs focus:outline-none focus:ring-2 focus:ring-primary text-on-surface"
              />

              <button
                type="submit"
                disabled={sending || !messageText.trim()}
                className="px-4 py-2.5 bg-primary text-white text-xs font-bold rounded-xl hover:bg-primary-container transition-all flex items-center gap-1.5 shadow-xs disabled:opacity-50"
              >
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                <span>Send</span>
              </button>
            </form>
          </div>

        </section>

        {/* 3. Right Sidebar: Channel Participants */}
        <aside className="w-64 border-l border-outline-variant bg-surface hidden xl:flex flex-col shrink-0 p-4">
          <div className="flex items-center gap-2 mb-4">
            <Info className="h-4 w-4 text-primary" />
            <h4 className="text-xs font-bold text-primary uppercase tracking-wider">
              Channel Members ({participantList.length})
            </h4>
          </div>

          <div className="space-y-3 overflow-y-auto">
            {participantList.map((p) => {
              const name = p.fullName || p.full_name || p.username || 'Member';
              return (
                <div key={p._id} className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-full bg-primary-container text-white flex items-center justify-center text-[10px] font-bold">
                    {name.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="truncate">
                    <p className="text-xs font-bold text-primary truncate">{name}</p>
                    <p className="text-[10px] text-outline truncate">{p.role || 'Member'}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </aside>

      </div>
    </Layout>
  );
}