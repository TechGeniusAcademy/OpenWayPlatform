import { useState, useEffect, useRef } from 'react';
import api, { BASE_URL } from '../../utils/api';
import styles from './MoviesManagement.module.css';
import { 
  FaFilm, 
  FaPlus, 
  FaEdit, 
  FaTrash, 
  FaUpload,
  FaPlay,
  FaTimes,
  FaImage,
  FaClock,
  FaLink,
  FaSearch,
  FaEye,
  FaEyeSlash,
  FaCalendarAlt,
  FaVideo,
  FaCloudUploadAlt
} from 'react-icons/fa';
import { MdMovie, MdVideoLibrary } from 'react-icons/md';

function MoviesManagement() {
  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingMovie, setEditingMovie] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [previewMovie, setPreviewMovie] = useState(null);
  
  const [form, setForm] = useState({
    title: '',
    description: '',
    video_url: '',
    year: '',
    genre: '',
    duration: '',
    coverFile: null,
    videoFile: null
  });
  
  const [coverPreview, setCoverPreview] = useState(null);
  const [videoSource, setVideoSource] = useState('file'); // 'file' или 'url'
  const [uploadProgress, setUploadProgress] = useState(0);
  const [saving, setSaving] = useState(false);
  const videoInputRef = useRef(null);

  // Жанры фильмов
  const genres = [
    'Боевик', 'Комедия', 'Драма', 'Фантастика', 'Ужасы', 
    'Триллер', 'Мелодрама', 'Приключения', 'Анимация', 'Документальный',
    'Криминал', 'Фэнтези', 'Детектив', 'Военный', 'Семейный'
  ];

  useEffect(() => {
    fetchMovies();
  }, []);

  const fetchMovies = async () => {
    try {
      setLoading(true);
      const response = await api.get('/movies');
      setMovies(response.data.movies || []);
    } catch (error) {
      console.error('Ошибка загрузки фильмов:', error);
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

  const handleVideoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Проверяем размер (max 10GB)
      if (file.size > 10 * 1024 * 1024 * 1024) {
        alert('Файл слишком большой. Максимум 10GB');
        return;
      }
      setForm(prev => ({ ...prev, videoFile: file, video_url: '' }));
    }
  };

  const openAddModal = () => {
    setEditingMovie(null);
    setForm({
      title: '',
      description: '',
      video_url: '',
      year: '',
      genre: '',
      duration: '',
      coverFile: null,
      videoFile: null
    });
    setCoverPreview(null);
    setVideoSource('file');
    setUploadProgress(0);
    setShowModal(true);
  };

  const openEditModal = (movie) => {
    setEditingMovie(movie);
    setForm({
      title: movie.title || '',
      description: movie.description || '',
      video_url: movie.video_url || '',
      year: movie.year?.toString() || '',
      genre: movie.genre || '',
      duration: movie.duration?.toString() || '',
      coverFile: null,
      videoFile: null
    });
    setCoverPreview(movie.cover_url ? `${BASE_URL}${movie.cover_url}` : null);
    setVideoSource(movie.video_file ? 'file' : 'url');
    setUploadProgress(0);
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!form.title) {
      alert('Введите название фильма');
      return;
    }
    
    // Проверяем наличие видео
    if (videoSource === 'url' && !form.video_url) {
      alert('Введите ссылку на видео');
      return;
    }
    
    if (videoSource === 'file' && !form.videoFile && !editingMovie?.video_file) {
      alert('Выберите видеофайл');
      return;
    }
    
    setSaving(true);
    setUploadProgress(0);
    
    try {
      const formData = new FormData();
      formData.append('title', form.title);
      formData.append('description', form.description);
      formData.append('year', form.year);
      formData.append('genre', form.genre);
      formData.append('duration', form.duration);
      
      if (videoSource === 'url') {
        formData.append('video_url', form.video_url);
      } else if (form.videoFile) {
        formData.append('video', form.videoFile);
      }
      
      if (form.coverFile) {
        formData.append('cover', form.coverFile);
      }
      
      const config = {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (progressEvent) => {
          const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setUploadProgress(percent);
        }
      };
      
      if (editingMovie) {
        await api.put(`/movies/${editingMovie.id}`, formData, config);
      } else {
        await api.post('/movies', formData, config);
      }
      
      fetchMovies();
      setShowModal(false);
    } catch (error) {
      console.error('Ошибка сохранения:', error);
      alert('Ошибка сохранения фильма');
    } finally {
      setSaving(false);
      setUploadProgress(0);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Удалить этот фильм?')) return;
    
    try {
      await api.delete(`/movies/${id}`);
      fetchMovies();
    } catch (error) {
      console.error('Ошибка удаления:', error);
      alert('Ошибка удаления');
    }
  };

  const handleToggle = async (id) => {
    try {
      await api.patch(`/movies/${id}/toggle`);
      fetchMovies();
    } catch (error) {
      console.error('Ошибка переключения статуса:', error);
    }
  };

  const formatDuration = (minutes) => {
    if (!minutes) return '--:--';
    const hrs = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hrs > 0) {
      return `${hrs}ч ${mins}м`;
    }
    return `${mins}м`;
  };

  const filteredMovies = movies.filter(movie =>
    movie.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    movie.genre?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Извлечение embed URL из различных сервисов
  const getEmbedUrl = (url) => {
    if (!url) return null;
    
    // Уже embed ссылка
    if (url.includes('/embed/') || url.includes('iframe')) {
      return url;
    }
    
    // YouTube
    const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/);
    if (ytMatch) {
      return `https://www.youtube.com/embed/${ytMatch[1]}`;
    }
    
    // Veedly и другие - просто возвращаем как есть
    return url;
  };

  // Получить URL видео для просмотра
  const getVideoPlayUrl = (movie) => {
    if (movie.video_file) {
      // Локальный файл - используем video тег
      return `${BASE_URL}${movie.video_file}`;
    }
    return getEmbedUrl(movie.video_url);
  };

  // Проверить, локальный ли файл
  const isLocalVideo = (movie) => {
    return !!movie.video_file;
  };

  // Форматирование размера файла
  const formatFileSize = (bytes) => {
    if (!bytes) return '';
    const gb = bytes / (1024 * 1024 * 1024);
    if (gb >= 1) return `${gb.toFixed(2)} GB`;
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(1)} MB`;
  };

  if (loading) {
    return (
      <div className={styles.loading}>
        <MdMovie className={styles.loadingIcon} />
        <p>Загрузка фильмов...</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <MdVideoLibrary className={styles.headerIcon} />
          <div>
            <h1>Управление фильмами</h1>
            <p>Всего фильмов: {movies.length}</p>
          </div>
        </div>
        <button className={styles.addBtn} onClick={openAddModal}>
          <FaPlus /> Добавить фильм
        </button>
      </div>

      <div className={styles.searchBar}>
        <FaSearch className={styles.searchIcon} />
        <input
          type="text"
          placeholder="Поиск по названию или жанру..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className={styles.searchInput}
        />
      </div>

      <div className={styles.moviesList}>
        {filteredMovies.length === 0 ? (
          <div className={styles.emptyState}>
            <FaFilm className={styles.emptyIcon} />
            <p>Фильмы не найдены</p>
            <button className={styles.addFirstBtn} onClick={openAddModal}>
              <FaPlus /> Добавить первый фильм
            </button>
          </div>
        ) : (
          filteredMovies.map(movie => (
            <div key={movie.id} className={`${styles.movieCard} ${!movie.is_active ? styles.inactive : ''}`}>
              <div className={styles.movieCover}>
                {movie.cover_url ? (
                  <img 
                    src={`${BASE_URL}${movie.cover_url}`} 
                    alt={movie.title}
                    className={styles.coverImage}
                  />
                ) : (
                  <div className={styles.noCover}>
                    <FaFilm />
                  </div>
                )}
                <button 
                  className={styles.playBtn}
                  onClick={() => setPreviewMovie(movie)}
                  title="Предпросмотр"
                >
                  <FaPlay />
                </button>
              </div>
              
              <div className={styles.movieInfo}>
                <h3 className={styles.movieTitle}>{movie.title}</h3>
                <div className={styles.movieMeta}>
                  {movie.year && (
                    <span className={styles.metaItem}>
                      <FaCalendarAlt /> {movie.year}
                    </span>
                  )}
                  {movie.genre && (
                    <span className={styles.metaItem}>
                      <FaFilm /> {movie.genre}
                    </span>
                  )}
                  {movie.duration && (
                    <span className={styles.metaItem}>
                      <FaClock /> {formatDuration(movie.duration)}
                    </span>
                  )}
                </div>
                {movie.description && (
                  <p className={styles.movieDesc}>{movie.description}</p>
                )}
                <div className={styles.movieUrl}>
                  {movie.video_file ? (
                    <>
                      <FaVideo style={{ color: '#4CAF50' }} /> 
                      <span className={styles.urlText}>Локальный файл</span>
                    </>
                  ) : (
                    <>
                      <FaLink /> 
                      <span className={styles.urlText}>{movie.video_url?.substring(0, 50)}...</span>
                    </>
                  )}
                </div>
              </div>
              
              <div className={styles.movieActions}>
                <button 
                  className={`${styles.actionBtn} ${styles.toggleBtn}`}
                  onClick={() => handleToggle(movie.id)}
                  title={movie.is_active ? 'Скрыть' : 'Показать'}
                >
                  {movie.is_active ? <FaEye /> : <FaEyeSlash />}
                </button>
                <button 
                  className={`${styles.actionBtn} ${styles.editBtn}`}
                  onClick={() => openEditModal(movie)}
                  title="Редактировать"
                >
                  <FaEdit />
                </button>
                <button 
                  className={`${styles.actionBtn} ${styles.deleteBtn}`}
                  onClick={() => handleDelete(movie.id)}
                  title="Удалить"
                >
                  <FaTrash />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Модалка добавления/редактирования */}
      {showModal && (
        <div className={styles.modalOverlay} onClick={() => setShowModal(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>{editingMovie ? 'Редактировать фильм' : 'Добавить фильм'}</h2>
              <button className={styles.closeBtn} onClick={() => setShowModal(false)}>
                <FaTimes />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className={styles.form}>
              <div className={styles.formRow}>
                <div className={styles.coverUpload}>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleCoverChange}
                    id="coverInput"
                    className={styles.fileInput}
                  />
                  <label htmlFor="coverInput" className={styles.coverLabel}>
                    {coverPreview ? (
                      <img src={coverPreview} alt="Обложка" className={styles.coverPreview} />
                    ) : (
                      <div className={styles.coverPlaceholder}>
                        <FaImage />
                        <span>Загрузить обложку</span>
                      </div>
                    )}
                  </label>
                </div>
                
                <div className={styles.formFields}>
                  <div className={styles.formGroup}>
                    <label>Название *</label>
                    <input
                      type="text"
                      value={form.title}
                      onChange={(e) => setForm({...form, title: e.target.value})}
                      placeholder="Название фильма"
                      required
                    />
                  </div>
                  
                  {/* Переключатель источника видео */}
                  <div className={styles.videoSourceToggle}>
                    <button
                      type="button"
                      className={`${styles.sourceBtn} ${videoSource === 'file' ? styles.active : ''}`}
                      onClick={() => setVideoSource('file')}
                    >
                      <FaCloudUploadAlt /> Загрузить файл
                    </button>
                    <button
                      type="button"
                      className={`${styles.sourceBtn} ${videoSource === 'url' ? styles.active : ''}`}
                      onClick={() => setVideoSource('url')}
                    >
                      <FaLink /> По ссылке
                    </button>
                  </div>
                  
                  {videoSource === 'url' ? (
                    <div className={styles.formGroup}>
                      <label><FaLink /> Ссылка на видео (veedly.ru или embed) *</label>
                      <input
                        type="text"
                        value={form.video_url}
                        onChange={(e) => setForm({...form, video_url: e.target.value})}
                        placeholder="https://veedly.ru/embed/..."
                      />
                    </div>
                  ) : (
                    <div className={styles.formGroup}>
                      <label><FaVideo /> Видеофайл (mp4, webm, mkv и др.) *</label>
                      <div className={styles.videoUploadArea}>
                        <input
                          type="file"
                          accept="video/*"
                          onChange={handleVideoChange}
                          ref={videoInputRef}
                          id="videoInput"
                          className={styles.fileInput}
                        />
                        <label htmlFor="videoInput" className={styles.videoUploadLabel}>
                          {form.videoFile ? (
                            <div className={styles.selectedFile}>
                              <FaVideo />
                              <span>{form.videoFile.name}</span>
                              <small>{formatFileSize(form.videoFile.size)}</small>
                            </div>
                          ) : editingMovie?.video_file ? (
                            <div className={styles.selectedFile}>
                              <FaVideo />
                              <span>Текущий файл загружен</span>
                              <small>Выберите новый для замены</small>
                            </div>
                          ) : (
                            <div className={styles.uploadPlaceholder}>
                              <FaCloudUploadAlt />
                              <span>Нажмите или перетащите видео</span>
                              <small>Макс. 10GB</small>
                            </div>
                          )}
                        </label>
                      </div>
                      {saving && uploadProgress > 0 && (
                        <div className={styles.progressBar}>
                          <div 
                            className={styles.progressFill} 
                            style={{ width: `${uploadProgress}%` }}
                          />
                          <span>{uploadProgress}%</span>
                        </div>
                      )}
                    </div>
                  )}
                  
                  <div className={styles.formRowInline}>
                    <div className={styles.formGroup}>
                      <label>Год</label>
                      <input
                        type="number"
                        value={form.year}
                        onChange={(e) => setForm({...form, year: e.target.value})}
                        placeholder="2024"
                        min="1900"
                        max="2030"
                      />
                    </div>
                    
                    <div className={styles.formGroup}>
                      <label>Жанр</label>
                      <select
                        value={form.genre}
                        onChange={(e) => setForm({...form, genre: e.target.value})}
                      >
                        <option value="">Выберите жанр</option>
                        {genres.map(g => (
                          <option key={g} value={g}>{g}</option>
                        ))}
                      </select>
                    </div>
                    
                    <div className={styles.formGroup}>
                      <label>Длительность (мин)</label>
                      <input
                        type="number"
                        value={form.duration}
                        onChange={(e) => setForm({...form, duration: e.target.value})}
                        placeholder="120"
                        min="1"
                      />
                    </div>
                  </div>
                </div>
              </div>
              
              <div className={styles.formGroup}>
                <label>Описание</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({...form, description: e.target.value})}
                  placeholder="Краткое описание фильма..."
                  rows={3}
                />
              </div>
              
              <div className={styles.formActions}>
                <button type="button" className={styles.cancelBtn} onClick={() => setShowModal(false)}>
                  Отмена
                </button>
                <button type="submit" className={styles.submitBtn} disabled={saving}>
                  {saving ? 'Сохранение...' : (editingMovie ? 'Сохранить' : 'Добавить')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Модалка предпросмотра */}
      {previewMovie && (
        <div className={styles.previewOverlay} onClick={() => setPreviewMovie(null)}>
          <div className={styles.previewModal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.previewHeader}>
              <h2>{previewMovie.title}</h2>
              <button className={styles.closeBtn} onClick={() => setPreviewMovie(null)}>
                <FaTimes />
              </button>
            </div>
            <div className={styles.videoContainer}>
              {isLocalVideo(previewMovie) ? (
                <video
                  src={getVideoPlayUrl(previewMovie)}
                  controls
                  autoPlay
                  className={styles.videoPlayer}
                />
              ) : (
                <iframe
                  src={getEmbedUrl(previewMovie.video_url)}
                  title={previewMovie.title}
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className={styles.videoIframe}
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default MoviesManagement;
