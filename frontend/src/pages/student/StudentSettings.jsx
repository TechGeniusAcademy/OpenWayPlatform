import { useState, useRef } from "react";
import { useAuth } from "../../context/AuthContext";
import api, { BASE_URL } from "../../utils/api";
import styles from "./StudentSettings.module.css";
import {
  FaUser, FaEnvelope, FaLock, FaCamera, FaCheck,
  FaExclamationCircle, FaEye, FaEyeSlash, FaSave,
} from "react-icons/fa";
import { MdVerified } from "react-icons/md";

function StudentSettings() {
  const { user, updateUser } = useAuth();

  /* ── Avatar ── */
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarLoading, setAvatarLoading] = useState(false);
  const [avatarMsg, setAvatarMsg] = useState(null);
  const fileInputRef = useRef(null);

  /* ── Profile info ── */
  const [profileForm, setProfileForm] = useState({
    full_name: user?.full_name || "",
    username: user?.username || "",
    email: user?.email || "",
  });
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileMsg, setProfileMsg] = useState(null);

  /* ── Password ── */
  const [passwordForm, setPasswordForm] = useState({
    current_password: "",
    new_password: "",
    confirm_password: "",
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState(null);

  /* ════════════════════════════════
     AVATAR
  ════════════════════════════════ */
  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const allowed = ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"];
    if (!allowed.includes(file.type)) {
      setAvatarMsg({ type: "error", text: "Разрешены только изображения (JPEG, PNG, GIF, WebP)" });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setAvatarMsg({ type: "error", text: "Максимальный размер файла — 5 МБ" });
      return;
    }
    setAvatarFile(file);
    setAvatarMsg(null);
    const reader = new FileReader();
    reader.onloadend = () => setAvatarPreview(reader.result);
    reader.readAsDataURL(file);
  };

  const handleAvatarUpload = async () => {
    if (!avatarFile) return;
    try {
      setAvatarLoading(true);
      setAvatarMsg(null);
      const formData = new FormData();
      formData.append("avatar", avatarFile);
      const res = await api.post("/users/me/avatar", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      updateUser({ ...user, avatar_url: res.data.avatar_url });
      setAvatarPreview(null);
      setAvatarFile(null);
      setAvatarMsg({ type: "success", text: "Аватар успешно обновлён!" });
    } catch (err) {
      setAvatarMsg({ type: "error", text: err.response?.data?.error || "Ошибка загрузки аватара" });
    } finally {
      setAvatarLoading(false);
    }
  };

  /* ════════════════════════════════
     PROFILE INFO
  ════════════════════════════════ */
  const handleProfileSave = async (e) => {
    e.preventDefault();
    try {
      setProfileLoading(true);
      setProfileMsg(null);
      const res = await api.put("/users/me", {
        full_name: profileForm.full_name,
        username: profileForm.username,
        email: profileForm.email,
      });
      updateUser({ ...user, ...res.data.user });
      setProfileMsg({ type: "success", text: "Данные профиля сохранены!" });
    } catch (err) {
      setProfileMsg({ type: "error", text: err.response?.data?.error || "Ошибка сохранения" });
    } finally {
      setProfileLoading(false);
    }
  };

  /* ════════════════════════════════
     PASSWORD
  ════════════════════════════════ */
  const handlePasswordSave = async (e) => {
    e.preventDefault();
    if (passwordForm.new_password !== passwordForm.confirm_password) {
      setPasswordMsg({ type: "error", text: "Новые пароли не совпадают" });
      return;
    }
    if (passwordForm.new_password.length < 6) {
      setPasswordMsg({ type: "error", text: "Пароль должен быть не менее 6 символов" });
      return;
    }
    try {
      setPasswordLoading(true);
      setPasswordMsg(null);
      await api.put("/users/me", {
        current_password: passwordForm.current_password,
        new_password: passwordForm.new_password,
      });
      setPasswordForm({ current_password: "", new_password: "", confirm_password: "" });
      setPasswordMsg({ type: "success", text: "Пароль успешно изменён!" });
    } catch (err) {
      setPasswordMsg({ type: "error", text: err.response?.data?.error || "Ошибка изменения пароля" });
    } finally {
      setPasswordLoading(false);
    }
  };

  const currentAvatar = avatarPreview || (user?.avatar_url ? `${BASE_URL}${user.avatar_url}` : null);
  const initials = (user?.full_name || user?.username || "U").charAt(0).toUpperCase();

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Настройки</h1>
        <p className={styles.subtitle}>Управляйте своим аккаунтом и данными профиля</p>
      </div>

      <div className={styles.grid}>

        {/* ══ AVATAR CARD ══ */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <FaCamera className={styles.cardIcon} />
            <span className={styles.cardTitle}>Фото профиля</span>
          </div>

          <div className={styles.avatarSection}>
            <div className={styles.avatarPreviewWrap}>
              {currentAvatar ? (
                <img src={currentAvatar} alt="avatar" className={styles.avatarPreview} />
              ) : (
                <div className={styles.avatarFallback}>{initials}</div>
              )}
              <button
                className={styles.avatarOverlay}
                onClick={() => fileInputRef.current?.click()}
                title="Изменить фото"
              >
                <FaCamera />
              </button>
            </div>

            <div className={styles.avatarInfo}>
              <p className={styles.avatarName}>{user?.full_name || user?.username}</p>
              <p className={styles.avatarRole}>Студент</p>
              <button
                className={styles.chooseBtn}
                onClick={() => fileInputRef.current?.click()}
              >
                Выбрать фото
              </button>
              <p className={styles.avatarHint}>JPEG, PNG, GIF, WebP — до 5 МБ</p>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
              onChange={handleAvatarChange}
              style={{ display: "none" }}
            />
          </div>

          {avatarFile && (
            <div className={styles.saveRow}>
              <button
                className={styles.saveBtn}
                onClick={handleAvatarUpload}
                disabled={avatarLoading}
              >
                {avatarLoading ? "Загрузка..." : <><FaSave /> Сохранить фото</>}
              </button>
              <button
                className={styles.cancelBtn}
                onClick={() => { setAvatarPreview(null); setAvatarFile(null); setAvatarMsg(null); }}
              >
                Отмена
              </button>
            </div>
          )}

          <StatusMessage msg={avatarMsg} />
        </div>

        {/* ══ PROFILE INFO CARD ══ */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <FaUser className={styles.cardIcon} />
            <span className={styles.cardTitle}>Информация профиля</span>
          </div>

          <form className={styles.form} onSubmit={handleProfileSave}>
            <div className={styles.field}>
              <label className={styles.label}>Полное имя</label>
              <div className={styles.inputWrap}>
                <FaUser className={styles.inputIcon} />
                <input
                  className={styles.input}
                  type="text"
                  value={profileForm.full_name}
                  onChange={(e) => setProfileForm((p) => ({ ...p, full_name: e.target.value }))}
                  placeholder="Введите ваше имя"
                />
              </div>
            </div>

            <div className={styles.field}>
              <label className={styles.label}>
                Имя пользователя
                <span className={styles.fieldNote}>@{user?.username}</span>
              </label>
              <div className={styles.inputWrap}>
                <span className={styles.inputPrefix}>@</span>
                <input
                  className={`${styles.input} ${styles.inputPrefixed}`}
                  type="text"
                  value={profileForm.username}
                  onChange={(e) => setProfileForm((p) => ({ ...p, username: e.target.value }))}
                  placeholder="username"
                />
              </div>
            </div>

            <div className={styles.field}>
              <label className={styles.label}>
                Email
                {user?.email && (
                  <span className={styles.verifiedBadge}>
                    <MdVerified /> Подтверждён
                  </span>
                )}
              </label>
              <div className={styles.inputWrap}>
                <FaEnvelope className={styles.inputIcon} />
                <input
                  className={styles.input}
                  type="email"
                  value={profileForm.email}
                  onChange={(e) => setProfileForm((p) => ({ ...p, email: e.target.value }))}
                  placeholder="example@mail.com"
                />
              </div>
            </div>

            <StatusMessage msg={profileMsg} />

            <button className={styles.saveBtn} type="submit" disabled={profileLoading}>
              {profileLoading ? "Сохранение..." : <><FaSave /> Сохранить изменения</>}
            </button>
          </form>
        </div>

        {/* ══ PASSWORD CARD ══ */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <FaLock className={styles.cardIcon} />
            <span className={styles.cardTitle}>Изменить пароль</span>
          </div>

          <form className={styles.form} onSubmit={handlePasswordSave}>
            <PasswordField
              label="Текущий пароль"
              value={passwordForm.current_password}
              show={showPasswords.current}
              onToggle={() => setShowPasswords((p) => ({ ...p, current: !p.current }))}
              onChange={(v) => setPasswordForm((p) => ({ ...p, current_password: v }))}
              placeholder="Введите текущий пароль"
            />
            <PasswordField
              label="Новый пароль"
              value={passwordForm.new_password}
              show={showPasswords.new}
              onToggle={() => setShowPasswords((p) => ({ ...p, new: !p.new }))}
              onChange={(v) => setPasswordForm((p) => ({ ...p, new_password: v }))}
              placeholder="Минимум 6 символов"
            />
            <PasswordField
              label="Подтвердите новый пароль"
              value={passwordForm.confirm_password}
              show={showPasswords.confirm}
              onToggle={() => setShowPasswords((p) => ({ ...p, confirm: !p.confirm }))}
              onChange={(v) => setPasswordForm((p) => ({ ...p, confirm_password: v }))}
              placeholder="Повторите новый пароль"
            />

            {/* Strength indicator */}
            {passwordForm.new_password && (
              <PasswordStrength password={passwordForm.new_password} />
            )}

            <StatusMessage msg={passwordMsg} />

            <button className={styles.saveBtn} type="submit" disabled={passwordLoading}>
              {passwordLoading ? "Сохранение..." : <><FaLock /> Изменить пароль</>}
            </button>
          </form>
        </div>

      </div>
    </div>
  );
}

/* ════════════════════════════════
   ВСПОМОГАТЕЛЬНЫЕ КОМПОНЕНТЫ
════════════════════════════════ */
function PasswordField({ label, value, show, onToggle, onChange, placeholder }) {
  return (
    <div className={styles.field}>
      <label className={styles.label}>{label}</label>
      <div className={styles.inputWrap}>
        <FaLock className={styles.inputIcon} />
        <input
          className={styles.input}
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
        />
      </div>
    </div>
  );
}

function PasswordStrength({ password }) {
  let score = 0;
  if (password.length >= 6) score++;
  if (password.length >= 10) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  const labels = ["", "Очень слабый", "Слабый", "Средний", "Хороший", "Надёжный"];
  const colors = ["", "#ef4444", "#f97316", "#eab308", "#22c55e", "#6366f1"];

  return (
    <div className={styles.strengthWrap}>
      <div className={styles.strengthBars}>
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className={styles.strengthBar}
            style={{ background: i <= score ? colors[score] : "var(--border-color)" }}
          />
        ))}
      </div>
      <span className={styles.strengthLabel} style={{ color: colors[score] }}>
        {labels[score]}
      </span>
    </div>
  );
}

function StatusMessage({ msg }) {
  if (!msg) return null;
  return (
    <div className={`${styles.statusMsg} ${msg.type === "success" ? styles.statusSuccess : styles.statusError}`}>
      {msg.type === "success" ? <FaCheck /> : <FaExclamationCircle />}
      {msg.text}
    </div>
  );
}

export default StudentSettings;
