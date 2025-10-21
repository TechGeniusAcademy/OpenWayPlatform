import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import api, { BASE_URL } from '../../utils/api';
import '../../styles/UsernameStyles.css';
import { AiOutlineWallet } from 'react-icons/ai';

function StudentGroup() {
  const { user } = useAuth();
  const [groupInfo, setGroupInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [cosmetics, setCosmetics] = useState({ frames: [], banners: [] });

  useEffect(() => {
    loadGroupInfo();
    loadCosmetics();
  }, [user]);

  const loadCosmetics = async () => {
    try {
      const [framesRes, bannersRes] = await Promise.all([
        api.get('/shop/items?type=frame'),
        api.get('/shop/items?type=banner')
      ]);
      setCosmetics({
        frames: framesRes.data.items,
        banners: bannersRes.data.items
      });
    } catch (error) {
      console.error('Ошибка загрузки косметики:', error);
    }
  };

  const loadGroupInfo = async () => {
    if (!user?.group_id) {
      setLoading(false);
      return;
    }

    try {
      const response = await api.get(`/groups/${user.group_id}`);
      setGroupInfo(response.data.group);
    } catch (error) {
      console.error('Ошибка загрузки информации о группе:', error);
    } finally {
      setLoading(false);
    }
  };

  const getFrameImage = (frameKey) => {
    if (!frameKey || frameKey === 'none') return null;
    const frame = cosmetics.frames.find(f => f.item_key === frameKey);
    return frame?.image_url ? `${BASE_URL}${frame.image_url}` : null;
  };

  const getBannerImage = (bannerKey) => {
    if (!bannerKey || bannerKey === 'default') return null;
    const banner = cosmetics.banners.find(b => b.item_key === bannerKey);
    return banner?.image_url ? `${BASE_URL}${banner.image_url}` : null;
  };

  if (loading) {
    return (
      <div className="student-page">
        <div className="page-header">
          <h1>Моя группа</h1>
          <p>Загрузка...</p>
        </div>
      </div>
    );
  }

  if (!groupInfo) {
    return (
      <div className="student-page">
        <div className="page-header">
          <h1>Моя группа</h1>
          <p>Информация о вашей группе</p>
        </div>

        <div className="empty-state">
          <div className="empty-state-icon">👥</div>
          <h3>Вы не состоите в группе</h3>
          <p>Обратитесь к администратору для добавления в группу</p>
        </div>
      </div>
    );
  }

  return (
    <div className="student-page">
      <div className="page-header">
        <h1>Моя группа: {groupInfo.name}</h1>
        <p>Информация о вашей группе</p>
      </div>

      <div className="group-info-card">
        <div className="group-info-section">
          <h3>Информация о группе</h3>
          <div className="profile-info-grid">
            <div className="info-row">
              <span className="info-label">Название:</span>
              <span className="info-value">{groupInfo.name}</span>
            </div>
            {groupInfo.description && (
              <div className="info-row">
                <span className="info-label">Описание:</span>
                <span className="info-value">{groupInfo.description}</span>
              </div>
            )}
            <div className="info-row">
              <span className="info-label">Количество студентов:</span>
              <span className="info-value">{groupInfo.students?.length || 0} человек</span>
            </div>
            <div className="info-row">
              <span className="info-label">Дата создания:</span>
              <span className="info-value">
                {new Date(groupInfo.created_at).toLocaleDateString('ru-RU')}
              </span>
            </div>
          </div>
        </div>

        {groupInfo.students && groupInfo.students.length > 0 && (
          <div className="group-info-section">
            <h3>Студенты группы</h3>
            <div className="students-list">
              {groupInfo.students.map((student) => {
                const frameImage = getFrameImage(student.avatar_frame);
                const bannerImage = getBannerImage(student.profile_banner);
                const defaultBanner = student.profile_banner === 'default' 
                  ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                  : 'rgba(0, 0, 0, 0.05)';

                return (
                  <div 
                    key={student.id} 
                    className="student-list-item"
                    style={{
                      backgroundImage: bannerImage 
                        ? `url(${bannerImage})` 
                        : defaultBanner,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                      position: 'relative',
                      overflow: 'hidden'
                    }}
                  >
                    {(bannerImage || student.profile_banner === 'default') && (
                      <div className="student-item-overlay"></div>
                    )}
                    
                    <div className="student-avatar-wrapper">
                      <div className="student-avatar">
                        {student.avatar_url ? (
                          <img src={`${BASE_URL}${student.avatar_url}`} alt={student.username} />
                        ) : (
                          (student.full_name || student.username).charAt(0).toUpperCase()
                        )}
                      </div>
                      {frameImage && (
                        <img 
                          src={frameImage}
                          alt="Frame"
                          className="student-avatar-frame"
                        />
                      )}
                    </div>
                    
                    <div className="student-info">
                      <strong className={`styled-username ${student.username_style || 'username-none'}`}>
                        {student.full_name || student.username}
                      </strong>
                      <small>{student.email}</small>
                      <div className="student-points"><AiOutlineWallet className="points-inline" /> {student.points || 0} баллов</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default StudentGroup;
