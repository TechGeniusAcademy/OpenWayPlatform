import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { motion } from 'framer-motion';
import { FaEnvelope, FaLock, FaEye, FaEyeSlash, FaRocket, FaCode, FaBrain, FaChartLine, FaGraduationCap } from 'react-icons/fa';
import { IoSparkles, IoShieldCheckmark } from 'react-icons/io5';
import { HiLightningBolt } from 'react-icons/hi';
import { SiReact, SiNodedotjs, SiPython, SiJavascript } from 'react-icons/si';
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
      if (user.role === 'admin') {
        navigate('/admin');
      } else if (user.role === 'teacher') {
        navigate('/teacher');
      } else if (user.role === 'tester') {
        navigate('/tester');
      } else if (user.role === 'css_editor') {
        navigate('/css-editor');
      } else if (user.role === 'student') {
        navigate('/student');
      }
    }
  }, [user, navigate]);

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
      if (result.user.role === 'admin') {
        navigate('/admin');
      } else if (result.user.role === 'teacher') {
        navigate('/teacher');
      } else if (result.user.role === 'tester') {
        navigate('/tester');
      } else if (result.user.role === 'css_editor') {
        navigate('/css-editor');
      } else if (result.user.role === 'student') {
        navigate('/student');
      }
    } else {
      setError(result.error);
      setLoading(false);
    }
  };

  const features = [
    { icon: <FaCode />, text: 'Интерактивное обучение' },
    { icon: <FaBrain />, text: 'AI-ассистент' },
    { icon: <FaChartLine />, text: 'Отслеживание прогресса' },
    { icon: <FaGraduationCap />, text: 'Сертификаты' }
  ];

  const floatingIcons = [
    { Icon: SiReact, color: '#61dafb', delay: 0 },
    { Icon: SiNodedotjs, color: '#68a063', delay: 0.2 },
    { Icon: SiPython, color: '#306998', delay: 0.4 },
    { Icon: SiJavascript, color: '#f7df1e', delay: 0.6 },
    { Icon: FaCode, color: '#667eea', delay: 0.8 },
    { Icon: FaBrain, color: '#764ba2', delay: 1.0 }
  ];

  return (
    <div className={styles.container}>
      <motion.div 
        className={styles.leftSide}
        initial={{ x: -100, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
      >
        <div className={styles.formWrapper}>
          <motion.div 
            className={styles.logo}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
          >
            <FaRocket className={styles.logoIcon} />
            <h1>OpenWay</h1>
          </motion.div>

          <motion.div 
            className={styles.welcomeText}
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            <h2>Добро пожаловать!</h2>
            <p>Войдите в свой аккаунт чтобы продолжить обучение</p>
          </motion.div>

          <motion.form 
            className={styles.form}
            onSubmit={handleSubmit}
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.6 }}
          >
            {error && (
              <motion.div 
                className={styles.error}
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
              >
                {error}
              </motion.div>
            )}

            <div className={styles.inputGroup}>
              <label className={styles.label}>
                <FaEnvelope className={styles.labelIcon} />
                Email
              </label>
              <div className={styles.inputWrapper}>
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
            </div>

            <div className={styles.inputGroup}>
              <label className={styles.label}>
                <FaLock className={styles.labelIcon} />
                Пароль
              </label>
              <div className={styles.inputWrapper}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  className={styles.input}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Введите пароль"
                  disabled={loading}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className={styles.passwordToggle}
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex={-1}
                >
                  {showPassword ? <FaEyeSlash /> : <FaEye />}
                </button>
              </div>
            </div>

            <motion.button
              type="submit"
              className={styles.submitBtn}
              disabled={loading}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              {loading ? (
                <>
                  <div className={styles.spinner}></div>
                  Вход...
                </>
              ) : (
                <>
                  <HiLightningBolt />
                  Войти
                </>
              )}
            </motion.button>
          </motion.form>

          <motion.div 
            className={styles.securityBadge}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
          >
            <IoShieldCheckmark />
            <span>Безопасное соединение</span>
          </motion.div>
        </div>
      </motion.div>

      <motion.div 
        className={styles.rightSide}
        initial={{ x: 100, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
      >
        <div className={styles.floatingIcons}>
          {floatingIcons.map((item, index) => (
            <motion.div
              key={index}
              className={styles.floatingIcon}
              initial={{ y: 0 }}
              animate={{ 
                y: [0, -30, 0],
                rotate: [0, 5, -5, 0]
              }}
              transition={{
                duration: 3 + index * 0.5,
                repeat: Infinity,
                delay: item.delay
              }}
              style={{ color: item.color }}
            >
              <item.Icon />
            </motion.div>
          ))}
        </div>

        <div className={styles.rightContent}>
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.8 }}
          >
            <IoSparkles className={styles.sparkleIcon} />
            <h2>Образовательная платформа нового поколения</h2>
            <p>Изучайте программирование с помощью современных технологий и AI</p>
          </motion.div>

          <motion.div 
            className={styles.features}
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 1 }}
          >
            {features.map((feature, index) => (
              <motion.div
                key={index}
                className={styles.feature}
                initial={{ x: 50, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 1.2 + index * 0.1 }}
                whileHover={{ x: 10 }}
              >
                <div className={styles.featureIcon}>{feature.icon}</div>
                <span>{feature.text}</span>
              </motion.div>
            ))}
          </motion.div>

          <motion.div 
            className={styles.stats}
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 1.6 }}
          >
            <div className={styles.stat}>
              <h3>50+</h3>
              <p>Студентов</p>
            </div>
            <div className={styles.stat}>
              <h3>4+</h3>
              <p>Курсов</p>
            </div>
            <div className={styles.stat}>
              <h3>95%</h3>
              <p>Успешность</p>
            </div>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}

export default Login;
