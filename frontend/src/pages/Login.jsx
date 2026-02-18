import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { FaEnvelope, FaLock, FaEye, FaEyeSlash } from 'react-icons/fa';
import styles from './Login.module.css';

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
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
      case 'admin': navigate('/admin'); break;
      case 'teacher': navigate('/teacher'); break;
      case 'tester': navigate('/tester'); break;
      case 'css_editor': navigate('/css-editor'); break;
      case 'student': navigate('/student'); break;
      default: break;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!email || !password) {
      setError('Пожалуйста, заполните все поля');
      setLoading(false);
      return;
    }

    const result = await login(email, password);

    if (result.success) {
      redirectByRole(result.user.role);
    } else {
      setError(result.error || 'Ошибка авторизации');
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>

      <div className={styles.rainbowBackground}>
        {[...Array(25)].map((_, i) => (
          <div key={i} className={`${styles.rainbow} ${styles[`rainbow${i + 1}`]}`}></div>
        ))}
        <div className={styles.h}></div>
        <div className={styles.v}></div>
      </div>

      <div className={styles.formWrapper}>
        <div className={styles.logo}>
          <h1>OpenWay</h1>
        </div>

        <form className={styles.form} onSubmit={handleSubmit}>
          {error && <div className={styles.error}>{error}</div>}

          <div className={styles.inputGroup}>
            <label className={styles.label}>
              <FaEnvelope className={styles.labelIcon} /> Email
            </label>
            <input
              type="email"
              className={styles.input}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="example@mail.com"
              disabled={loading}
              autoComplete="email"
            />
          </div>

          <div className={styles.inputGroup}>
            <label className={styles.label}>
              <FaLock className={styles.labelIcon} /> Пароль
            </label>
            <div className={styles.passwordWrapper}>
              <input
                type={showPassword ? 'text' : 'password'}
                className={styles.input}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Введите пароль"
                disabled={loading}
                autoComplete="current-password"
              />
            </div>
          </div>

          <button type="submit" className={styles.submitBtn} disabled={loading}>
            {loading ? 'Вход...' : 'Войти'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default Login;
