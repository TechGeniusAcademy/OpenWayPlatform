import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  FaPlus, FaArrowLeft, FaEdit, FaTrash, FaTimes, 
  FaClock, FaVideo, FaFileAlt, FaSave, FaBook, FaFolder, FaFolderPlus 
} from 'react-icons/fa';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import api from '../../utils/api';
import styles from './CourseLessons.module.css';

function CourseLessons() {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const [course, setCourse] = useState(null);
  const [lessons, setLessons] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [editingLesson, setEditingLesson] = useState(null);
  const [editingCategory, setEditingCategory] = useState(null);
  const [videoFile, setVideoFile] = useState(null);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [videoSource, setVideoSource] = useState('url'); // 'url' или 'file'
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    video_url: '',
    duration_minutes: 0,
    order_number: 0,
    category_id: '',
    timecodes: []
  });
  const [timecodeInput, setTimecodeInput] = useState({ time: '', title: '' });
  const [categoryFormData, setCategoryFormData] = useState({
    title: '',
    description: '',
    order_number: 0
  });

  useEffect(() => {
    loadCourse();
  }, [courseId]);

  const loadCourse = async () => {
    try {
      const response = await api.get(`/courses/${courseId}`);
      setCourse(response.data.course);
      setLessons(response.data.lessons || []);
      setCategories(response.data.categories || []);
    } catch (error) {
      console.error('Ошибка загрузки курса:', error);
      alert('Не удалось загрузить курс');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingLesson(null);
    setVideoFile(null);
    setVideoSource('url');
    setFormData({
      title: '',
      content: '',
      video_url: '',
      duration_minutes: 0,
      order_number: lessons.length + 1,
      category_id: '',
      timecodes: []
    });
    setTimecodeInput({ time: '', title: '' });
    setShowModal(true);
  };

  const handleEdit = (lesson) => {
    setEditingLesson(lesson);
    setVideoFile(null);
    setVideoSource(lesson.video_url ? 'url' : 'file');
    setFormData({
      title: lesson.title,
      content: lesson.content || '',
      video_url: lesson.video_url || '',
      duration_minutes: lesson.duration_minutes || 0,
      order_number: lesson.order_number || 0,
      category_id: lesson.category_id || '',
      timecodes: lesson.timecodes ? (typeof lesson.timecodes === 'string' ? JSON.parse(lesson.timecodes) : lesson.timecodes) : []
    });
    setTimecodeInput({ time: '', title: '' });
    setShowModal(true);
  };

  const handleVideoFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setVideoFile(file);
    }
  };

  const uploadVideo = async () => {
    if (!videoFile) return formData.video_url;

    setUploadingVideo(true);
    try {
      const formDataUpload = new FormData();
      formDataUpload.append('video', videoFile);

      const response = await api.post('/courses/upload-video', formDataUpload, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      return response.data.video_url;
    } catch (error) {
      console.error('Ошибка загрузки видео:', error);
      throw error;
    } finally {
      setUploadingVideo(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.title.trim()) {
      alert('Введите название урока');
      return;
    }

    try {
      let video_url = formData.video_url;

      // Загружаем видео файл, если выбран
      if (videoSource === 'file' && videoFile) {
        video_url = await uploadVideo();
      }

      const dataToSend = {
        ...formData,
        video_url,
        timecodes: JSON.stringify(formData.timecodes)
      };

      if (editingLesson) {
        await api.put(`/courses/${courseId}/lessons/${editingLesson.id}`, dataToSend);
        alert('Урок обновлен');
      } else {
        await api.post(`/courses/${courseId}/lessons`, dataToSend);
        alert('Урок создан');
      }
      setShowModal(false);
      loadCourse();
    } catch (error) {
      console.error('Ошибка сохранения урока:', error);
      alert('Не удалось сохранить урок');
    }
  };

  const handleDelete = async (lessonId) => {
    if (!window.confirm('Удалить этот урок?')) return;

    try {
      await api.delete(`/courses/${courseId}/lessons/${lessonId}`);
      alert('Урок удален');
      loadCourse();
    } catch (error) {
      console.error('Ошибка удаления урока:', error);
      alert('Не удалось удалить урок');
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'duration_minutes' || name === 'order_number' ? parseInt(value) || 0 : value
    }));
  };

  const handleEditorChange = (content) => {
    setFormData(prev => ({ ...prev, content }));
  };

  // Функции для работы с таймкодами
  const handleAddTimecode = () => {
    if (!timecodeInput.time || !timecodeInput.title) {
      alert('Заполните время и название таймкода');
      return;
    }
    
    // Проверка формата времени (mm:ss или hh:mm:ss)
    const timeRegex = /^(\d{1,2}:)?([0-5]?\d):([0-5]\d)$/;
    if (!timeRegex.test(timecodeInput.time)) {
      alert('Неверный формат времени. Используйте mm:ss или hh:mm:ss');
      return;
    }

    setFormData(prev => ({
      ...prev,
      timecodes: [...prev.timecodes, { ...timecodeInput }]
    }));
    setTimecodeInput({ time: '', title: '' });
  };

  const handleRemoveTimecode = (index) => {
    setFormData(prev => ({
      ...prev,
      timecodes: prev.timecodes.filter((_, i) => i !== index)
    }));
  };

  const handleTimecodeInputChange = (e) => {
    const { name, value } = e.target;
    setTimecodeInput(prev => ({ ...prev, [name]: value }));
  };

  // Функции для работы с категориями
  const handleCreateCategory = () => {
    setEditingCategory(null);
    setCategoryFormData({
      title: '',
      description: '',
      order_number: categories.length + 1
    });
    setShowCategoryModal(true);
  };

  const handleEditCategory = (category) => {
    setEditingCategory(category);
    setCategoryFormData({
      title: category.title,
      description: category.description || '',
      order_number: category.order_number || 0
    });
    setShowCategoryModal(true);
  };

  const handleCategoryChange = (e) => {
    const { name, value } = e.target;
    setCategoryFormData(prev => ({
      ...prev,
      [name]: name === 'order_number' ? parseInt(value) || 0 : value
    }));
  };

  const handleCategorySubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingCategory) {
        await api.put(`/courses/${courseId}/categories/${editingCategory.id}`, categoryFormData);
        alert('Категория обновлена');
      } else {
        await api.post(`/courses/${courseId}/categories`, categoryFormData);
        alert('Категория создана');
      }
      setShowCategoryModal(false);
      loadCourse();
    } catch (error) {
      console.error('Ошибка сохранения категории:', error);
      alert('Не удалось сохранить категорию');
    }
  };

  const handleDeleteCategory = async (categoryId) => {
    if (!window.confirm('Удалить эту категорию? Уроки не будут удалены.')) return;

    try {
      await api.delete(`/courses/${courseId}/categories/${categoryId}`);
      alert('Категория удалена');
      loadCourse();
    } catch (error) {
      console.error('Ошибка удаления категории:', error);
      alert('Не удалось удалить категорию');
    }
  };

  if (loading) {
    return <div className={styles.lessonsPage}>Загрузка...</div>;
  }

  if (!course) {
    return (
      <div className={styles.lessonsPage}>
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>
            <FaBook />
          </div>
          <h3>Курс не найден</h3>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.lessonsPage}>
      <div className={styles.pageHeader}>
        <div className={styles.headerLeft}>
          <button 
            className={styles.backButton} 
            onClick={() => navigate('/admin/courses')}
          >
            <FaArrowLeft /> Назад к курсам
          </button>
          <h1>Управление уроками</h1>
          <p className={styles.courseTitle}>{course.title}</p>
        </div>
        <div className={styles.headerActions}>
          <button className={styles.categoryButton} onClick={handleCreateCategory}>
            <FaFolderPlus /> Создать категорию
          </button>
          <button className={styles.createButton} onClick={handleCreate}>
            <FaPlus /> Добавить урок
          </button>
        </div>
      </div>

      {categories.length > 0 && (
        <div className={styles.categoriesSection}>
          <h2><FaFolder /> Категории уроков</h2>
          <div className={styles.categoriesList}>
            {categories.map((category) => (
              <div key={category.id} className={styles.categoryCard}>
                <div className={styles.categoryInfo}>
                  <h3>{category.title}</h3>
                  {category.description && <p>{category.description}</p>}
                  <span className={styles.categoryMeta}>
                    Уроков: {lessons.filter(l => l.category_id === category.id).length}
                  </span>
                </div>
                <div className={styles.categoryActions}>
                  <button onClick={() => handleEditCategory(category)}>
                    <FaEdit />
                  </button>
                  <button onClick={() => handleDeleteCategory(category.id)}>
                    <FaTrash />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {lessons.length === 0 ? (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>
            <FaFileAlt />
          </div>
          <h3>Уроки не созданы</h3>
          <p>Добавьте первый урок к этому курсу</p>
        </div>
      ) : (
        <div className={styles.lessonsList}>
          {lessons.map((lesson, index) => (
            <div key={lesson.id} className={styles.lessonCard}>
              <div className={styles.lessonNumber}>{index + 1}</div>
              <div className={styles.lessonContent}>
                <h3 className={styles.lessonTitle}>{lesson.title}</h3>
                <div className={styles.lessonMeta}>
                  {lesson.duration_minutes > 0 && (
                    <span>
                      <FaClock /> {lesson.duration_minutes} мин
                    </span>
                  )}
                  {lesson.video_url && (
                    <span>
                      <FaVideo /> Видео
                    </span>
                  )}
                  <span>
                    <FaFileAlt /> Порядок: {lesson.order_number}
                  </span>
                </div>
              </div>
              <div className={styles.lessonActions}>
                <button 
                  className={`${styles.actionButton} ${styles.editButton}`}
                  onClick={() => handleEdit(lesson)}
                >
                  <FaEdit /> Редактировать
                </button>
                <button 
                  className={`${styles.actionButton} ${styles.deleteButton}`}
                  onClick={() => handleDelete(lesson.id)}
                >
                  <FaTrash /> Удалить
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className={styles.modal}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h2>{editingLesson ? 'Редактировать урок' : 'Добавить урок'}</h2>
              <button className={styles.closeButton} onClick={() => setShowModal(false)}>
                <FaTimes />
              </button>
            </div>

            <form className={styles.form} onSubmit={handleSubmit}>
              <div className={styles.formGroup}>
                <label>Название урока *</label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  placeholder="Введите название урока"
                  required
                />
              </div>

              {categories.length > 0 && (
                <div className={styles.formGroup}>
                  <label>Категория</label>
                  <select
                    name="category_id"
                    value={formData.category_id}
                    onChange={handleChange}
                  >
                    <option value="">Без категории</option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.title}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className={styles.formGroup}>
                <label>Содержание урока</label>
                <div className={styles.editorWrapper}>
                  <ReactQuill
                    value={formData.content}
                    onChange={handleEditorChange}
                    modules={{
                      toolbar: [
                        [{ header: [1, 2, 3, false] }],
                        ['bold', 'italic', 'underline', 'strike'],
                        [{ list: 'ordered' }, { list: 'bullet' }],
                        ['blockquote', 'code-block'],
                        ['link', 'image', 'video'],
                        [{ color: [] }, { background: [] }],
                        ['clean']
                      ]
                    }}
                  />
                </div>
              </div>

              <div className={styles.formGroup}>
                <label>Видео урока</label>
                <div className={styles.videoSourceSelector}>
                  <label className={styles.radioLabel}>
                    <input
                      type="radio"
                      value="url"
                      checked={videoSource === 'url'}
                      onChange={(e) => setVideoSource(e.target.value)}
                    />
                    Ссылка на видео (YouTube, Vimeo)
                  </label>
                  <label className={styles.radioLabel}>
                    <input
                      type="radio"
                      value="file"
                      checked={videoSource === 'file'}
                      onChange={(e) => setVideoSource(e.target.value)}
                    />
                    Загрузить видео файл
                  </label>
                </div>

                {videoSource === 'url' ? (
                  <input
                    type="url"
                    name="video_url"
                    value={formData.video_url}
                    onChange={handleChange}
                    placeholder="https://youtube.com/watch?v=..."
                    className={styles.input}
                  />
                ) : (
                  <div>
                    <input
                      type="file"
                      accept="video/*"
                      onChange={handleVideoFileChange}
                      className={styles.fileInput}
                    />
                    {videoFile && (
                      <p className={styles.fileName}>Выбран файл: {videoFile.name}</p>
                    )}
                  </div>
                )}
              </div>

              <div className={styles.formGroup}>
                <label>Длительность (минуты)</label>
                <input
                  type="number"
                  name="duration_minutes"
                  value={formData.duration_minutes}
                  onChange={handleChange}
                  min="0"
                />
              </div>

              <div className={styles.formGroup}>
                <label>Таймкоды (временные метки для видео)</label>
                <div className={styles.timecodeInputGroup}>
                  <input
                    type="text"
                    name="time"
                    value={timecodeInput.time}
                    onChange={handleTimecodeInputChange}
                    placeholder="00:00 или 00:00:00"
                    className={styles.timecodeTime}
                  />
                  <input
                    type="text"
                    name="title"
                    value={timecodeInput.title}
                    onChange={handleTimecodeInputChange}
                    placeholder="Название раздела"
                    className={styles.timecodeTitle}
                  />
                  <button 
                    type="button" 
                    onClick={handleAddTimecode}
                    className={styles.addTimecodeButton}
                  >
                    <FaPlus /> Добавить
                  </button>
                </div>
                
                {formData.timecodes.length > 0 && (
                  <div className={styles.timecodesList}>
                    {formData.timecodes.map((tc, index) => (
                      <div key={index} className={styles.timecodeItem}>
                        <span className={styles.timecodeTime}>{tc.time}</span>
                        <span className={styles.timecodeItemTitle}>{tc.title}</span>
                        <button 
                          type="button" 
                          onClick={() => handleRemoveTimecode(index)}
                          className={styles.removeTimecodeButton}
                        >
                          <FaTrash />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className={styles.formGroup}>
                <label>Порядковый номер</label>
                <input
                  type="number"
                  name="order_number"
                  value={formData.order_number}
                  onChange={handleChange}
                  min="1"
                />
              </div>

              <div className={styles.formActions}>
                <button 
                  type="button" 
                  className={styles.cancelButton}
                  onClick={() => setShowModal(false)}
                >
                  Отмена
                </button>
                <button 
                  type="submit" 
                  className={styles.submitButton}
                  disabled={uploadingVideo}
                >
                  <FaSave /> {uploadingVideo ? 'Загрузка видео...' : 'Сохранить'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showCategoryModal && (
        <div className={styles.modal}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h2>{editingCategory ? 'Редактировать категорию' : 'Создать категорию'}</h2>
              <button className={styles.closeButton} onClick={() => setShowCategoryModal(false)}>
                <FaTimes />
              </button>
            </div>

            <form className={styles.form} onSubmit={handleCategorySubmit}>
              <div className={styles.formGroup}>
                <label>Название категории *</label>
                <input
                  type="text"
                  name="title"
                  value={categoryFormData.title}
                  onChange={handleCategoryChange}
                  placeholder="Например: Базовый HTML"
                  required
                />
              </div>

              <div className={styles.formGroup}>
                <label>Описание</label>
                <textarea
                  name="description"
                  value={categoryFormData.description}
                  onChange={handleCategoryChange}
                  placeholder="Краткое описание категории"
                  rows="3"
                />
              </div>

              <div className={styles.formGroup}>
                <label>Порядок отображения</label>
                <input
                  type="number"
                  name="order_number"
                  value={categoryFormData.order_number}
                  onChange={handleCategoryChange}
                  min="0"
                />
              </div>

              <div className={styles.formActions}>
                <button 
                  type="button" 
                  className={styles.cancelButton}
                  onClick={() => setShowCategoryModal(false)}
                >
                  Отмена
                </button>
                <button 
                  type="submit" 
                  className={styles.submitButton}
                >
                  <FaSave /> Сохранить
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default CourseLessons;