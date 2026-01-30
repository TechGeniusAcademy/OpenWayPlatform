import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  Modal,
  TextInput,
} from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import Toast from 'react-native-toast-message';
import GroupScreen from './GroupScreen';
import TopScreen from './TopScreen';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

// Главный экран
function HomeScreen() {
  const { user } = useAuth();
  const [dashboardData, setDashboardData] = useState({
    points: 0,
    groupStatus: 'Нет группы',
    testsCompleted: 0,
    homeworksCompleted: 0,
    activeDays: 0,
  });
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      // Загружаем баллы
      const pointsData = await api.getPoints();
      
      // Загружаем профиль для группы
      const profileResponse = await api.getProfile();
      const profile = profileResponse.user || profileResponse;
      
      // Обновляем данные
      setDashboardData({
        points: pointsData.totalPoints || profile.points || user?.points || 0,
        groupStatus: profile.group_id ? 'В группе' : 'Нет группы',
        testsCompleted: pointsData.history?.filter(h => h.reason?.includes('тест')).length || 0,
        homeworksCompleted: pointsData.history?.filter(h => h.reason?.includes('домашн')).length || 0,
        activeDays: 7, // Заглушка
      });
    } catch (error) {
      console.error('Ошибка загрузки данных:', error);
      Toast.show({
        type: 'error',
        text1: 'Ошибка',
        text2: 'Не удалось загрузить данные',
      });
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
  };

  const quickActions = [
    { icon: 'code-tags', label: 'Проекты', color: '#667eea' },
    { icon: 'message-text', label: 'Чат', color: '#764ba2' },
    { icon: 'shopping', label: 'Магазин', color: '#f093fb' },
    { icon: 'gamepad-variant', label: 'Игры', color: '#4facfe' },
    { icon: 'book-open-variant', label: 'База знаний', color: '#43e97b' },
    { icon: 'keyboard', label: 'Тренажёр', color: '#fa709a' },
  ];

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#667eea" />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl 
          refreshing={refreshing} 
          onRefresh={onRefresh}
          tintColor="#667eea"
        />
      }
    >
      {/* Заголовок */}
      <View style={styles.header}>
        <Text style={styles.greeting}>Привет, {user?.full_name || user?.username}! 👋</Text>
        <Text style={styles.subtitle}>Добро пожаловать в OpenWay</Text>
      </View>

      {/* Статистика */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Icon name="wallet" size={28} color="#667eea" />
          <Text style={styles.statValue}>{dashboardData.points}</Text>
          <Text style={styles.statLabel}>Мои баллы</Text>
        </View>
        <View style={styles.statCard}>
          <Icon name="account-group" size={28} color="#43e97b" />
          <Text style={styles.statValue}>{dashboardData.groupStatus}</Text>
          <Text style={styles.statLabel}>Статус</Text>
        </View>
        <View style={styles.statCard}>
          <Icon name="flash" size={28} color="#ffd93d" />
          <Text style={styles.statValue}>42</Text>
          <Text style={styles.statLabel}>Уровень</Text>
        </View>
      </View>

      {/* Быстрые действия */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Icon name="flash" size={22} color="#667eea" />
          <Text style={styles.sectionTitle}>Быстрые действия</Text>
        </View>
        <View style={styles.quickActionsGrid}>
          {quickActions.map((action, index) => (
            <TouchableOpacity 
              key={index} 
              style={styles.quickActionCard}
              activeOpacity={0.7}
            >
              <View style={[styles.quickActionIcon, { backgroundColor: action.color + '20' }]}>
                <Icon name={action.icon} size={28} color={action.color} />
              </View>
              <Text style={styles.quickActionLabel}>{action.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Активность */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Icon name="fire" size={22} color="#ff6b6b" />
          <Text style={styles.sectionTitle}>Твоя активность</Text>
        </View>
        <View style={styles.activityContainer}>
          <ActivityItem 
            icon="check-circle" 
            text="Выполнено заданий" 
            count={dashboardData.testsCompleted + dashboardData.homeworksCompleted}
            color="#43e97b"
          />
          <ActivityItem 
            icon="trophy" 
            text="Получено наград" 
            count={3}
            color="#feca57"
          />
          <ActivityItem 
            icon="fire" 
            text="Дней подряд" 
            count={dashboardData.activeDays}
            color="#ff6b6b"
          />
        </View>
      </View>

      {/* События */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Icon name="calendar" size={22} color="#667eea" />
          <Text style={styles.sectionTitle}>Сегодня</Text>
        </View>
        <View style={styles.eventsContainer}>
          <EventItem time="10:00" title="Лекция по JavaScript" type="lecture" />
          <EventItem time="14:30" title="Дедлайн проекта" type="deadline" />
          <EventItem time="16:00" title="Тестирование" type="test" />
        </View>
      </View>
    </ScrollView>
  );
}

function ActivityItem({ icon, text, count, color }) {
  return (
    <View style={styles.activityItem}>
      <Icon name={icon} size={24} color={color} />
      <View style={styles.activityContent}>
        <Text style={styles.activityText}>{text}</Text>
        <Text style={[styles.activityCount, { color }]}>{count}</Text>
      </View>
    </View>
  );
}

function EventItem({ time, title, type }) {
  const getTypeColor = () => {
    switch(type) {
      case 'lecture': return '#667eea';
      case 'deadline': return '#ff6b6b';
      case 'test': return '#feca57';
      default: return '#666';
    }
  };

  const getTypeLabel = () => {
    switch(type) {
      case 'lecture': return 'Лекция';
      case 'deadline': return 'Дедлайн';
      case 'test': return 'Тест';
      default: return '';
    }
  };

  return (
    <View style={styles.eventItem}>
      <Text style={styles.eventTime}>{time}</Text>
      <View style={styles.eventContent}>
        <Text style={styles.eventTitle}>{title}</Text>
        <View style={[styles.eventBadge, { backgroundColor: getTypeColor() + '20' }]}>
          <Text style={[styles.eventType, { color: getTypeColor() }]}>{getTypeLabel()}</Text>
        </View>
      </View>
    </View>
  );
}

// Экран тестов
function TestsScreen() {
  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTests();
  }, []);

  const loadTests = async () => {
    try {
      const data = await api.getTests();
      setTests(data);
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Ошибка',
        text2: 'Не удалось загрузить тесты',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.pageTitle}>Доступные тесты</Text>
      {loading ? (
        <Text style={styles.loadingText}>Загрузка...</Text>
      ) : tests.length === 0 ? (
        <Text style={styles.emptyText}>Нет доступных тестов</Text>
      ) : (
        tests.map((test) => (
          <TouchableOpacity key={test.id} style={styles.card}>
            <Text style={styles.cardTitle}>{test.title}</Text>
            <Text style={styles.cardDescription}>{test.description}</Text>
            <View style={styles.cardFooter}>
              <Icon name="timer" size={16} color="#888" />
              <Text style={styles.cardMeta}>{test.time_limit} мин</Text>
              <Icon name="help-circle" size={16} color="#888" style={{ marginLeft: 15 }} />
              <Text style={styles.cardMeta}>{test.questions_count} вопросов</Text>
            </View>
          </TouchableOpacity>
        ))
      )}
    </ScrollView>
  );
}

// Экран чата
function ChatScreen() {
  const { user } = useAuth();
  const [chats, setChats] = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadChats();
  }, []);

  useEffect(() => {
    if (activeChat) {
      loadMessages(activeChat.id);
    }
  }, [activeChat]);

  const loadChats = async () => {
    try {
      const data = await api.getChats();
      setChats(data.chats || []);
    } catch (error) {
      console.error('Ошибка загрузки чатов:', error);
      Toast.show({
        type: 'error',
        text1: 'Ошибка',
        text2: 'Не удалось загрузить чаты',
      });
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async (chatId) => {
    try {
      const data = await api.getMessages(chatId);
      setMessages(data.messages || []);
      // Отмечаем сообщения как прочитанные
      await api.markAsRead(chatId);
    } catch (error) {
      console.error('Ошибка загрузки сообщений:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    if (activeChat) {
      await loadMessages(activeChat.id);
    } else {
      await loadChats();
    }
    setRefreshing(false);
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !activeChat) return;

    const messageText = newMessage.trim();
    setNewMessage('');
    setSending(true);

    try {
      await api.sendMessage(activeChat.id, messageText);
      // Перезагружаем сообщения
      await loadMessages(activeChat.id);
      Toast.show({
        type: 'success',
        text1: 'Сообщение отправлено',
      });
    } catch (error) {
      console.error('Ошибка отправки:', error);
      Toast.show({
        type: 'error',
        text1: 'Ошибка',
        text2: 'Не удалось отправить сообщение',
      });
      setNewMessage(messageText);
    } finally {
      setSending(false);
    }
  };

  // Список чатов
  if (!activeChat) {
    if (loading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#667eea" />
        </View>
      );
    }

    if (chats.length === 0) {
      return (
        <View style={styles.centerContainer}>
          <Icon name="message-text-outline" size={64} color="#666" />
          <Text style={styles.comingSoon}>Нет доступных чатов</Text>
          <Text style={styles.emptyText}>Вступите в группу для доступа к чату</Text>
        </View>
      );
    }

    return (
      <View style={styles.container}>
        <View style={styles.chatHeader}>
          <Text style={styles.chatHeaderTitle}>Мои чаты</Text>
        </View>
        <ScrollView
          style={styles.chatList}
          refreshControl={
            <RefreshControl 
              refreshing={refreshing} 
              onRefresh={onRefresh}
              tintColor="#667eea"
            />
          }
        >
          {chats.map((chat) => (
            <TouchableOpacity
              key={chat.id}
              style={styles.chatItem}
              onPress={() => setActiveChat(chat)}
            >
              <View style={styles.chatAvatar}>
                <Icon name="account-group" size={28} color="#667eea" />
              </View>
              <View style={styles.chatInfo}>
                <View style={styles.chatTopRow}>
                  <Text style={styles.chatName}>{chat.name || 'Чат группы'}</Text>
                  {chat.last_message && (
                    <Text style={styles.chatTime}>
                      {new Date(chat.last_message.created_at).toLocaleTimeString('ru-RU', { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                    </Text>
                  )}
                </View>
                <View style={styles.chatBottomRow}>
                  <Text style={styles.chatLastMessage} numberOfLines={1}>
                    {chat.last_message 
                      ? `${chat.last_message.sender_name}: ${chat.last_message.content}`
                      : 'Нет сообщений'
                    }
                  </Text>
                  {chat.unread_count > 0 && (
                    <View style={styles.chatBadge}>
                      <Text style={styles.chatBadgeText}>{chat.unread_count}</Text>
                    </View>
                  )}
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    );
  }

  // Экран сообщений
  return (
    <View style={styles.container}>
      {/* Заголовок чата */}
      <View style={styles.chatHeader}>
        <TouchableOpacity onPress={() => setActiveChat(null)}>
          <Icon name="arrow-left" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.chatHeaderTitle}>{activeChat.name || 'Чат'}</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Сообщения */}
      <ScrollView
        style={styles.messagesContainer}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh}
            tintColor="#667eea"
          />
        }
      >
        {messages.length === 0 ? (
          <View style={styles.emptyMessages}>
            <Icon name="message-text-outline" size={48} color="#666" />
            <Text style={styles.emptyText}>Нет сообщений</Text>
          </View>
        ) : (
          messages.map((message) => {
            const isMyMessage = message.sender_id === user.id;
            return (
              <View
                key={message.id}
                style={[
                  styles.messageItem,
                  isMyMessage ? styles.myMessage : styles.otherMessage
                ]}
              >
                {!isMyMessage && (
                  <Text style={styles.messageSender}>{message.sender_name}</Text>
                )}
                <View style={[
                  styles.messageBubble,
                  isMyMessage ? styles.myMessageBubble : styles.otherMessageBubble
                ]}>
                  <Text style={styles.messageText}>{message.content}</Text>
                </View>
                <Text style={styles.messageTime}>
                  {new Date(message.created_at).toLocaleTimeString('ru-RU', {
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </Text>
              </View>
            );
          })
        )}
      </ScrollView>

      {/* Поле ввода */}
      <View style={styles.messageInputContainer}>
        <TextInput
          style={styles.messageInput}
          placeholder="Введите сообщение..."
          placeholderTextColor="#666"
          value={newMessage}
          onChangeText={setNewMessage}
          multiline
          maxLength={1000}
        />
        <TouchableOpacity
          style={[styles.sendButton, (!newMessage.trim() || sending) && styles.sendButtonDisabled]}
          onPress={handleSendMessage}
          disabled={!newMessage.trim() || sending}
        >
          {sending ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Icon name="send" size={20} color="#fff" />
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

// Экран меню
function MenuScreen({ navigation }) {
  const [modalVisible, setModalVisible] = useState(true);

  useEffect(() => {
    // Открываем модалку при входе на экран
    const unsubscribe = navigation.addListener('focus', () => {
      setModalVisible(true);
    });

    return unsubscribe;
  }, [navigation]);

  const handleClose = () => {
    setModalVisible(false);
    // Возвращаемся на главную
    navigation.navigate('Home');
  };

  const menuItems = [
    // Обучение
    { icon: 'school', label: 'Курсы', color: '#667eea', category: 'learning' },
    { icon: 'book-open-variant', label: 'База знаний', color: '#43e97b', category: 'learning' },
    { icon: 'file-document-edit', label: 'Тесты', color: '#feca57', category: 'learning' },
    { icon: 'home-variant', label: 'Домашние задания', color: '#ff6b6b', category: 'learning' },
    { icon: 'keyboard', label: 'Тренажёр клавиатуры', color: '#fa709a', category: 'learning' },
    
    // Программирование
    { icon: 'folder-multiple', label: 'Мои проекты', color: '#667eea', category: 'coding' },
    { icon: 'database', label: 'Базы данных', color: '#4facfe', category: 'coding' },
    { icon: 'puzzle', label: 'Плагины', color: '#a18cd1', category: 'coding' },
    { icon: 'palette', label: 'Темы', color: '#f093fb', category: 'coding' },
    { icon: 'pen', label: 'Дизайн', color: '#fad0c4', category: 'coding' },
    { icon: 'file-document', label: 'Тех. задания', color: '#ffecd2', category: 'coding' },
    
    // Социальное
    { icon: 'account-group', label: 'Моя группа', color: '#667eea', category: 'social' },
    { icon: 'trophy', label: 'Топы', color: '#ffd700', category: 'social' },
    
    // Развлечения
    { icon: 'gamepad-variant', label: 'Игры', color: '#4facfe', category: 'fun' },
    { icon: 'shopping', label: 'Косметика', color: '#f093fb', category: 'fun' },
    
    // Бизнес
    { icon: 'briefcase', label: 'Бизнес', color: '#667eea', category: 'business' },
  ];

  return (
    <View style={styles.centerContainer}>
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={handleClose}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Все разделы</Text>
              <TouchableOpacity onPress={handleClose}>
                <Icon name="close" size={28} color="#fff" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScroll}>
              {/* Обучение */}
              <Text style={styles.modalCategoryTitle}>Обучение</Text>
              <View style={styles.menuGrid}>
                {menuItems.filter(item => item.category === 'learning').map((item, index) => (
                  <TouchableOpacity 
                    key={index} 
                    style={styles.menuGridItem}
                    onPress={() => {
                      handleClose();
                      Toast.show({
                        type: 'info',
                        text1: item.label,
                        text2: 'Скоро будет доступно',
                      });
                    }}
                  >
                    <View style={[styles.menuGridIcon, { backgroundColor: item.color }]}>
                      <Icon name={item.icon} size={28} color="#fff" />
                    </View>
                    <Text style={styles.menuGridLabel}>{item.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Программирование */}
              <Text style={styles.modalCategoryTitle}>Программирование</Text>
              <View style={styles.menuGrid}>
                {menuItems.filter(item => item.category === 'coding').map((item, index) => (
                  <TouchableOpacity 
                    key={index} 
                    style={styles.menuGridItem}
                    onPress={() => {
                      handleClose();
                      Toast.show({
                        type: 'info',
                        text1: item.label,
                        text2: 'Скоро будет доступно',
                      });
                    }}
                  >
                    <View style={[styles.menuGridIcon, { backgroundColor: item.color }]}>
                      <Icon name={item.icon} size={28} color="#fff" />
                    </View>
                    <Text style={styles.menuGridLabel}>{item.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Социальное */}
              <Text style={styles.modalCategoryTitle}>Социальное</Text>
              <View style={styles.menuGrid}>
                {menuItems.filter(item => item.category === 'social').map((item, index) => (
                  <TouchableOpacity 
                    key={index} 
                    style={styles.menuGridItem}
                    onPress={() => {
                      handleClose();
                      if (item.label === 'Моя группа') {
                        navigation.navigate('Group');
                      } else if (item.label === 'Топы') {
                        navigation.navigate('Top');
                      } else {
                        Toast.show({
                          type: 'info',
                          text1: item.label,
                          text2: 'Скоро будет доступно',
                        });
                      }
                    }}
                  >
                    <View style={[styles.menuGridIcon, { backgroundColor: item.color }]}>
                      <Icon name={item.icon} size={28} color="#fff" />
                    </View>
                    <Text style={styles.menuGridLabel}>{item.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Развлечения */}
              <Text style={styles.modalCategoryTitle}>Развлечения</Text>
              <View style={styles.menuGrid}>
                {menuItems.filter(item => item.category === 'fun').map((item, index) => (
                  <TouchableOpacity 
                    key={index} 
                    style={styles.menuGridItem}
                    onPress={() => {
                      handleClose();
                      Toast.show({
                        type: 'info',
                        text1: item.label,
                        text2: 'Скоро будет доступно',
                      });
                    }}
                  >
                    <View style={[styles.menuGridIcon, { backgroundColor: item.color }]}>
                      <Icon name={item.icon} size={28} color="#fff" />
                    </View>
                    <Text style={styles.menuGridLabel}>{item.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Бизнес */}
              <Text style={styles.modalCategoryTitle}>Бизнес</Text>
              <View style={styles.menuGrid}>
                {menuItems.filter(item => item.category === 'business').map((item, index) => (
                  <TouchableOpacity 
                    key={index} 
                    style={styles.menuGridItem}
                    onPress={() => {
                      handleClose();
                      Toast.show({
                        type: 'info',
                        text1: item.label,
                        text2: 'Скоро будет доступно',
                      });
                    }}
                  >
                    <View style={[styles.menuGridIcon, { backgroundColor: item.color }]}>
                      <Icon name={item.icon} size={28} color="#fff" />
                    </View>
                    <Text style={styles.menuGridLabel}>{item.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// Экран профиля
function ProfileScreen({ navigation }) {
  const { user, logout } = useAuth();
  const [userPoints, setUserPoints] = useState(0);
  const [userStats, setUserStats] = useState({
    completedTasks: 0,
    totalProjects: 0,
    streak: 0,
    rank: 0
  });
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadProfileData();
  }, []);

  const loadProfileData = async () => {
    try {
      const pointsData = await api.getPoints();
      setUserPoints(pointsData.totalPoints || user?.points || 0);
      
      // Моковые данные статистики (позже заменить на реальные API)
      setUserStats({
        completedTasks: 42,
        totalProjects: 15,
        streak: 7,
        rank: 5
      });
    } catch (error) {
      console.error('Ошибка загрузки данных:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadProfileData();
    setRefreshing(false);
  };

  const handleLogout = async () => {
    await logout();
    navigation.replace('Login');
  };

  const achievements = [
    { icon: 'crown', title: 'Первый проект', description: 'Создал первый проект', color: '#ffd700', earned: true },
    { icon: 'medal', title: 'Мастер кода', description: 'Написал 1000 строк кода', color: '#c0c0c0', earned: true },
    { icon: 'diamond', title: 'Неделя подряд', description: 'Учился 7 дней подряд', color: '#00bcd4', earned: true },
    { icon: 'star', title: 'Звезда группы', description: 'Стал первым в группе', color: '#ff6b6b', earned: false },
    { icon: 'trophy', title: 'Покоритель вершин', description: 'Завершил 50 заданий', color: '#4caf50', earned: false },
    { icon: 'flash', title: 'Скоростник', description: 'Выполнил задание за 5 минут', color: '#ffeb3b', earned: false },
  ];

  const recentActivity = [
    { type: 'project', title: 'Создал проект "ToDo App"', date: '2 часа назад', icon: 'code-tags' },
    { type: 'achievement', title: 'Получил достижение', date: '5 часов назад', icon: 'trophy' },
    { type: 'points', title: 'Заработал 50 баллов', date: '1 день назад', icon: 'wallet' },
    { type: 'task', title: 'Выполнил задание по JS', date: '2 дня назад', icon: 'check-circle' },
  ];

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl 
          refreshing={refreshing} 
          onRefresh={onRefresh}
          tintColor="#667eea"
        />
      }
    >
      {/* Заголовок с баллами */}
      <View style={styles.profileHeaderTop}>
        <Text style={styles.profileTitle}>Мой профиль</Text>
        <View style={styles.profilePoints}>
          <Icon name="wallet" size={20} color="#ffd700" />
          <Text style={styles.profilePointsValue}>{userPoints}</Text>
        </View>
      </View>

      {/* Аватар и основная информация */}
      <View style={styles.profileCard}>
        <View style={styles.profileBanner}>
          <View style={styles.avatarWrapper}>
            <View style={styles.profileAvatar}>
              <Text style={styles.profileAvatarText}>
                {(user?.full_name || user?.username || 'U').charAt(0).toUpperCase()}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.profileInfoSection}>
          <Text style={styles.profileUsername}>{user?.username}</Text>
          <Text style={styles.profileEmail}>{user?.email}</Text>
          
          <View style={styles.profileInfoGrid}>
            <View style={styles.profileInfoItem}>
              <Text style={styles.profileInfoLabel}>ФИО</Text>
              <Text style={styles.profileInfoValue}>{user?.full_name || 'Не указано'}</Text>
            </View>
            <View style={styles.profileInfoItem}>
              <Text style={styles.profileInfoLabel}>Роль</Text>
              <Text style={styles.profileInfoValue}>Ученик</Text>
            </View>
            <View style={styles.profileInfoItem}>
              <Text style={styles.profileInfoLabel}>Регистрация</Text>
              <Text style={styles.profileInfoValue}>
                {user?.created_at ? new Date(user.created_at).toLocaleDateString('ru-RU') : '-'}
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* Статистика */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Icon name="chart-line" size={22} color="#667eea" />
          <Text style={styles.sectionTitle}>Моя статистика</Text>
        </View>
        <View style={styles.statsProfileGrid}>
          <View style={styles.statProfileCard}>
            <View style={[styles.statProfileIcon, { backgroundColor: '#667eea' }]}>
              <Icon name="check-circle" size={24} color="#fff" />
            </View>
            <Text style={styles.statProfileValue}>{userStats.completedTasks}</Text>
            <Text style={styles.statProfileLabel}>Заданий</Text>
          </View>
          <View style={styles.statProfileCard}>
            <View style={[styles.statProfileIcon, { backgroundColor: '#f093fb' }]}>
              <Icon name="code-tags" size={24} color="#fff" />
            </View>
            <Text style={styles.statProfileValue}>{userStats.totalProjects}</Text>
            <Text style={styles.statProfileLabel}>Проектов</Text>
          </View>
          <View style={styles.statProfileCard}>
            <View style={[styles.statProfileIcon, { backgroundColor: '#fa709a' }]}>
              <Icon name="fire" size={24} color="#fff" />
            </View>
            <Text style={styles.statProfileValue}>{userStats.streak}</Text>
            <Text style={styles.statProfileLabel}>Дней подряд</Text>
          </View>
          <View style={styles.statProfileCard}>
            <View style={[styles.statProfileIcon, { backgroundColor: '#ffd89b' }]}>
              <Icon name="trophy-variant" size={24} color="#fff" />
            </View>
            <Text style={styles.statProfileValue}>#{userStats.rank}</Text>
            <Text style={styles.statProfileLabel}>Рейтинг</Text>
          </View>
        </View>
      </View>

      {/* Достижения */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Icon name="trophy" size={22} color="#ffd700" />
          <Text style={styles.sectionTitle}>Достижения</Text>
        </View>
        <View style={styles.achievementsGrid}>
          {achievements.map((achievement, index) => (
            <View 
              key={index} 
              style={[
                styles.achievementCard,
                !achievement.earned && styles.achievementLocked
              ]}
            >
              <View style={styles.achievementIconWrapper}>
                <Icon 
                  name={achievement.icon} 
                  size={28} 
                  color={achievement.earned ? achievement.color : '#444'}
                />
                {achievement.earned && (
                  <View style={styles.achievementBadge}>
                    <Icon name="check" size={12} color="#fff" />
                  </View>
                )}
              </View>
              <Text style={[
                styles.achievementTitle,
                !achievement.earned && styles.achievementTitleLocked
              ]}>
                {achievement.title}
              </Text>
              <Text style={styles.achievementDescription}>
                {achievement.description}
              </Text>
            </View>
          ))}
        </View>
      </View>

      {/* Последняя активность */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Icon name="calendar" size={22} color="#667eea" />
          <Text style={styles.sectionTitle}>Последняя активность</Text>
        </View>
        <View style={styles.activityTimeline}>
          {recentActivity.map((activity, index) => (
            <View key={index} style={styles.activityTimelineItem}>
              <View style={styles.activityIconCircle}>
                <Icon name={activity.icon} size={18} color="#667eea" />
              </View>
              <View style={styles.activityTimelineContent}>
                <Text style={styles.activityTimelineTitle}>{activity.title}</Text>
                <Text style={styles.activityTimelineDate}>{activity.date}</Text>
              </View>
            </View>
          ))}
        </View>
      </View>

      {/* Действия */}
      <View style={styles.section}>
        <TouchableOpacity style={styles.menuItem}>
          <Icon name="account-edit" size={24} color="#667eea" />
          <Text style={styles.menuText}>Редактировать профиль</Text>
          <Icon name="chevron-right" size={24} color="#666" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem}>
          <Icon name="history" size={24} color="#667eea" />
          <Text style={styles.menuText}>История баллов</Text>
          <Icon name="chevron-right" size={24} color="#666" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem}>
          <Icon name="cog" size={24} color="#667eea" />
          <Text style={styles.menuText}>Настройки</Text>
          <Icon name="chevron-right" size={24} color="#666" />
        </TouchableOpacity>

        <TouchableOpacity style={[styles.menuItem, styles.logoutItem]} onPress={handleLogout}>
          <Icon name="logout" size={24} color="#ff6b6b" />
          <Text style={[styles.menuText, styles.logoutText]}>Выйти</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

// Главный компонент Dashboard
// Stack Navigator для добавления экрана группы
function MenuStackNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="MenuMain" component={MenuScreen} />
      <Stack.Screen name="Group" component={GroupScreen} />
      <Stack.Screen name="Top" component={TopScreen} />
    </Stack.Navigator>
  );
}

export default function StudentDashboard() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: '#667eea',
        tabBarInactiveTintColor: '#666',
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarLabel: 'Главная',
          tabBarIcon: ({ color, size }) => (
            <Icon name="home" color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarLabel: 'Профиль',
          tabBarIcon: ({ color, size }) => (
            <Icon name="account" color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="Chat"
        component={ChatScreen}
        options={{
          tabBarLabel: 'Чат',
          tabBarIcon: ({ color, size }) => (
            <Icon name="message" color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="Menu"
        component={MenuStackNavigator}
        options={{
          tabBarLabel: 'Меню',
          tabBarIcon: ({ color, size }) => (
            <Icon name="menu" color={color} size={size} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f1e',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#0f0f1e',
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerContainer: {
    flex: 1,
    backgroundColor: '#0f0f1e',
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    padding: 20,
    paddingTop: 50,
    paddingBottom: 15,
  },
  greeting: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 14,
    color: '#888',
  },
  
  // Статистика
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 15,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#1a1a2e',
    borderRadius: 15,
    padding: 15,
    marginHorizontal: 5,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 8,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 11,
    color: '#888',
    textAlign: 'center',
  },
  
  // Секции
  section: {
    padding: 20,
    paddingTop: 10,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginLeft: 8,
  },
  
  // Быстрые действия
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  quickActionCard: {
    width: '31%',
    backgroundColor: '#1a1a2e',
    borderRadius: 15,
    padding: 15,
    alignItems: 'center',
    marginBottom: 10,
  },
  quickActionIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  quickActionLabel: {
    fontSize: 11,
    color: '#fff',
    textAlign: 'center',
    fontWeight: '600',
  },
  
  // Активность
  activityContainer: {
    backgroundColor: '#1a1a2e',
    borderRadius: 15,
    padding: 15,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a3e',
  },
  activityContent: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginLeft: 15,
  },
  activityText: {
    fontSize: 14,
    color: '#ddd',
  },
  activityCount: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  
  // События
  eventsContainer: {
    backgroundColor: '#1a1a2e',
    borderRadius: 15,
    padding: 15,
  },
  eventItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a3e',
  },
  eventTime: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#667eea',
    width: 60,
  },
  eventContent: {
    flex: 1,
    marginLeft: 10,
  },
  eventTitle: {
    fontSize: 14,
    color: '#fff',
    marginBottom: 4,
  },
  eventBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 5,
    alignSelf: 'flex-start',
  },
  eventType: {
    fontSize: 11,
    fontWeight: '600',
  },

  // Старые стили для других экранов
  pointsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a2e',
    padding: 10,
    borderRadius: 10,
    alignSelf: 'flex-start',
  },
  points: {
    fontSize: 18,
    color: '#fff',
    marginLeft: 8,
    fontWeight: 'bold',
  },
  quickActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  actionCard: {
    width: '48%',
    backgroundColor: '#1a1a2e',
    borderRadius: 15,
    padding: 20,
    alignItems: 'center',
    marginBottom: 15,
    borderWidth: 2,
  },
  actionTitle: {
    color: '#fff',
    marginTop: 10,
    fontSize: 14,
    fontWeight: '600',
  },
  pageTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    padding: 20,
    paddingBottom: 10,
  },
  card: {
    backgroundColor: '#1a1a2e',
    borderRadius: 15,
    padding: 20,
    marginHorizontal: 20,
    marginBottom: 15,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  cardDescription: {
    fontSize: 14,
    color: '#888',
    marginBottom: 12,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardMeta: {
    fontSize: 12,
    color: '#888',
    marginLeft: 5,
  },
  loadingText: {
    color: '#888',
    textAlign: 'center',
    marginTop: 50,
  },
  emptyText: {
    color: '#666',
    textAlign: 'center',
    marginTop: 50,
    fontSize: 16,
  },
  comingSoon: {
    color: '#666',
    fontSize: 18,
    marginTop: 20,
  },
  
  // Профиль - новые стили
  profileHeaderTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 50,
    paddingBottom: 15,
  },
  profileTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  profilePoints: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a2e',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  profilePointsValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    marginLeft: 6,
  },
  profileCard: {
    backgroundColor: '#1a1a2e',
    marginHorizontal: 20,
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 20,
  },
  profileBanner: {
    height: 120,
    backgroundColor: '#667eea',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingBottom: 0,
  },
  avatarWrapper: {
    marginBottom: -40,
  },
  profileAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#43e97b',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: '#1a1a2e',
  },
  profileAvatarText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
  },
  profileInfoSection: {
    padding: 20,
    paddingTop: 50,
    alignItems: 'center',
  },
  profileUsername: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 14,
    color: '#888',
    marginBottom: 20,
  },
  profileInfoGrid: {
    width: '100%',
    marginTop: 10,
  },
  profileInfoItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a3e',
  },
  profileInfoLabel: {
    fontSize: 14,
    color: '#888',
  },
  profileInfoValue: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '600',
  },
  
  // Статистика профиля
  statsProfileGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statProfileCard: {
    width: '48%',
    backgroundColor: '#1a1a2e',
    borderRadius: 15,
    padding: 15,
    alignItems: 'center',
    marginBottom: 10,
  },
  statProfileIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  statProfileValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  statProfileLabel: {
    fontSize: 12,
    color: '#888',
  },
  
  // Достижения
  achievementsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  achievementCard: {
    width: '48%',
    backgroundColor: '#1a1a2e',
    borderRadius: 15,
    padding: 15,
    alignItems: 'center',
    marginBottom: 10,
  },
  achievementLocked: {
    opacity: 0.5,
  },
  achievementIconWrapper: {
    position: 'relative',
    marginBottom: 10,
  },
  achievementBadge: {
    position: 'absolute',
    top: -5,
    right: -5,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#43e97b',
    justifyContent: 'center',
    alignItems: 'center',
  },
  achievementTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
    textAlign: 'center',
  },
  achievementTitleLocked: {
    color: '#666',
  },
  achievementDescription: {
    fontSize: 11,
    color: '#888',
    textAlign: 'center',
  },
  
  // Таймлайн активности
  activityTimeline: {
    backgroundColor: '#1a1a2e',
    borderRadius: 15,
    padding: 15,
  },
  activityTimelineItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a3e',
  },
  activityIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#667eea20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  activityTimelineContent: {
    flex: 1,
    marginLeft: 12,
  },
  activityTimelineTitle: {
    fontSize: 14,
    color: '#fff',
    marginBottom: 4,
  },
  activityTimelineDate: {
    fontSize: 12,
    color: '#888',
  },
  
  // Старые стили профиля (для совместимости)
  profileHeader: {
    alignItems: 'center',
    padding: 30,
    paddingTop: 40,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#667eea',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
  },
  avatarText: {
    fontSize: 40,
    fontWeight: 'bold',
    color: '#fff',
  },
  profileName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 5,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a2e',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
  },
  menuText: {
    flex: 1,
    fontSize: 16,
    color: '#fff',
    marginLeft: 15,
  },
  logoutItem: {
    marginTop: 10,
  },
  logoutText: {
    color: '#ff6b6b',
  },
  
  // Меню модальное окно
  menuButton: {
    alignItems: 'center',
  },
  menuButtonText: {
    color: '#fff',
    fontSize: 16,
    marginTop: 10,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#1a1a2e',
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    maxHeight: '85%',
    paddingBottom: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a3e',
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
  },
  modalScroll: {
    padding: 20,
  },
  modalCategoryTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#888',
    textTransform: 'uppercase',
    marginTop: 15,
    marginBottom: 12,
    letterSpacing: 1,
  },
  menuGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  menuGridItem: {
    width: '31%',
    alignItems: 'center',
    marginBottom: 15,
  },
  menuGridIcon: {
    width: 60,
    height: 60,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  menuGridLabel: {
    fontSize: 11,
    color: '#fff',
    textAlign: 'center',
    lineHeight: 14,
  },
  
  // Чат
  chatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 50,
    backgroundColor: '#1a1a2e',
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a3e',
  },
  chatHeaderTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  chatList: {
    flex: 1,
  },
  chatItem: {
    flexDirection: 'row',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a3e',
    alignItems: 'center',
  },
  chatAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#667eea20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  chatInfo: {
    flex: 1,
  },
  chatTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  chatName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  chatTime: {
    fontSize: 12,
    color: '#888',
  },
  chatBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  chatLastMessage: {
    flex: 1,
    fontSize: 14,
    color: '#888',
  },
  chatBadge: {
    backgroundColor: '#667eea',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
    marginLeft: 8,
  },
  chatBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
  },
  
  // Сообщения
  messagesContainer: {
    flex: 1,
    padding: 15,
  },
  emptyMessages: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 100,
  },
  messageItem: {
    marginBottom: 12,
  },
  myMessage: {
    alignItems: 'flex-end',
  },
  otherMessage: {
    alignItems: 'flex-start',
  },
  messageSender: {
    fontSize: 12,
    color: '#888',
    marginBottom: 4,
    marginLeft: 8,
  },
  messageBubble: {
    maxWidth: '75%',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 18,
  },
  myMessageBubble: {
    backgroundColor: '#667eea',
  },
  otherMessageBubble: {
    backgroundColor: '#1a1a2e',
  },
  messageText: {
    color: '#fff',
    fontSize: 15,
    lineHeight: 20,
  },
  messageTime: {
    fontSize: 11,
    color: '#666',
    marginTop: 4,
    marginHorizontal: 8,
  },
  
  // Поле ввода
  messageInputContainer: {
    flexDirection: 'row',
    padding: 10,
    backgroundColor: '#1a1a2e',
    borderTopWidth: 1,
    borderTopColor: '#2a2a3e',
    alignItems: 'flex-end',
  },
  messageInput: {
    flex: 1,
    backgroundColor: '#0f0f1e',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 10,
    color: '#fff',
    fontSize: 15,
    maxHeight: 100,
    marginRight: 10,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#667eea',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#444',
  },
  
  tabBar: {
    backgroundColor: '#1a1a2e',
    borderTopColor: '#2a2a3e',
    borderTopWidth: 1,
    paddingBottom: 5,
    paddingTop: 5,
    height: 60,
  },
});
