import TypingTrainer from '../../components/TypingTrainer';
import styles from './StudentTyping.module.css';

function StudentTyping() {
  return (
    <div className={styles.student-page}>
      <div className={styles.page-header}>
        <h1>⌨️ Клавиатурный тренажер</h1>
        <p>Развивайте навыки быстрой печати</p>
      </div>

      <TypingTrainer />
    </div>
  );
}

export default StudentTyping;