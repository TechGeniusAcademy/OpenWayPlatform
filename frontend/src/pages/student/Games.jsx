import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ChessGame from '../../components/ChessGame';
import OnlineChess from '../../components/OnlineChess';
import QuizBattle from '../../components/QuizBattle';
import CrashGame from '../../components/CrashGame';
import PokerGame from '../../components/PokerGame';
import styles from './Games.module.css';
import { MdOutlineQuiz } from "react-icons/md";
import { FaChess, FaRocket, FaGamepad, FaBullseye, FaLightbulb, FaClock, FaFire } from "react-icons/fa";
import { GiPokerHand, GiSpades, GiPartyPopper } from "react-icons/gi";
import { IoGameController } from "react-icons/io5";
import { BsLightningChargeFill } from "react-icons/bs";



function Games() {
  const navigate = useNavigate();
  const [selectedGame, setSelectedGame] = useState(null);

  const games = [
    {
      id: 'crash',
      title: 'Crash Game',
      icon: <FaRocket />,
      description: 'Азартная игра с множителями! Ставь баллы и выводи их вовремя, пока не произошел краш',
      color: '#f093fb',
      available: true
    },
    {
      id: 'poker',
      title: 'Техасский Холдем (Еще в разработке)',
      icon: <GiPokerHand />,
      description: 'Классический покер! Раздача карт, флоп, терн и ривер. Полноценная игра на весь экран',
      color: '#2ecc71',
      available: true
    },
    {
      id: 'quiz-battle',
      title: 'Битва Знаний',
      icon: <MdOutlineQuiz />,
      description: 'PvP викторина в реальном времени! Соревнуйся с другими учениками на скорость и знания',
      color: '#667eea',
      available: true
    },
    {
      id: 'online-chess',
      title: 'Онлайн Шахматы',
      icon: <FaChess />,
      description: 'Играй в шахматы онлайн с другими игроками из твоей группы',
      color: '#667eea',
      available: true
    },
    {
      id: 'chess',
      title: 'Шахматы vs AI',
      icon: <FaChess />,
      description: 'Классическая игра в шахматы против компьютера с разными уровнями сложности',
      color: '#764ba2',
      available: true
    }
  ];

  const handleGameClick = (game) => {
    if (game.available) {
      setSelectedGame(game.id);
    }
  };

  const handleBack = () => {
    setSelectedGame(null);
  };

  if (selectedGame === 'crash') {
    return (
      <div className={styles['games-page']}>
        <button onClick={handleBack} className={styles['back-button']}>
          ← Назад к играм
        </button>
        <CrashGame />
      </div>
    );
  }

  if (selectedGame === 'poker') {
    return (
      <div className={styles['games-page']}>
        <button onClick={handleBack} className={styles['back-button']}>
          ← Назад к играм
        </button>
        <PokerGame />
      </div>
    );
  }

  if (selectedGame === 'quiz-battle') {
    return (
      <div className={styles['games-page']}>
        <button onClick={handleBack} className={styles['back-button']}>
          ← Назад к играм
        </button>
        <QuizBattle />
      </div>
    );
  }

  if (selectedGame === 'online-chess') {
    return (
      <div className={styles['games-page']}>
        <button onClick={handleBack} className={styles['back-button']}>
          ← Назад к играм
        </button>
        <OnlineChess />
      </div>
    );
  }

  if (selectedGame === 'chess') {
    return (
      <div className={styles['games-page']}>
        <button onClick={handleBack} className={styles['back-button']}>
          ← Назад к играм
        </button>
        <ChessGame />
      </div>
    );
  }

  return (
    <div className={styles['games-page']}>
      <div className={styles['games-header']}>
        <div className={styles['header-icons']}>
          <IoGameController className={styles['float-icon-1']} />
          <FaGamepad className={styles['float-icon-2']} />
          <GiPartyPopper className={styles['float-icon-3']} />
        </div>
        <div className={styles['header-icon']}>
          <IoGameController />
        </div>
        <h1>Игровая комната</h1>
        <p>Отдохни и развлекись между занятиями!</p>
      </div>

      <div className={styles['games-grid']}>
        {games.map(game => (
          <div
            key={game.id}
            className={`${styles['game-card']} ${!game.available ? styles['disabled'] : ''}`}
            onClick={() => handleGameClick(game)}
            style={{
              background: game.available 
                ? `linear-gradient(135deg, ${game.color}15, ${game.color}30)`
                : 'linear-gradient(135deg, #95a5a615, #95a5a630)'
            }}
          >
            <div className={styles['game-icon']}>{game.icon}</div>
            <h3>{game.title}</h3>
            <p>{game.description}</p>
            {!game.available && (
              <div className={styles['coming-soon']}>
                <FaClock />
                <span>Скоро</span>
              </div>
            )}
            {game.available && (
              <button className={styles['play-button']}>
                <BsLightningChargeFill />
                <span>Играть</span>
              </button>
            )}
          </div>
        ))}
      </div>

      <div className={styles['games-footer']}>
        <div className={styles['stats-info']}>
          <div className={styles['stat-card']}>
            <div className={styles['stat-icon']}>
              <FaBullseye />
            </div>
            <div className={styles['stat-content']}>
              <h4>Доступно игр</h4>
              <p className={styles['stat-value']}>{games.filter(g => g.available).length}</p>
            </div>
          </div>
          
          <div className={styles['stat-card']}>
            <div className={styles['stat-icon']}>
              <FaLightbulb />
            </div>
            <div className={styles['stat-content']}>
              <h4>Совет дня</h4>
              <p className={styles['stat-text']}>Делай перерывы каждый час для лучшей концентрации!</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Games;
