import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { FaEnvelope, FaLock, FaEye, FaEyeSlash, FaArrowLeft } from "react-icons/fa";
import styles from "./Login.module.css";

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const { login, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      redirectByRole(user.role);
    }
  }, [user]);

  const redirectByRole = (role) => {
    switch (role) {
      case "admin":
        navigate("/admin");
        break;
      case "teacher":
        navigate("/teacher");
        break;
      case "tester":
        navigate("/tester");
        break;
      case "css_editor":
        navigate("/css-editor");
        break;
      case "student":
        navigate("/student");
        break;
      default:
        break;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (!email || !password) {
      setError("Пожалуйста, заполните все поля");
      setLoading(false);
      return;
    }

    const result = await login(email, password);

    if (result.success) {
      redirectByRole(result.user.role);
    } else {
      setError(result.error || "Ошибка авторизации");
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <button className={styles.backBtn} onClick={() => navigate("/")}>
        <FaArrowLeft /> На главную
      </button>
      <div className={styles.leftSide}>
      </div>

      <div className={styles.formWrapper}>
        <h2>Войдите в свой аккаунт</h2>
        <form className={styles.form} onSubmit={handleSubmit}>
          {error && <div className={styles.error}>{error}</div>}

          <input type="email" className={styles.input} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="example@mail.com" disabled={loading} autoComplete="email" />

          <input type={showPassword ? "text" : "password"} className={styles.input} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="**********" disabled={loading} autoComplete="current-password" />

          <button type="submit" className={styles.submitBtn} data-back="Войти" data-front="Вход" disabled={loading}></button>
        </form>
      </div>

      <div className={styles.rightSideBanner}>
        <img src="/loginPageBanner.jpg" alt="LoginPageBanner" />
      </div>
    </div>
  );
}

export default Login;
