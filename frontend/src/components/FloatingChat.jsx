import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useWebSocket } from "../context/WebSocketContext";
import api, { BASE_URL } from "../utils/api";
import { AiOutlineClose, AiOutlineSend } from "react-icons/ai";
import {
  IoChatbubblesOutline, IoExpandOutline, IoPinOutline,
} from "react-icons/io5";
import { FaUsers } from "react-icons/fa";
import { MdSearch } from "react-icons/md";
import styles from "./FloatingChat.module.css";

/* ── Avatar with initials fallback ── */
function AvatarImg({ src, name, className }) {
  const [failed, setFailed] = useState(false);
  const initials = (name || "?")
    .split(" ").filter(Boolean).slice(0, 2)
    .map(w => w[0].toUpperCase()).join("");
  const hue = [...(name || "A")].reduce((a, c) => a + c.charCodeAt(0), 0) % 360;
  if (failed || !src)
    return (
      <div
        className={className}
        style={{
          background: `hsl(${hue},55%,55%)`,
          display: "flex", alignItems: "center", justifyContent: "center",
          color: "#fff", fontWeight: 700, fontSize: "0.75em", userSelect: "none",
        }}
      >
        {initials}
      </div>
    );
  return <img src={src} alt={name} className={className} onError={() => setFailed(true)} />;
}

/* ── Clickable links ── */
function parseLinks(text) {
  if (!text) return text;
  const parts = text.split(/(https?:\/\/[^\s<>"']+)/gi);
  return parts.map((p, i) =>
    /^https?:\/\//i.test(p)
      ? <a key={i} href={p} target="_blank" rel="noopener noreferrer">{p}</a>
      : p
  );
}

function fmtTime(ts) {
  if (!ts) return "";
  return new Date(ts).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
}

export default function FloatingChat() {
  const { user }      = useAuth();
  const { getSocket } = useWebSocket();
  const navigate      = useNavigate();

  const [isOpen, setIsOpen]             = useState(false);
  const [chats, setChats]               = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [messages, setMessages]         = useState([]);
  const [newMessage, setNewMessage]     = useState("");
  const [loading, setLoading]           = useState(false);
  const [unreadMap, setUnreadMap]       = useState({});
  const [typingUsers, setTypingUsers]   = useState([]);
  const [onlineSet, setOnlineSet]       = useState(new Set());
  const [search, setSearch]             = useState("");

  const messagesEndRef = useRef(null);
  const typingTimer    = useRef(null);
  const chatIdRef      = useRef(null);

  const totalUnread = Object.values(unreadMap).reduce((a, b) => a + b, 0);

  /* ── Initial load ── */
  useEffect(() => {
    if (user) loadChats();
  }, [user?.id]);

  const loadChats = async () => {
    try {
      if (user?.group_id) await api.post("/chat/group", { groupId: user.group_id });
      const res = await api.get("/chat/");
      const list = res.data.chats || [];
      setChats(list);
      const grp = list.find(c => c.type === "group");
      if (grp) setSelectedChat(grp);
    } catch (err) {
      console.error("FloatingChat loadChats:", err);
    }
  };

  /* ── Load messages when chat changes ── */
  useEffect(() => {
    if (!selectedChat) return;
    chatIdRef.current = selectedChat.id;
    setMessages([]);
    setTypingUsers([]);
    loadMessages(selectedChat.id);
    const socket = getSocket();
    if (socket) socket.emit("join-chat", selectedChat.id);
    return () => {
      const s = getSocket();
      if (s) s.emit("leave-chat", selectedChat.id);
    };
  }, [selectedChat?.id]);

  const loadMessages = async (cid) => {
    setLoading(true);
    try {
      const res = await api.get(`/chat/${cid}/messages?limit=40`);
      setMessages(res.data.messages || []);
      scrollToBottom();
    } catch (err) {
      console.error("FloatingChat loadMessages:", err);
    } finally {
      setLoading(false);
    }
  };

  /* ── Socket ── */
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const onMessage = (msg) => {
      if (msg.chat_id === chatIdRef.current && isOpen) {
        setMessages(prev => prev.some(m => m.id === msg.id) ? prev : [...prev, msg]);
        scrollToBottom();
      } else {
        setUnreadMap(prev => ({ ...prev, [msg.chat_id]: (prev[msg.chat_id] || 0) + 1 }));
      }
    };
    const onTyping = ({ chatId, userId, username }) => {
      if (chatId !== chatIdRef.current || userId === user?.id) return;
      setTypingUsers(prev => prev.includes(username) ? prev : [...prev, username]);
      setTimeout(() => setTypingUsers(prev => prev.filter(u => u !== username)), 3000);
    };
    const onOnline  = ({ userId }) => setOnlineSet(prev => new Set([...prev, userId]));
    const onOffline = ({ userId }) => setOnlineSet(prev => { const s = new Set(prev); s.delete(userId); return s; });

    socket.on("new-message", onMessage);
    socket.on("user-typing", onTyping);
    socket.on("user-online", onOnline);
    socket.on("user-offline", onOffline);
    return () => {
      socket.off("new-message", onMessage);
      socket.off("user-typing", onTyping);
      socket.off("user-online", onOnline);
      socket.off("user-offline", onOffline);
    };
  }, [getSocket, isOpen, user?.id]);

  /* Clear unread on open */
  useEffect(() => {
    if (isOpen && selectedChat) {
      setUnreadMap(prev => ({ ...prev, [selectedChat.id]: 0 }));
    }
  }, [isOpen, selectedChat?.id]);

  const scrollToBottom = () =>
    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 80);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedChat) return;
    const text = newMessage.trim();
    setNewMessage("");
    try {
      const res = await api.post(`/chat/${selectedChat.id}/messages`, {
        message_type: "text", content: text,
      });
      const msg = {
        ...res.data.message,
        sender_id: user.id,
        sender_full_name: user.full_name,
        sender_username: user.username,
        sender_avatar_url: user.avatar_url,
        content: text,
      };
      setMessages(prev => [...prev, msg]);
      scrollToBottom();
    } catch {
      setNewMessage(text);
    }
  };

  const handleTyping = () => {
    const socket = getSocket();
    if (!socket || !selectedChat) return;
    socket.emit("typing", { chatId: selectedChat.id });
    clearTimeout(typingTimer.current);
  };

  const handleSelectChat = (chat) => {
    setSelectedChat(chat);
    setUnreadMap(prev => ({ ...prev, [chat.id]: 0 }));
  };

  const groupChats   = chats.filter(c => c.type === "group");
  const privateChats = chats
    .filter(c => c.type !== "group")
    .filter(c => {
      const name = c.name || c.other_user?.full_name || "";
      return name.toLowerCase().includes(search.toLowerCase());
    });

  if (!user) return null;

  return (
    <>
      {/* ══ PANEL ══ */}
      <div className={`${styles.panel} ${isOpen ? styles.panelOpen : ""}`}>

        {/* Sidebar */}
        <div className={styles.sidebar}>
          <div className={styles.sidebarSearch}>
            <MdSearch className={styles.searchIco} />
            <input
              className={styles.searchInput}
              placeholder="Поиск..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          <div className={styles.chatList}>
            {/* Group chats – pinned */}
            {groupChats.map(chat => {
              const unread   = unreadMap[chat.id] || 0;
              const isActive = selectedChat?.id === chat.id;
              return (
                <button
                  key={chat.id}
                  className={`${styles.chatItem} ${styles.chatItemPinned} ${isActive ? styles.chatItemActive : ""}`}
                  onClick={() => handleSelectChat(chat)}
                >
                  <div className={styles.chatAvaWrap}>
                    <div className={styles.groupAva}><FaUsers /></div>
                    <IoPinOutline className={styles.pinBadge} />
                  </div>
                  <div className={styles.chatItemInfo}>
                    <span className={styles.chatItemName}>{chat.name || "Группа"}</span>
                    <span className={styles.chatItemSub}>{chat.last_message?.content || "Нет сообщений"}</span>
                  </div>
                  {unread > 0 && <span className={styles.unreadBadge}>{unread > 99 ? "99+" : unread}</span>}
                </button>
              );
            })}

            {/* Divider */}
            {groupChats.length > 0 && privateChats.length > 0 && (
              <div className={styles.divider}>Личные</div>
            )}

            {/* Private chats */}
            {privateChats.map(chat => {
              const name      = chat.name || chat.other_user?.full_name || chat.other_user?.username || "Пользователь";
              const avatarSrc = chat.other_user?.avatar_url ? `${BASE_URL}${chat.other_user.avatar_url}` : null;
              const unread    = unreadMap[chat.id] || 0;
              const isActive  = selectedChat?.id === chat.id;
              const isOnline  = chat.other_user_id && onlineSet.has(Number(chat.other_user_id));
              return (
                <button
                  key={chat.id}
                  className={`${styles.chatItem} ${isActive ? styles.chatItemActive : ""}`}
                  onClick={() => handleSelectChat(chat)}
                >
                  <div className={styles.chatAvaWrap}>
                    <AvatarImg src={avatarSrc} name={name} className={styles.chatAvaImg} />
                    {isOnline && <span className={styles.onlineDot} />}
                  </div>
                  <div className={styles.chatItemInfo}>
                    <span className={styles.chatItemName}>{name}</span>
                    <span className={styles.chatItemSub}>{chat.last_message?.content || "Нет сообщений"}</span>
                  </div>
                  {unread > 0 && <span className={styles.unreadBadge}>{unread > 99 ? "99+" : unread}</span>}
                </button>
              );
            })}

            {chats.length === 0 && (
              <div className={styles.emptyList}>Нет чатов</div>
            )}
          </div>
        </div>

        {/* Main area */}
        <div className={styles.main}>
          {/* Header */}
          <div className={styles.header}>
            <div className={styles.headerLeft}>
              {selectedChat?.type === "group" ? (
                <div className={styles.headerAva}><FaUsers /></div>
              ) : (
                <AvatarImg
                  src={selectedChat?.other_user?.avatar_url ? `${BASE_URL}${selectedChat.other_user.avatar_url}` : null}
                  name={selectedChat?.name || selectedChat?.other_user?.full_name}
                  className={styles.headerAva}
                />
              )}
              <div>
                <div className={styles.headerName}>
                  {selectedChat?.name || selectedChat?.other_user?.full_name || "Чат"}
                </div>
                {typingUsers.length > 0 && (
                  <div className={styles.typingLabel}>{typingUsers[0]} печатает...</div>
                )}
              </div>
            </div>
            <div className={styles.headerActions}>
              <button className={styles.headerBtn} onClick={() => navigate("/student/chat")} title="Открыть полный чат">
                <IoExpandOutline />
              </button>
              <button className={styles.headerBtn} onClick={() => setIsOpen(false)}>
                <AiOutlineClose />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className={styles.msgArea}>
            {loading ? (
              <div className={styles.center}><div className={styles.spinner} /></div>
            ) : messages.length === 0 ? (
              <div className={styles.center}>
                <IoChatbubblesOutline style={{ fontSize: "2.4rem", opacity: 0.2 }} />
                <span>Нет сообщений</span>
              </div>
            ) : (
              <>
                {messages.map(msg => {
                  const isOwn     = msg.sender_id === user.id || msg.user_id === user.id;
                  const name      = msg.sender_full_name || msg.full_name || msg.sender_username || msg.username || "";
                  const rawAva    = msg.sender_avatar_url || msg.avatar_url;
                  const avatarSrc = rawAva ? `${BASE_URL}${rawAva}` : null;
                  const text      = msg.content || msg.message || "";
                  return (
                    <div key={msg.id} className={`${styles.msg} ${isOwn ? styles.msgOwn : ""}`}>
                      {!isOwn && <AvatarImg src={avatarSrc} name={name} className={styles.msgAva} />}
                      <div className={styles.msgBody}>
                        {!isOwn && <div className={styles.msgName}>{name}</div>}
                        <div className={styles.msgBubble}>
                          <span className={styles.msgText}>{parseLinks(text)}</span>
                          <span className={styles.msgTime}>{fmtTime(msg.created_at)}</span>
                        </div>
                      </div>
                      {isOwn && <AvatarImg src={avatarSrc} name={name} className={styles.msgAva} />}
                    </div>
                  );
                })}

                {typingUsers.length > 0 && (
                  <div className={styles.typingWrap}>
                    <div className={styles.typingDots}>
                      <span /><span /><span />
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </>
            )}
          </div>

          {/* Input */}
          <form className={styles.inputRow} onSubmit={handleSend}>
            <input
              type="text"
              className={styles.inputField}
              placeholder="Сообщение..."
              value={newMessage}
              maxLength={500}
              onChange={e => { setNewMessage(e.target.value); handleTyping(); }}
            />
            <button type="submit" className={styles.sendBtn} disabled={!newMessage.trim()}>
              <AiOutlineSend />
            </button>
          </form>
        </div>
      </div>

      {/* ══ FAB ══ */}
      <button
        className={`${styles.fab} ${isOpen ? styles.fabOpen : ""}`}
        onClick={() => setIsOpen(o => !o)}
        title="Чат"
      >
        {isOpen ? <AiOutlineClose /> : <IoChatbubblesOutline />}
        {!isOpen && totalUnread > 0 && (
          <span className={styles.fabBadge}>{totalUnread > 99 ? "99+" : totalUnread}</span>
        )}
      </button>
    </>
  );
}
