import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ChessGame from '../../components/ChessGame';
import OnlineChess from '../../components/OnlineChess';
import './Games.css';

function Games() {
  const navigate = useNavigate();
  const [selectedGame, setSelectedGame] = useState(null);

  const games = [
    {
      id: 'online-chess',
      title: 'Онлайн Шахматы',
      icon: '♟️',
      description: 'Играй в шахматы онлайн с другими игроками из твоей группы',
      color: '#667eea',
      available: true
    },
    {
      id: 'chess',
      title: 'Шахматы vs AI',
      icon: '🤖',
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

  if (selectedGame === 'online-chess') {
    return (
      <div className="games-page">
        <button onClick={handleBack} className="back-button">
          ← Назад к играм
        </button>
        <OnlineChess />
      </div>
    );
  }

  if (selectedGame === 'chess') {
    return (
      <div className="games-page">
        <button onClick={handleBack} className="back-button">
          ← Назад к играм
        </button>
        <ChessGame />
      </div>
    );
  }

  return (
    <div className="games-page">
      <div className="games-header">
        <h1>🎮 Игровая комната</h1>
        <p>Отдохни и развлекись между занятиями!</p>
      </div>

      <div className="games-grid">
        {games.map(game => (
          <div
            key={game.id}
            className={`game-card ${!game.available ? 'disabled' : ''}`}
            onClick={() => handleGameClick(game)}
            style={{
              background: game.available 
                ? `linear-gradient(135deg, ${game.color}15, ${game.color}30)`
                : 'linear-gradient(135deg, #95a5a615, #95a5a630)'
            }}
          >
            <div className="game-icon">{game.icon}</div>
            <h3>{game.title}</h3>
            <p>{game.description}</p>
            {!game.available && (
              <div className="coming-soon">
                <span>🔜 Скоро</span>
              </div>
            )}
            {game.available && (
              <button className="play-button">
                Играть →
              </button>
            )}
          </div>
        ))}
      </div>

      <div className="games-footer">
        <div className="stats-info">
          <div className="stat-card">
            <div className="stat-icon">🎯</div>
            <div className="stat-content">
              <h4>Доступно игр</h4>
              <p className="stat-value">{games.filter(g => g.available).length}</p>
            </div>
          </div>
          
          <div className="stat-card">
            <div className="stat-icon">💡</div>
            <div className="stat-content">
              <h4>Совет дня</h4>
              <p className="stat-text">Делай перерывы каждый час для лучшей концентрации!</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Games;
