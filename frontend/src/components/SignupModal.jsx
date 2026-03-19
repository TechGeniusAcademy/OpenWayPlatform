import { useState } from "react";
import { FaInstagram, FaWhatsapp, FaPhone } from "react-icons/fa";
import "./SignupModal.css";

export default function SignupModal({ onClose }) {
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "" });

  const handleOverlay = (e) => {
    if (e.target === e.currentTarget) onClose();
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <div className="smod-overlay" onClick={handleOverlay}>
      <div className="smod-box">
        <button className="smod-close" onClick={onClose} aria-label="Закрыть">✕</button>

        {/* ── Animated character scene ── */}
        <div className="smod-scene-wrap">
          <div className="smod-header">
            <div className="smod-paper" />
            <div className="smod-paper-2" />

            <div className="smod-me">
              <div className="smod-me-body" />
              <div className="smod-me-head">
                <div className="smod-hair" />
                <div className="smod-face">
                  <div className="smod-eye-1" />
                  <div className="smod-eye-2" />
                  <div className="smod-mouth" />
                </div>
                <div className="smod-hair-front" />
              </div>
            </div>

            <div className="smod-table">
              <div className="smod-bowl-2">
                <div className="smod-caneta-1" />
                <div className="smod-caneta-2" />
              </div>
              <div className="smod-notebook" />
              <div className="smod-book-1" />
              <div className="smod-book-2" />
              <div className="smod-book-3" />
              <div className="smod-coffee">
                <div className="smod-smoke" />
              </div>
              <div className="smod-bowl">
                <div className="smod-leaf-1" />
                <div className="smod-leaf-2" />
                <div className="smod-leaf-3" />
                <div className="smod-leaf-4" />
                <div className="smod-leaf-5" />
              </div>
              <div className="smod-box-item">
                <div className="smod-circle" />
                <div className="smod-circle smod-circle-2" />
              </div>
            </div>
          </div>
        </div>

        {/* ── Form ── */}
        <div className="smod-form-area">
          {submitted ? (
            <div className="smod-success">
              <div className="smod-check">✓</div>
              <h2>Заявка отправлена!</h2>
              <p>Мы свяжемся с вами в ближайшее время.</p>
              <button className="smod-submit" onClick={onClose}>Закрыть</button>
            </div>
          ) : (
            <>
              <h2>Записаться на курс</h2>
              <p>Оставьте заявку — мы свяжемся с вами</p>
              <form onSubmit={handleSubmit}>
                <input
                  type="text"
                  placeholder="Ваше имя"
                  required
                  value={form.name}
                  onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
                />
                <input
                  type="tel"
                  placeholder="Номер телефона"
                  required
                  value={form.phone}
                  onChange={(e) => setForm(f => ({ ...f, phone: e.target.value }))}
                />
                <button type="submit" className="smod-submit">Отправить заявку</button>
              </form>

              <div className="smod-socials">
                <a href="https://instagram.com" target="_blank" rel="noreferrer" className="smod-social smod-instagram" aria-label="Instagram">
                  <FaInstagram />
                </a>
                <a href="https://wa.me" target="_blank" rel="noreferrer" className="smod-social smod-whatsapp" aria-label="WhatsApp">
                  <FaWhatsapp />
                </a>
                <a href="tel:+7" className="smod-social smod-phone" aria-label="Телефон">
                  <FaPhone />
                </a>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
