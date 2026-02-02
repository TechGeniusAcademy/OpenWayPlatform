import { useState, useEffect, useRef } from 'react';
import api, { BASE_URL } from '../../utils/api';
import styles from './MusicManagement.module.css';
import { 
  FaMusic, 
  FaPlus, 
  FaEdit, 
  FaTrash, 
  FaUpload,
  FaPlay,
  FaPause,
  FaTimes,
  FaImage,
  FaClock,
  FaFileAudio,
  FaAlignLeft,
  FaSearch
} from 'react-icons/fa';
import { MdMusicNote, MdLibraryMusic } from 'react-icons/md';

function MusicManagement() {
  const [tracks, setTracks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingTrack, setEditingTrack] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [playingTrack, setPlayingTrack] = useState(null);
  const audioRef = useRef(null);
  
  const [form, setForm] = useState({
    title: '',
    artist: '',
    duration: '',
    lyrics: '',
    coverFile: null,
    audioFile: null
  });
  
  const [coverPreview, setCoverPreview] = useState(null);
  const [audioFileName, setAudioFileName] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchTracks();
  }, []);

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, []);

  const fetchTracks = async () => {
    try {
      setLoading(true);
      const response = await api.get('/music');
      setTracks(response.data.tracks || []);
    } catch (error) {
      console.error('Ошибка загрузки музыки:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCoverChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setForm(prev => ({ ...prev, coverFile: file }));
      const reader = new FileReader();
      reader.onloadend = () => {
        setCoverPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAudioChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setForm(prev => ({ ...prev, audioFile: file }));
      setAudioFileName(file.name);
      
      // Получаем длительность аудио
      const audio = new Audio();
      audio.src = URL.createObjectURL(file);
      audio.onloadedmetadata = () => {
        const duration = Math.round(audio.duration);
        setForm(prev => ({ ...prev, duration: duration.toString() }));
      };
    }
  };

  const openAddModal = () => {
    setEditingTrack(null);
    setForm({
      title: '',
      artist: '',
      duration: '',
      lyrics: '',
      coverFile: null,
      audioFile: null
    });
    setCoverPreview(null);
    setAudioFileName('');
    setShowModal(true);
  };

  const openEditModal = (track) => {
    setEditingTrack(track);
    setForm({
      title: track.title || '',
      artist: track.artist || '',
      duration: track.duration?.toString() || '',
      lyrics: track.lyrics || '',
      coverFile: null,
      audioFile: null
    });
    setCoverPreview(track.cover_url ? `${BASE_URL}${track.cover_url}` : null);
    setAudioFileName(track.file_url ? track.file_url.split('/').pop() : '');
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!form.title) {
      alert('Введите название трека');
      return;
    }
    
    if (!editingTrack && !form.audioFile) {
      alert('Загрузите аудио файл');
      return;
    }
    
    setSaving(true);
    
    try {
      const formData = new FormData();
      formData.append('title', form.title);
      formData.append('artist', form.artist);
      formData.append('duration', form.duration);
      formData.append('lyrics', form.lyrics);
      
      if (form.coverFile) {
        formData.append('cover', form.coverFile);
      }
      
      if (form.audioFile) {
        formData.append('audio', form.audioFile);
      }
      
      if (editingTrack) {
        await api.put(`/music/${editingTrack.id}`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      } else {
        await api.post('/music', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      }
      
      setShowModal(false);
      fetchTracks();
    } catch (error) {
      console.error('Ошибка сохранения:', error);
      alert('Ошибка сохранения трека');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Удалить этот трек?')) return;
    
    try {
      await api.delete(`/music/${id}`);
      if (playingTrack === id) {
        setPlayingTrack(null);
        if (audioRef.current) {
          audioRef.current.pause();
        }
      }
      fetchTracks();
    } catch (error) {
      console.error('Ошибка удаления:', error);
      alert('Ошибка удаления трека');
    }
  };

  const togglePlay = (track) => {
    if (playingTrack === track.id) {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      setPlayingTrack(null);
    } else {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      audioRef.current = new Audio(`${BASE_URL}${track.file_url}`);
      audioRef.current.play();
      audioRef.current.onended = () => setPlayingTrack(null);
      setPlayingTrack(track.id);
    }
  };

  const formatDuration = (seconds) => {
    if (!seconds) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const filteredTracks = tracks.filter(track => 
    track.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    track.artist?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.titleSection}>
          <MdLibraryMusic className={styles.headerIcon} />
          <h1>Управление музыкой</h1>
        </div>
        <button className={styles.addBtn} onClick={openAddModal}>
          <FaPlus /> Добавить трек
        </button>
      </div>

      <div className={styles.searchBar}>
        <FaSearch className={styles.searchIcon} />
        <input
          type="text"
          placeholder="Поиск по названию или исполнителю..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className={styles.stats}>
        <div className={styles.statCard}>
          <FaMusic />
          <div>
            <span className={styles.statValue}>{tracks.length}</span>
            <span className={styles.statLabel}>Всего треков</span>
          </div>
        </div>
        <div className={styles.statCard}>
          <FaClock />
          <div>
            <span className={styles.statValue}>
              {formatDuration(tracks.reduce((acc, t) => acc + (t.duration || 0), 0))}
            </span>
            <span className={styles.statLabel}>Общая длительность</span>
          </div>
        </div>
      </div>

      {loading ? (
        <div className={styles.loading}>
          <div className={styles.spinner}></div>
          <p>Загрузка музыки...</p>
        </div>
      ) : filteredTracks.length === 0 ? (
        <div className={styles.empty}>
          <MdMusicNote className={styles.emptyIcon} />
          <h3>Треков пока нет</h3>
          <p>Добавьте первый трек, нажав кнопку выше</p>
        </div>
      ) : (
        <div className={styles.tracksList}>
          {filteredTracks.map((track, index) => (
            <div key={track.id} className={styles.trackCard}>
              <div className={styles.trackNumber}>{index + 1}</div>
              
              <div className={styles.trackCover} onClick={() => togglePlay(track)}>
                {track.cover_url ? (
                  <img src={`${BASE_URL}${track.cover_url}`} alt={track.title} />
                ) : (
                  <div className={styles.noCover}>
                    <FaMusic />
                  </div>
                )}
                <div className={styles.playOverlay}>
                  {playingTrack === track.id ? <FaPause /> : <FaPlay />}
                </div>
              </div>
              
              <div className={styles.trackInfo}>
                <h3 className={styles.trackTitle}>{track.title}</h3>
                {track.artist && <p className={styles.trackArtist}>{track.artist}</p>}
              </div>
              
              <div className={styles.trackDuration}>
                <FaClock />
                <span>{formatDuration(track.duration)}</span>
              </div>
              
              <div className={styles.trackActions}>
                <button 
                  className={styles.editBtn}
                  onClick={() => openEditModal(track)}
                  title="Редактировать"
                >
                  <FaEdit />
                </button>
                <button 
                  className={styles.deleteBtn}
                  onClick={() => handleDelete(track.id)}
                  title="Удалить"
                >
                  <FaTrash />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Модальное окно */}
      {showModal && (
        <div className={styles.modalOverlay} onClick={() => setShowModal(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>
                <FaMusic />
                {editingTrack ? 'Редактировать трек' : 'Добавить трек'}
              </h2>
              <button className={styles.closeBtn} onClick={() => setShowModal(false)}>
                <FaTimes />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className={styles.form}>
              <div className={styles.formRow}>
                <div className={styles.coverUpload}>
                  <label>
                    <div className={styles.coverPreview}>
                      {coverPreview ? (
                        <img src={coverPreview} alt="Cover" />
                      ) : (
                        <div className={styles.coverPlaceholder}>
                          <FaImage />
                          <span>Обложка</span>
                        </div>
                      )}
                    </div>
                    <input 
                      type="file" 
                      accept="image/*"
                      onChange={handleCoverChange}
                      hidden
                    />
                  </label>
                </div>
                
                <div className={styles.formFields}>
                  <div className={styles.formGroup}>
                    <label>
                      <MdMusicNote /> Название *
                    </label>
                    <input
                      type="text"
                      value={form.title}
                      onChange={(e) => setForm(prev => ({ ...prev, title: e.target.value }))}
                      placeholder="Название трека"
                      required
                    />
                  </div>
                  
                  <div className={styles.formGroup}>
                    <label>
                      <FaMusic /> Исполнитель
                    </label>
                    <input
                      type="text"
                      value={form.artist}
                      onChange={(e) => setForm(prev => ({ ...prev, artist: e.target.value }))}
                      placeholder="Имя исполнителя"
                    />
                  </div>
                  
                  <div className={styles.formGroup}>
                    <label>
                      <FaClock /> Продолжительность (сек)
                    </label>
                    <input
                      type="number"
                      value={form.duration}
                      onChange={(e) => setForm(prev => ({ ...prev, duration: e.target.value }))}
                      placeholder="Автоматически определится"
                      min="0"
                    />
                  </div>
                </div>
              </div>
              
              <div className={styles.formGroup}>
                <label>
                  <FaFileAudio /> Аудио файл {!editingTrack && '*'}
                </label>
                <div className={styles.fileUpload}>
                  <label className={styles.fileUploadBtn}>
                    <FaUpload />
                    <span>{audioFileName || 'Выберите файл'}</span>
                    <input 
                      type="file" 
                      accept="audio/*,.mp3,.wav,.ogg,.m4a,.flac"
                      onChange={handleAudioChange}
                      hidden
                    />
                  </label>
                </div>
              </div>
              
              <div className={styles.formGroup}>
                <label>
                  <FaAlignLeft /> Текст песни
                </label>
                <textarea
                  value={form.lyrics}
                  onChange={(e) => setForm(prev => ({ ...prev, lyrics: e.target.value }))}
                  placeholder="Текст песни (необязательно)"
                  rows={6}
                />
              </div>
              
              <div className={styles.formActions}>
                <button 
                  type="button" 
                  className={styles.cancelBtn}
                  onClick={() => setShowModal(false)}
                >
                  Отмена
                </button>
                <button 
                  type="submit" 
                  className={styles.submitBtn}
                  disabled={saving}
                >
                  {saving ? 'Сохранение...' : (editingTrack ? 'Сохранить' : 'Добавить')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default MusicManagement;
