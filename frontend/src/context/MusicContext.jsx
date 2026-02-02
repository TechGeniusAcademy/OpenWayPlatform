import { createContext, useContext, useState, useRef, useEffect } from 'react';
import { BASE_URL } from '../utils/api';

const MusicContext = createContext();

export const useMusic = () => {
  const context = useContext(MusicContext);
  if (!context) {
    throw new Error('useMusic must be used within a MusicProvider');
  }
  return context;
};

export const MusicProvider = ({ children }) => {
  const [currentTrack, setCurrentTrack] = useState(null);
  const [playlist, setPlaylist] = useState([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.7);
  const [isMuted, setIsMuted] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [showPlayer, setShowPlayer] = useState(false);
  
  const audioRef = useRef(new Audio());

  useEffect(() => {
    const audio = audioRef.current;
    
    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };
    
    const handleLoadedMetadata = () => {
      setDuration(audio.duration);
    };
    
    const handleEnded = () => {
      playNext();
    };
    
    const handlePlay = () => {
      setIsPlaying(true);
    };
    
    const handlePause = () => {
      setIsPlaying(false);
    };
    
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    
    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
    };
  }, [playlist]);

  useEffect(() => {
    audioRef.current.volume = isMuted ? 0 : volume;
  }, [volume, isMuted]);

  const playTrack = (track, tracks = []) => {
    if (!track) return;
    
    const audio = audioRef.current;
    
    if (currentTrack?.id === track.id) {
      // Если тот же трек, просто переключаем play/pause
      if (isPlaying) {
        audio.pause();
      } else {
        audio.play();
      }
      return;
    }
    
    // Новый трек
    setCurrentTrack(track);
    if (tracks.length > 0) {
      setPlaylist(tracks);
    }
    
    const audioUrl = track.file_url.startsWith('http') 
      ? track.file_url 
      : `${BASE_URL}${track.file_url}`;
    
    audio.src = audioUrl;
    audio.play();
    setShowPlayer(true);
  };

  const togglePlay = () => {
    const audio = audioRef.current;
    if (isPlaying) {
      audio.pause();
    } else {
      audio.play();
    }
  };

  const playNext = () => {
    if (!currentTrack || playlist.length === 0) return;
    
    const currentIndex = playlist.findIndex(t => t.id === currentTrack.id);
    const nextIndex = (currentIndex + 1) % playlist.length;
    const nextTrack = playlist[nextIndex];
    
    if (nextTrack) {
      setCurrentTrack(nextTrack);
      const audio = audioRef.current;
      const audioUrl = nextTrack.file_url.startsWith('http') 
        ? nextTrack.file_url 
        : `${BASE_URL}${nextTrack.file_url}`;
      audio.src = audioUrl;
      audio.play();
    }
  };

  const playPrevious = () => {
    if (!currentTrack || playlist.length === 0) return;
    
    const currentIndex = playlist.findIndex(t => t.id === currentTrack.id);
    const prevIndex = currentIndex === 0 ? playlist.length - 1 : currentIndex - 1;
    const prevTrack = playlist[prevIndex];
    
    if (prevTrack) {
      setCurrentTrack(prevTrack);
      const audio = audioRef.current;
      const audioUrl = prevTrack.file_url.startsWith('http') 
        ? prevTrack.file_url 
        : `${BASE_URL}${prevTrack.file_url}`;
      audio.src = audioUrl;
      audio.play();
    }
  };

  const seekTo = (time) => {
    audioRef.current.currentTime = time;
    setCurrentTime(time);
  };

  const setVolumeLevel = (level) => {
    setVolume(level);
    setIsMuted(level === 0);
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
  };

  const closePlayer = () => {
    audioRef.current.pause();
    audioRef.current.src = '';
    setCurrentTrack(null);
    setIsPlaying(false);
    setShowPlayer(false);
    setCurrentTime(0);
    setDuration(0);
  };

  const value = {
    currentTrack,
    playlist,
    isPlaying,
    currentTime,
    duration,
    volume,
    isMuted,
    isMinimized,
    showPlayer,
    playTrack,
    togglePlay,
    playNext,
    playPrevious,
    seekTo,
    setVolumeLevel,
    toggleMute,
    setIsMinimized,
    closePlayer
  };

  return (
    <MusicContext.Provider value={value}>
      {children}
    </MusicContext.Provider>
  );
};

export default MusicContext;
