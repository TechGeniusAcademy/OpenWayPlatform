import TypingTrainer from '../../components/TypingTrainer';
import './StudentTyping.css';

function StudentTyping() {
  return (
    <div className="student-page">
      <div className="page-header">
        <h1>⌨️ Клавиатурный тренажер</h1>
        <p>Развивайте навыки быстрой печати</p>
      </div>

      <TypingTrainer />
    </div>
  );
}

export default StudentTyping;