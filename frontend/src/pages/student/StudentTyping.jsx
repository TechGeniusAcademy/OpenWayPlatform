import { FaKeyboard } from 'react-icons/fa';
import TypingTrainer from '../../components/TypingTrainer';
import styles from './StudentTyping.module.css';

function StudentTyping() {
  return (
    <div className={styles['student-page']}>
      <div className={styles['page-header']}>
        <h1><FaKeyboard style={{ marginRight: '12px', color: '#007bff' }} />Клавиатурный тренажер</h1>
        <p>Развивайте навыки быстрой печати</p>
      </div>

      <TypingTrainer />
    </div>
  );
}

export default StudentTyping;