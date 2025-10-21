import { useState, useEffect } from 'react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import api from '../utils/api';
import './UpdatesManagement.css';
import { AiOutlineEdit, AiOutlineDelete, AiOutlinePlus, AiOutlineClose, AiOutlineCheck, AiOutlineEye, AiOutlineEyeInvisible } from 'react-icons/ai';

const QuillEditor = ({ value, onChange, modules, placeholder }) => {
  return (
    <ReactQuill
      theme="snow"
      value={value}
      onChange={onChange}
      modules={modules}
      placeholder={placeholder}
    />
  );
};

function UpdatesManagement() {
  const [updates, setUpdates] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingUpdate, setEditingUpdate] = useState(null);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    version: '',
    title: '',
    description: '',
    content: '',
    published: false
  });

  const quillModules = {
    toolbar: [
      [{ 'header': [1, 2, 3, false] }],
      ['bold', 'italic', 'underline', 'strike'],
      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
      [{ 'color': [] }, { 'background': [] }],
      ['link', 'code-block'],
      ['clean']
    ]
  };

  useEffect(() => {
    fetchUpdates();
  }, []);

  const fetchUpdates = async () => {
    try {
      const response = await api.get('/admin/updates');
      setUpdates(response.data.updates);
    } catch (error) {
      console.error('Ошибка загрузки обновлений:', error);
      alert('Ошибка загрузки обновлений');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (editingUpdate) {
        await api.put(`/admin/updates/${editingUpdate.id}`, formData);
        alert('Обновление успешно изменено!');
      } else {
        await api.post('/admin/updates', formData);
        alert('Обновление успешно создано!');
      }

      resetForm();
      fetchUpdates();
    } catch (error) {
      console.error('Ошибка сохранения:', error);
      alert(error.response?.data?.error || 'Ошибка сохранения обновления');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (update) => {
    setEditingUpdate(update);
    setFormData({
      version: update.version,
      title: update.title,
      description: update.description || '',
      content: update.content,
      published: update.published
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Вы уверены, что хотите удалить это обновление?')) {
      return;
    }

    try {
      await api.delete(`/admin/updates/${id}`);
      alert('Обновление удалено!');
      fetchUpdates();
    } catch (error) {
      console.error('Ошибка удаления:', error);
      alert('Ошибка удаления обновления');
    }
  };

  const resetForm = () => {
    setFormData({
      version: '',
      title: '',
      description: '',
      content: '',
      published: false
    });
    setEditingUpdate(null);
    setShowModal(false);
  };

  return (
    <div className="updates-management">
      <div className="page-header">
        <h1>Управление обновлениями</h1>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <AiOutlinePlus /> Добавить обновление
        </button>
      </div>

      <div className="updates-list">
        {updates.length === 0 ? (
          <div className="empty-state">
            <p>Обновления ещё не добавлены</p>
          </div>
        ) : (
          updates.map(update => (
            <div key={update.id} className="update-card">
              <div className="update-header">
                <div className="update-version-badge">{update.version}</div>
                <div className="update-status">
                  {update.published ? (
                    <span className="status-published"><AiOutlineEye /> Опубликовано</span>
                  ) : (
                    <span className="status-draft"><AiOutlineEyeInvisible /> Черновик</span>
                  )}
                </div>
              </div>
              <h3>{update.title}</h3>
              {update.description && <p className="update-description">{update.description}</p>}
              <div className="update-meta">
                <span className="update-date">
                  {new Date(update.created_at).toLocaleDateString('ru-RU')}
                </span>
              </div>
              <div className="update-actions">
                <button 
                  className="btn btn-edit" 
                  onClick={() => handleEdit(update)}
                >
                  <AiOutlineEdit /> Редактировать
                </button>
                <button 
                  className="btn btn-delete" 
                  onClick={() => handleDelete(update.id)}
                >
                  <AiOutlineDelete /> Удалить
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Модальное окно */}
      {showModal && (
        <div className="update-modal-overlay" onClick={resetForm}>
          <div className="update-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="update-modal-header">
              <h2>{editingUpdate ? 'Редактировать обновление' : 'Новое обновление'}</h2>
              <button className="update-modal-close" onClick={resetForm}>
                <AiOutlineClose />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="update-form-fields">
                <div className="form-row">
                  <div className="form-group">
                    <label>Версия *</label>
                    <input
                      type="text"
                      value={formData.version}
                      onChange={(e) => setFormData({ ...formData, version: e.target.value })}
                      placeholder="1.0.0"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={formData.published}
                        onChange={(e) => setFormData({ ...formData, published: e.target.checked })}
                      />
                      <span>Опубликовать</span>
                    </label>
                  </div>
                </div>

                <div className="form-group">
                  <label>Заголовок *</label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="Новые функции и улучшения"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Краткое описание</label>
                  <input
                    type="text"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Добавлены новые возможности..."
                  />
                </div>

                <div className="form-group quill-group">
                  <label>Содержание обновления *</label>
                  <div className="quill-wrapper">
                    <QuillEditor
                      value={formData.content}
                      onChange={(content) => setFormData({ ...formData, content })}
                      modules={quillModules}
                      placeholder="Подробное описание обновления..."
                    />
                  </div>
                </div>
              </div>

              <div className="update-modal-actions">
                <button type="button" className="btn btn-secondary" onClick={resetForm}>
                  Отмена
                </button>
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  {loading ? 'Сохранение...' : editingUpdate ? 'Сохранить' : 'Создать'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default UpdatesManagement;
