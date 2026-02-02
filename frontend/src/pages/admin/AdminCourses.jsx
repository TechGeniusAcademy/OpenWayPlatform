import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FaPlus, FaBook, FaUsers, FaClock, FaEdit, FaTrash, 
  FaTimes, FaGraduationCap, FaVideo, FaSave, FaList,
  FaCoins, FaStar
} from 'react-icons/fa';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import api, { BASE_URL } from '../../utils/api';
import styles from './AdminCourses.module.css';

function AdminCourses() {
  const navigate = useNavigate();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingCourse, setEditingCourse] = useState(null);
  const [thumbnailFile, setThumbnailFile] = useState(null);
  const [thumbnailPreview, setThumbnailPreview] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    detailed_description: '',
    thumbnail_url: '',
    duration_hours: 0,
    difficulty_level: 'beginner',
    is_published: false,
    requirements: '',
    learning_outcomes: '',
    target_audience: '',
    instructor_name: '',
    category: '',
    language: 'Русский',
    certificate_available: false,
    required_level: 0,
    price: 0
  });

  useEffect(() => {
    loadCourses();
  }, []);

  const loadCourses = async () => {
    try {
      const response = await api.get('/courses');
      setCourses(response.data.courses || []);
    } catch (error) {
      console.error('Ошибка загрузки курсов:', error);
      alert('Не удалось загрузить курсы');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingCourse(null);
    setThumbnailFile(null);
    setThumbnailPreview('');
    setFormData({
      title: '',
      description: '',
      detailed_description: '',
      thumbnail_url: '',
      duration_hours: 0,
      difficulty_level: 'beginner',
      is_published: false,
      requirements: '',
      learning_outcomes: '',
      target_audience: '',
      instructor_name: '',
      category: '',
      language: 'Русский',
      certificate_available: false,
      required_level: 0,
      price: 0
    });
    setShowModal(true);
  };

  const handleEdit = (course) => {
    setEditingCourse(course);
    setThumbnailFile(null);
    setThumbnailPreview(course.thumbnail_url || '');
    setFormData({
      title: course.title || '',
      description: course.description || '',
      detailed_description: course.detailed_description || '',
      thumbnail_url: course.thumbnail_url || '',
      duration_hours: course.duration_hours || 0,
      difficulty_level: course.difficulty_level || 'beginner',
      is_published: course.is_published || false,
      requirements: course.requirements || '',
      learning_outcomes: course.learning_outcomes || '',
      target_audience: course.target_audience || '',
      instructor_name: course.instructor_name || '',
      category: course.category || '',
      language: course.language || 'Русский',
      certificate_available: course.certificate_available || false,
      required_level: course.required_level || 0,
      price: course.price || 0
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Вы уверены, что хотите удалить этот курс?')) return;

    try {
      await api.delete(`/courses/${id}`);
      alert('Курс удален');
      loadCourses();
    } catch (error) {
      console.error('Ошибка удаления курса:', error);
      alert('Не удалось удалить курс');
    }
  };

  const handleThumbnailChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setThumbnailFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setThumbnailPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const uploadThumbnail = async () => {
    if (!thumbnailFile) return formData.thumbnail_url;

    setUploadingImage(true);
    try {
      const formDataUpload = new FormData();
      formDataUpload.append('thumbnail', thumbnailFile);

      const response = await api.post('/courses/upload-thumbnail', formDataUpload, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      return response.data.thumbnail_url;
    } catch (error) {
      console.error('Ошибка загрузки изображения:', error);
      throw error;
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      let thumbnail_url = formData.thumbnail_url;

      // Загружаем новое изображение, если выбрано
      if (thumbnailFile) {
        thumbnail_url = await uploadThumbnail();
      }

      const dataToSend = {
        ...formData,
        thumbnail_url
      };

      if (editingCourse) {
        await api.put(`/courses/${editingCourse.id}`, dataToSend);
        alert('Курс обновлен');
      } else {
        await api.post('/courses', dataToSend);
        alert('Курс создан');
      }
      setShowModal(false);
      loadCourses();
    } catch (error) {
      console.error('Ошибка сохранения курса:', error);
      alert('Не удалось сохранить курс');
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleEditorChange = (content) => {
    setFormData(prev => ({ ...prev, detailed_description: content }));
  };

  if (loading) {
    return <div className={styles.coursesPage}>Загрузка...</div>;
  }

  return (
    <div className={styles.coursesPage}>
      <div className={styles.pageHeader}>
        <h1>Управление курсами</h1>
        <button className={styles.createButton} onClick={handleCreate}>
          <FaPlus /> Создать курс
        </button>
      </div>

      {courses.length === 0 ? (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>
            <FaGraduationCap />
          </div>
          <h3>Курсы не созданы</h3>
          <p>Создайте первый курс для учеников</p>
        </div>
      ) : (
        <div className={styles.coursesGrid}>
          {courses.map(course => (
            <div key={course.id} className={styles.courseCard}>
              <div className={styles.courseThumbnail}>
                {course.thumbnail_url ? (
                  <img src={`${BASE_URL}${course.thumbnail_url}`} alt={course.title} />
                ) : (
                  <FaBook />
                )}
              </div>
              <div className={styles.courseContent}>
                <div className={styles.courseHeader}>
                  <h3 className={styles.courseTitle}>{course.title}</h3>
                  <span className={`${styles.courseStatus} ${course.is_published ? styles.published : styles.draft}`}>
                    {course.is_published ? 'Опубликован' : 'Черновик'}
                  </span>
                </div>
                <p className={styles.courseDescription}>
                  {course.description}
                </p>
                <div className={styles.courseStats}>
                  <div className={styles.courseStat}>
                    <FaBook /> {course.lesson_count || 0} уроков
                  </div>
                  <div className={styles.courseStat}>
                    <FaUsers /> {course.enrolled_count || 0} учеников
                  </div>
                  <div className={styles.courseStat}>
                    <FaClock /> {course.duration_hours || 0}ч
                  </div>
                  {course.required_level > 0 && (
                    <div className={styles.courseStat} title="Требуемый уровень">
                      <FaStar /> {course.required_level} ур.
                    </div>
                  )}
                  {course.price > 0 && (
                    <div className={styles.courseStat} title="Цена">
                      <FaCoins /> {course.price}
                    </div>
                  )}
                </div>
                <div className={styles.courseActions}>
                  <button 
                    className={`${styles.actionButton} ${styles.manageButton}`}
                    onClick={() => navigate(`/admin/courses/${course.id}/lessons`)}
                  >
                    <FaList /> Управление уроками
                  </button>
                  <button 
                    className={`${styles.actionButton} ${styles.editButton}`}
                    onClick={() => handleEdit(course)}
                  >
                    <FaEdit /> Редактировать
                  </button>
                  <button 
                    className={`${styles.actionButton} ${styles.deleteButton}`}
                    onClick={() => handleDelete(course.id)}
                  >
                    <FaTrash /> Удалить
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className={styles.modal}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h2>{editingCourse ? 'Редактировать курс' : 'Создать курс'}</h2>
              <button className={styles.closeButton} onClick={() => setShowModal(false)}>
                <FaTimes />
              </button>
            </div>

            <form className={styles.form} onSubmit={handleSubmit}>
              <div className={styles.formGroup}>
                <label>Название курса *</label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  required
                  placeholder="Введите название курса"
                />
              </div>

              <div className={styles.formGroup}>
                <label>Краткое описание *</label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  required
                  placeholder="Краткое описание для карточки курса"
                />
              </div>

              <div className={styles.formGroup}>
                <label>Подробное описание</label>
                <div className={styles.editorWrapper}>
                  <ReactQuill
                    value={formData.detailed_description}
                    onChange={handleEditorChange}
                    modules={{
                      toolbar: [
                        [{ 'header': [1, 2, 3, false] }],
                        ['bold', 'italic', 'underline', 'strike'],
                        [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                        [{ 'color': [] }, { 'background': [] }],
                        ['link', 'image', 'video'],
                        ['clean']
                      ]
                    }}
                  />
                </div>
              </div>

              <div className={styles.formGroup}>
                <label>Требования и предварительные знания</label>
                <textarea
                  name="requirements"
                  value={formData.requirements}
                  onChange={handleChange}
                  placeholder="Что нужно знать перед началом курса"
                  rows="3"
                />
              </div>

              <div className={styles.formGroup}>
                <label>Чему вы научитесь</label>
                <textarea
                  name="learning_outcomes"
                  value={formData.learning_outcomes}
                  onChange={handleChange}
                  placeholder="Результаты обучения, навыки которые получит студент"
                  rows="4"
                />
              </div>

              <div className={styles.formGroup}>
                <label>Для кого этот курс</label>
                <textarea
                  name="target_audience"
                  value={formData.target_audience}
                  onChange={handleChange}
                  placeholder="Целевая аудитория курса"
                  rows="3"
                />
              </div>

              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label>Преподаватель</label>
                  <input
                    type="text"
                    name="instructor_name"
                    value={formData.instructor_name}
                    onChange={handleChange}
                    placeholder="Имя преподавателя"
                  />
                </div>

                <div className={styles.formGroup}>
                  <label>Категория</label>
                  <input
                    type="text"
                    name="category"
                    value={formData.category}
                    onChange={handleChange}
                    placeholder="Например: Программирование, Дизайн"
                  />
                </div>
              </div>

              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label>Язык курса</label>
                  <select
                    name="language"
                    value={formData.language}
                    onChange={handleChange}
                  >
                    <option value="Русский">Русский</option>
                    <option value="Английский">Английский</option>
                    <option value="Казахский">Казахский</option>
                  </select>
                </div>

                <div className={styles.formGroup}>
                  <div className={styles.checkboxGroup}>
                    <input
                      type="checkbox"
                      id="certificate_available"
                      name="certificate_available"
                      checked={formData.certificate_available}
                      onChange={handleChange}
                    />
                    <label htmlFor="certificate_available">Выдается сертификат</label>
                  </div>
                </div>
              </div>

              <div className={styles.formGroup}>
                <label>Изображение курса</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleThumbnailChange}
                  className={styles.fileInput}
                />
                {thumbnailPreview && (
                  <div className={styles.imagePreview}>
                    <img src={thumbnailPreview} alt="Preview" />
                  </div>
                )}
              </div>

              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label>Длительность (часов)</label>
                  <input
                    type="number"
                    name="duration_hours"
                    value={formData.duration_hours}
                    onChange={handleChange}
                    min="0"
                  />
                </div>

                <div className={styles.formGroup}>
                  <label>Уровень сложности</label>
                  <select
                    name="difficulty_level"
                    value={formData.difficulty_level}
                    onChange={handleChange}
                  >
                    <option value="beginner">Начальный</option>
                    <option value="intermediate">Средний</option>
                    <option value="advanced">Продвинутый</option>
                  </select>
                </div>
              </div>

              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label><FaStar style={{color: '#f39c12'}} /> Требуемый уровень</label>
                  <input
                    type="number"
                    name="required_level"
                    value={formData.required_level}
                    onChange={handleChange}
                    min="0"
                    placeholder="0 = без ограничений"
                  />
                  <small className={styles.fieldHint}>Минимальный уровень ученика для доступа (0 = для всех)</small>
                </div>

                <div className={styles.formGroup}>
                  <label><FaCoins style={{color: '#f1c40f'}} /> Цена в баллах</label>
                  <input
                    type="number"
                    name="price"
                    value={formData.price}
                    onChange={handleChange}
                    min="0"
                    placeholder="0 = бесплатно"
                  />
                  <small className={styles.fieldHint}>Стоимость курса в баллах (0 = бесплатный)</small>
                </div>
              </div>

              <div className={styles.formGroup}>
                <div className={styles.checkboxGroup}>
                  <input
                    type="checkbox"
                    id="is_published"
                    name="is_published"
                    checked={formData.is_published}
                    onChange={handleChange}
                  />
                  <label htmlFor="is_published">Опубликовать курс</label>
                </div>
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
                  disabled={uploadingImage}
                >
                  <FaSave /> {uploadingImage ? 'Загрузка...' : 'Сохранить'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminCourses;
