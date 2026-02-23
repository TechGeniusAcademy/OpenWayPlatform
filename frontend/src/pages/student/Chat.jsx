import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "../../context/AuthContext";
import { useNotifications } from "../../context/NotificationContext";
import { useWebSocket } from "../../context/WebSocketContext";
import api, { BASE_URL } from "../../utils/api";
import styles from "./Chat.module.css";
import {
  IoChatbubblesOutline,
  IoPeopleOutline,
  IoDownloadOutline,
  IoArrowBack,
  IoSendSharp,
  IoAttachOutline,
  IoSearchOutline,
  IoPinOutline,
} from "react-icons/io5";
import { BsFileEarmarkText } from "react-icons/bs";
import { MdOutlineForum } from "react-icons/md";

/* ── Fallback avatar: shows initials when image fails to load ── */
function AvatarImg({ src, name, className }) {
  const [failed, setFailed] = useState(false);
  const initials = (name || "?")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map(w => w[0].toUpperCase())
    .join("");
  // pick a deterministic hue from the name
  const hue = [...(name || "A")].reduce((acc, c) => acc + c.charCodeAt(0), 0) % 360;
  const bg  = `hsl(${hue},55%,55%)`;

  if (failed || !src) {
    return (
      <div
        className={className}
        style={{ background: bg, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700, fontSize: "0.75em", userSelect: "none", flexShrink: 0 }}
      >
        {initials}
      </div>
    );
  }
  return (
    <img
      src={src}
      alt={name}
      className={className}
      onError={() => setFailed(true)}
    />
  );
}

/* ── Render text with clickable links ── */
const URL_REGEX = /(https?:\/\/[^\s<>"']+)/gi;
function parseLinks(text) {
  if (!text) return null;
  const parts = text.split(URL_REGEX);
  return parts.map((part, i) =>
    URL_REGEX.test(part)
      ? <a key={i} href={part} target="_blank" rel="noopener noreferrer">{part}</a>
      : part
  );
}

function Chat() {
  const { user }               = useAuth();
  const { loadUnreadCount }    = useNotifications();
  const { getSocket }          = useWebSocket();

  const [chats, setChats]               = useState([]);
  const [users, setUsers]               = useState([]);
  const [activeChat, setActiveChat]     = useState(null);
  const [messages, setMessages]         = useState([]);
  const [loading, setLoading]           = useState(true);
  const [onlineUsers, setOnlineUsers]   = useState(new Set());
  const [typingUsers, setTypingUsers]   = useState({});
  const [searchQuery, setSearchQuery]   = useState("");
  const [activeTab, setActiveTab]       = useState("chats");
  const [showMobileChat, setShowMobileChat] = useState(false);
  const [uploading, setUploading]       = useState(false);
  const [inputText, setInputText]       = useState("");

  const messagesEndRef  = useRef(null);
  const typingTimeout   = useRef(null);
  const activeChatRef   = useRef(null);
  const socketRef       = useRef(null);
  const processedIds    = useRef(new Set());
  const fileInputRef    = useRef(null);
  const textareaRef     = useRef(null);

  const onNewMessage = useCallback((message) => {
    if (processedIds.current.has(message.id)) return;
    processedIds.current.add(message.id);
    if (activeChatRef.current?.id === message.chat_id) {
      setMessages(prev => {
        if (prev.some(m => m.id === message.id)) return prev;
        return [...prev, transformMessage(message)];
      });
      markAsRead(message.chat_id);
    }
    loadChats();
  }, []);

  const onChatNotification = useCallback(() => { loadChats(); }, []);

  const onUserOnline = useCallback((data) => {
    setOnlineUsers(prev => new Set([...prev, data.userId]));
    setUsers(prev => prev.map(u => u.id === data.userId ? { ...u, isOnline: true } : u));
    setChats(prev => prev.map(c => ({
      ...c,
      isOnline: c.chat_type === "private" && c.otherUserId === data.userId ? true : c.isOnline,
    })));
  }, []);

  const onUserOffline = useCallback((data) => {
    setOnlineUsers(prev => { const s = new Set(prev); s.delete(data.userId); return s; });
    setUsers(prev => prev.map(u => u.id === data.userId ? { ...u, isOnline: false } : u));
    setChats(prev => prev.map(c => ({
      ...c,
      isOnline: c.chat_type === "private" && c.otherUserId === data.userId ? false : c.isOnline,
    })));
  }, []);

  const onTypingStart = useCallback((data) => {
    setTypingUsers(prev => ({ ...prev, [data.userId]: data.userName }));
  }, []);

  const onTypingStop = useCallback((data) => {
    setTypingUsers(prev => { const n = { ...prev }; delete n[data.userId]; return n; });
  }, []);

  useEffect(() => {
    const init = async () => {
      // Auto-join the user's group chat so it always appears at the top
      if (user?.group_id) {
        try { await api.post("/chat/group", { groupId: user.group_id }); } catch {}
      }
      await Promise.all([loadChats(), loadUsers()]);
      setLoading(false);
    };
    init();
  }, []);

  useEffect(() => {
    let retry = null;
    let mounted = true;
    const setup = () => {
      const socket = getSocket();
      if (!socket) return false;
      socketRef.current = socket;
      socket.on("new-message", onNewMessage);
      socket.on("chat-message-notification", onChatNotification);
      socket.on("user-online", onUserOnline);
      socket.on("user-offline", onUserOffline);
      socket.on("typing-start", onTypingStart);
      socket.on("typing-stop", onTypingStop);
      if (socket.connected && activeChatRef.current)
        socket.emit("join-chat", activeChatRef.current.id);
      return true;
    };
    if (!setup()) retry = setInterval(() => { if (mounted && setup()) clearInterval(retry); }, 500);
    return () => {
      mounted = false;
      if (retry) clearInterval(retry);
      const s = socketRef.current;
      if (s) {
        s.off("new-message", onNewMessage);
        s.off("chat-message-notification", onChatNotification);
        s.off("user-online", onUserOnline);
        s.off("user-offline", onUserOffline);
        s.off("typing-start", onTypingStart);
        s.off("typing-stop", onTypingStop);
      }
    };
  }, []);

  useEffect(() => {
    if (!activeChat) return;
    if (activeChatRef.current && socketRef.current)
      socketRef.current.emit("leave-chat", activeChatRef.current.id);
    activeChatRef.current = activeChat;
    if (socketRef.current?.connected) {
      socketRef.current.emit("join-chat", activeChat.id);
    } else {
      setTimeout(() => {
        if (socketRef.current?.connected && activeChatRef.current?.id === activeChat.id)
          socketRef.current.emit("join-chat", activeChat.id);
      }, 1000);
    }
    processedIds.current.clear();
    loadMessages(activeChat.id);
    markAsRead(activeChat.id);
  }, [activeChat]);

  useEffect(() => {
    if (messages.length)
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 80);
  }, [messages]);

  const loadChats = async () => {
    try {
      const res = await api.get("/chat");
      setChats(res.data.chats.map(chat => {
        const isGroup = chat.type === "group";
        const other   = chat.other_user;
        const lastMsg = chat.last_message;
        return {
          ...chat,
          chat_type: chat.type,
          name: isGroup ? chat.name : (other?.full_name || "Пользователь"),
          lastMessage: lastMsg?.content || "Нет сообщений",
          lastMessageTime: lastMsg?.created_at ? formatTime(lastMsg.created_at) : "",
          unreadCount: chat.unread_count || 0,
          avatarSrc: isGroup
            ? `${BASE_URL}/uploads/groups/${chat.group_id}.jpg`
            : `${BASE_URL}${other?.avatar_url || "/uploads/avatars/default-avatar.png"}`,
          isOnline: !isGroup && other && onlineUsers.has(other.id),
          otherUserId: other?.id,
        };
      }));
    } catch (err) { console.error("loadChats:", err); }
  };

  const loadUsers = async () => {
    try {
      const [usersRes, onlineRes] = await Promise.all([
        api.get("/users"),
        api.get("/users/online"),
      ]);
      const onlineIds = new Set(onlineRes.data.users.map(u => u.id));
      setUsers(
        usersRes.data.users
          .filter(u => u.id !== user.id)
          .map(u => ({
            id: u.id,
            name: u.full_name,
            username: u.username,
            role: u.role,
            avatarSrc: `${BASE_URL}${u.avatar_url || "/uploads/avatars/default-avatar.png"}`,
            isOnline: onlineIds.has(u.id),
            lastSeen: u.last_seen,
          }))
      );
    } catch (err) { console.error("loadUsers:", err); }
  };

  const loadMessages = async (chatId) => {
    try {
      const res = await api.get(`/chat/${chatId}/messages`);
      const arr = res.data.messages || res.data || [];
      setMessages(arr.map(transformMessage));
    } catch (err) { console.error("loadMessages:", err); }
  };

  const transformMessage = (msg) => ({
    id: msg.id,
    message: msg.content,
    sentTime: msg.created_at,
    sender: msg.sender_name,
    senderId: msg.sender_id,
    isOwn: msg.sender_id === user.id,
    messageType: msg.message_type || "text",
    codeLanguage: msg.code_language,
    fileName: msg.file_name,
    filePath: msg.file_path,
    fileSize: msg.file_size,
    isEdited: msg.is_edited,
    avatarSrc: `${BASE_URL}${msg.avatar_url || "/uploads/avatars/default-avatar.png"}`,
  });

  const handleSend = async () => {
    const text = inputText.trim();
    if (!activeChat || !text) return;
    setInputText("");
    try {
      const res = await api.post(`/chat/${activeChat.id}/messages`, {
        content: text,
        messageType: "text",
      });
      if (res.data?.message) {
        setMessages(prev => {
          if (prev.some(m => m.id === res.data.message.id)) return prev;
          return [...prev, transformMessage(res.data.message)];
        });
      }
      loadUnreadCount();
    } catch (err) { console.error("sendMessage:", err); }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const handleTyping = () => {
    if (!socketRef.current || !activeChat) return;
    socketRef.current.emit("typing-start", { chatId: activeChat.id, userName: user.full_name });
    clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => {
      socketRef.current?.emit("typing-stop", { chatId: activeChat.id });
    }, 1000);
  };

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !activeChat) return;
    e.target.value = "";
    if (file.size > 100 * 1024 * 1024) { alert("Файл слишком большой. Максимум 100MB"); return; }
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("messageType", file.type.startsWith("image/") ? "image" : "file");
      const res = await api.post(`/chat/${activeChat.id}/messages`, form, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      if (res.data?.message) {
        setMessages(prev => {
          if (prev.some(m => m.id === res.data.message.id)) return prev;
          return [...prev, transformMessage(res.data.message)];
        });
      }
      loadUnreadCount();
    } catch (err) { console.error("fileUpload:", err); alert("Не удалось загрузить файл"); }
    finally { setUploading(false); }
  };

  const markAsRead = async (chatId) => {
    try {
      await api.put(`/chat/${chatId}/mark-read`);
      loadUnreadCount();
      setChats(prev => prev.map(c => c.id === chatId ? { ...c, unreadCount: 0 } : c));
    } catch {}
  };

  const formatTime = (ts) => {
    if (!ts) return "";
    const d = new Date(ts);
    if (isNaN(d)) return "";
    const now = new Date();
    const diff = now - d;
    if (diff < 60000) return "только что";
    if (diff < 3600000) return `${Math.floor(diff / 60000)} мин.`;
    if (d.toDateString() === now.toDateString())
      return d.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
    if (diff < 86400000 * 7)
      return d.toLocaleDateString("ru-RU", { weekday: "short", hour: "2-digit", minute: "2-digit" });
    return d.toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
  };

  const formatMsgTime = (ts) => {
    if (!ts) return "";
    const d = new Date(ts);
    if (isNaN(d)) return "";
    return d.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
  };

  const formatSepDate = (ts) => {
    const d = new Date(ts);
    const now = new Date();
    if (d.toDateString() === now.toDateString()) return "Сегодня";
    return d.toLocaleDateString("ru-RU", {
      day: "numeric", month: "long",
      year: d.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
    });
  };

  const handleSelectChat = (chat) => { setActiveChat(chat); setShowMobileChat(true); };

  const handleUserClick = async (u) => {
    try {
      const res = await api.post("/chat/private", { userId: u.id });
      await loadChats();
      const nc = res.data.chat;
      setActiveChat({
        id: nc.id, chat_type: "private", type: "private",
        name: u.name, avatarSrc: u.avatarSrc,
        isOnline: u.isOnline, otherUserId: u.id,
      });
      setShowMobileChat(true);
      setActiveTab("chats");
    } catch (err) { console.error("createChat:", err); }
  };

  const filteredChats = chats.filter(c =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const groupChats   = filteredChats.filter(c => c.chat_type === "group");
  const privateChats = filteredChats.filter(c => c.chat_type !== "group");
  const filteredUsers = users.filter(u =>
    u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const typingNames = Object.values(typingUsers);

  if (loading) {
    return (
      <div className={styles.loadingWrap}>
        <div className={styles.spinner} />
        <span>Загрузка чатов...</span>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div className={styles.pageHeaderIcon}><MdOutlineForum /></div>
        <div>
          <h1 className={styles.pageTitle}>Чат</h1>
          <p className={styles.pageSub}>Общение с однокурсниками и преподавателями</p>
        </div>
      </div>

      <div className={`${styles.chatPanel} ${showMobileChat ? styles.mobileActive : ""}`}>

        <aside className={styles.sidebar}>
          <div className={styles.tabs}>
            <button
              className={`${styles.tab} ${activeTab === "chats" ? styles.tabActive : ""}`}
              onClick={() => setActiveTab("chats")}
            >
              <IoChatbubblesOutline />
              <span>Чаты</span>
              {chats.reduce((s, c) => s + (c.unreadCount > 0 ? 1 : 0), 0) > 0 && (
                <span className={styles.badge}>
                  {chats.reduce((s, c) => s + (c.unreadCount > 0 ? 1 : 0), 0)}
                </span>
              )}
            </button>
            <button
              className={`${styles.tab} ${activeTab === "users" ? styles.tabActive : ""}`}
              onClick={() => setActiveTab("users")}
            >
              <IoPeopleOutline />
              <span>Люди</span>
            </button>
          </div>

          <div className={styles.searchWrap}>
            <IoSearchOutline className={styles.searchIcon} />
            <input
              type="text"
              className={styles.searchInput}
              placeholder={activeTab === "chats" ? "Поиск чатов…" : "Поиск пользователей…"}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>

          <div className={styles.convList}>
            {activeTab === "chats"
              ? (
                  <>
                    {/* ── Pinned group chats ── */}
                    {groupChats.length > 0 && (
                      <>
                        <div className={styles.sectionLabel}>
                          <IoPinOutline />
                          <span>Чат группы</span>
                        </div>
                        {groupChats.map(chat => (
                          <button
                            key={chat.id}
                            className={`${styles.convItem} ${styles.convPinned} ${activeChat?.id === chat.id ? styles.convActive : ""}`}
                            onClick={() => handleSelectChat(chat)}
                          >
                            <div className={styles.convAvatarWrap}>
                              <AvatarImg src={chat.avatarSrc} name={chat.name} className={styles.convAvatar} />
                              <div className={styles.pinnedDot}><IoPinOutline /></div>
                            </div>
                            <div className={styles.convInfo}>
                              <div className={styles.convTop}>
                                <span className={styles.convName}>{chat.name}</span>
                                <span className={styles.convTime}>{chat.lastMessageTime}</span>
                              </div>
                              <div className={styles.convBottom}>
                                <span className={styles.convLast}>{chat.lastMessage}</span>
                                {chat.unreadCount > 0 && (
                                  <span className={styles.unread}>{chat.unreadCount}</span>
                                )}
                              </div>
                            </div>
                          </button>
                        ))}
                        {privateChats.length > 0 && (
                          <div className={styles.sectionLabel} style={{ marginTop: 8 }}>
                            <IoChatbubblesOutline />
                            <span>Личные сообщения</span>
                          </div>
                        )}
                      </>
                    )}

                    {/* ── Private chats ── */}
                    {privateChats.length === 0 && groupChats.length === 0
                      ? <p className={styles.emptyList}>Нет чатов</p>
                      : privateChats.map(chat => (
                          <button
                            key={chat.id}
                            className={`${styles.convItem} ${activeChat?.id === chat.id ? styles.convActive : ""}`}
                            onClick={() => handleSelectChat(chat)}
                          >
                            <div className={styles.convAvatarWrap}>
                              <AvatarImg src={chat.avatarSrc} name={chat.name} className={styles.convAvatar} />
                              <span className={`${styles.dot} ${chat.isOnline ? styles.dotOnline : styles.dotOff}`} />
                            </div>
                            <div className={styles.convInfo}>
                              <div className={styles.convTop}>
                                <span className={styles.convName}>{chat.name}</span>
                                <span className={styles.convTime}>{chat.lastMessageTime}</span>
                              </div>
                              <div className={styles.convBottom}>
                                <span className={styles.convLast}>{chat.lastMessage}</span>
                                {chat.unreadCount > 0 && (
                                  <span className={styles.unread}>{chat.unreadCount}</span>
                                )}
                              </div>
                            </div>
                          </button>
                        ))
                    }
                  </>
                )
              : filteredUsers.length === 0
                ? <p className={styles.emptyList}>Нет пользователей</p>
                : filteredUsers.map(u => (
                    <button
                      key={u.id}
                      className={styles.convItem}
                      onClick={() => handleUserClick(u)}
                    >
                      <div className={styles.convAvatarWrap}>
                        <AvatarImg src={u.avatarSrc} name={u.name} className={styles.convAvatar} />
                        <span className={`${styles.dot} ${u.isOnline ? styles.dotOnline : styles.dotOff}`} />
                      </div>
                      <div className={styles.convInfo}>
                        <div className={styles.convTop}>
                          <span className={styles.convName}>{u.name}</span>
                          {u.isOnline && <span className={styles.onlineTag}>В сети</span>}
                        </div>
                        <div className={styles.convBottom}>
                          <span className={styles.convLast}>@{u.username}</span>
                        </div>
                      </div>
                    </button>
                  ))
            }
          </div>
        </aside>

        {activeChat ? (
          <div className={styles.chatArea}>
            <div className={styles.chatHeader}>
              <button className={styles.mobileBack} onClick={() => setShowMobileChat(false)}>
                <IoArrowBack />
              </button>
              <div className={styles.chatHeaderAvatarWrap}>
                <AvatarImg src={activeChat.avatarSrc} name={activeChat.name} className={styles.chatHeaderAvatar} />
                <span className={`${styles.dot} ${activeChat.isOnline ? styles.dotOnline : styles.dotOff}`} />
              </div>
              <div className={styles.chatHeaderInfo}>
                <span className={styles.chatHeaderName}>{activeChat.name}</span>
                <span className={styles.chatHeaderStatus}>
                  {typingNames.length > 0
                    ? `${typingNames.join(", ")} печатает…`
                    : activeChat.isOnline ? "В сети" : "Не в сети"}
                </span>
              </div>
            </div>

            <div className={styles.messages}>
              {messages.map((msg, i) => {
                const currDate = msg.sentTime ? new Date(msg.sentTime) : null;
                const prevDate = i > 0 && messages[i - 1].sentTime ? new Date(messages[i - 1].sentTime) : null;
                const showSep = currDate && (i === 0 || !prevDate || prevDate.toDateString() !== currDate.toDateString());
                return (
                  <div key={msg.id}>
                    {showSep && currDate && (
                      <div className={styles.dateSep}>
                        <span>{formatSepDate(msg.sentTime)}</span>
                      </div>
                    )}
                    <div className={`${styles.msgRow} ${msg.isOwn ? styles.msgRowOwn : ""}`}>
                      {!msg.isOwn && (
                        <AvatarImg src={msg.avatarSrc} name={msg.sender} className={styles.msgAvatar} />
                      )}
                      <div className={styles.msgBubbleWrap}>
                        {!msg.isOwn && (
                          <span className={styles.msgSender}>{msg.sender}</span>
                        )}
                        <div className={`${styles.bubble} ${msg.isOwn ? styles.bubbleOwn : styles.bubbleIncoming}`}>
                          {msg.messageType === "text" && (
                            <span className={styles.bubbleText}>{parseLinks(msg.message)}</span>
                          )}
                          {msg.messageType === "code" && (
                            <div className={styles.codeMsg}>
                              <div className={styles.codeHeader}>
                                <span className={styles.codeLang}>{msg.codeLanguage || "code"}</span>
                              </div>
                              <pre><code>{msg.message}</code></pre>
                            </div>
                          )}
                          {msg.messageType === "file" && (
                            <div className={styles.fileMsg}>
                              <div className={styles.fileIconWrap}>
                                <BsFileEarmarkText />
                              </div>
                              <div className={styles.fileInfo}>
                                <span className={styles.fileName}>{msg.fileName}</span>
                                <span className={styles.fileSize}>{(msg.fileSize / 1024).toFixed(1)} KB</span>
                              </div>
                              <a
                                href={`${BASE_URL}/api/chat/files/${msg.filePath}`}
                                download={msg.fileName}
                                className={styles.fileDownload}
                                onClick={e => e.stopPropagation()}
                              >
                                <IoDownloadOutline />
                              </a>
                            </div>
                          )}
                          {msg.messageType === "image" && (
                            <img
                              src={`${BASE_URL}/api/chat/files/${msg.filePath}`}
                              alt={msg.fileName}
                              className={styles.imgMsg}
                            />
                          )}
                          <div className={styles.bubbleMeta}>
                            {msg.isEdited && <span className={styles.editedTag}>изм.</span>}
                            <span className={styles.msgTime}>{formatMsgTime(msg.sentTime)}</span>
                          </div>
                        </div>
                      </div>
                      {msg.isOwn && (
                        <AvatarImg src={msg.avatarSrc} name={msg.sender} className={styles.msgAvatar} />
                      )}
                    </div>
                  </div>
                );
              })}
              {typingNames.length > 0 && (
                <div className={styles.typingWrap}>
                  <div className={styles.typingDots}>
                    <span /><span /><span />
                  </div>
                  <span className={styles.typingText}>{typingNames.join(", ")} печатает…</span>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            <div className={styles.inputArea}>
              <button
                className={styles.attachBtn}
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                title="Прикрепить файл"
              >
                <IoAttachOutline />
              </button>
              <textarea
                ref={textareaRef}
                className={styles.textInput}
                placeholder={uploading ? "Загрузка файла…" : "Введите сообщение…"}
                value={inputText}
                onChange={e => { setInputText(e.target.value); handleTyping(); }}
                onKeyDown={handleKeyDown}
                rows={1}
                disabled={uploading}
              />
              <button
                className={`${styles.sendBtn} ${inputText.trim() ? styles.sendActive : ""}`}
                onClick={handleSend}
                disabled={!inputText.trim() || uploading}
                title="Отправить"
              >
                <IoSendSharp />
              </button>
            </div>
          </div>
        ) : (
          <div className={styles.noChatArea}>
            <div className={styles.noChatInner}>
              <div className={styles.noChatIcon}><MdOutlineForum /></div>
              <h3>Выберите чат</h3>
              <p>Выберите беседу из списка или найдите пользователя, чтобы начать диалог</p>
            </div>
          </div>
        )}
      </div>

      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileSelect}
        style={{ display: "none" }}
        accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip,.rar,.7z"
      />
    </div>
  );
}

export default Chat;
