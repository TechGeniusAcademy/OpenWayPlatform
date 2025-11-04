import { FaKeyboard } from 'react-icons/fa';
import TypingTrainer from '../../components/TypingTrainer';
import styles from './StudentTyping.module.css';

function StudentTyping() {
  return (
    <div className={styles['student-page']}>
      

      <TypingTrainer />
    </div>
  );
}

export default StudentTyping;