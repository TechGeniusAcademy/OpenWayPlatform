import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import Toast from 'react-native-toast-message';

export default function GroupScreen({ navigation }) {
  const { user, updateUser } = useAuth();
  const [groupInfo, setGroupInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [groupStats, setGroupStats] = useState({
    totalPoints: 0,
    totalProjects: 0,
    completedTasks: 0,
    averageLevel: 0
  });

  useEffect(() => {
    loadGroupInfo();
  }, []);

  const loadGroupInfo = async () => {
    try {
      // Сначала обновляем профиль, чтобы получить актуальный group_id
      const updatedUser = await updateUser();
      console.log('Updated user:', updatedUser);
      
      if (!updatedUser?.group_id) {
        setLoading(false);
        return;
      }

      const response = await api.getGroupById(updatedUser.group_id);
      console.log('Group response:', response);
      
      // Проверяем разные варианты структуры ответа
      const groupData = response?.data?.group || response?.group || response?.data || response;
      
      if (groupData && groupData.id) {
        setGroupInfo(groupData);
        calculateGroupStats(groupData);
      } else {
        throw new Error('Неверный формат данных группы');
      }
    } catch (error) {
      console.error('Ошибка загрузки группы:', error);
      Toast.show({
        type: 'error',
        text1: 'Ошибка',
        text2: error.response?.data?.error || 'Не удалось загрузить группу',
      });
    } finally {
      setLoading(false);
    }
  };

  const calculateGroupStats = (group) => {
    if (!group || !group.students || group.students.length === 0) {
      return;
    }

    const totalPoints = group.students.reduce((sum, student) => sum + (student.points || 0), 0);
    const totalProjects = group.students.length * 3;
    const completedTasks = group.students.length * 8;
    const averageLevel = Math.round(group.students.reduce((sum, student) => sum + (student.level || 1), 0) / group.students.length);

    setGroupStats({
      totalPoints,
      totalProjects,
      completedTasks,
      averageLevel
    });
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadGroupInfo();
    setRefreshing(false);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#667eea" />
      </View>
    );
  }

  if (!groupInfo) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Icon name="arrow-left" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Моя группа</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.emptyContainer}>
          <Icon name="account-group" size={64} color="#666" />
          <Text style={styles.emptyTitle}>Вы не состоите в группе</Text>
          <Text style={styles.emptyText}>Обратитесь к администратору для добавления в группу</Text>
        </View>
      </View>
    );
  }

  const sortedStudents = (groupInfo.students && groupInfo.students.length > 0) 
    ? [...groupInfo.students].sort((a, b) => (b.points || 0) - (a.points || 0))
    : [];
  const topStudent = sortedStudents[0];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-left" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{groupInfo.name}</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh}
            tintColor="#667eea"
          />
        }
      >
        {/* Статистика группы */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Icon name="chart-line" size={22} color="#667eea" />
            <Text style={styles.sectionTitle}>Статистика группы</Text>
          </View>
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <View style={[styles.statIcon, { backgroundColor: '#667eea' }]}>
                <Icon name="wallet" size={24} color="#fff" />
              </View>
              <Text style={styles.statValue}>{groupStats.totalPoints}</Text>
              <Text style={styles.statLabel}>Всего баллов</Text>
            </View>
            <View style={styles.statCard}>
              <View style={[styles.statIcon, { backgroundColor: '#f093fb' }]}>
                <Icon name="code-tags" size={24} color="#fff" />
              </View>
              <Text style={styles.statValue}>{groupStats.totalProjects}</Text>
              <Text style={styles.statLabel}>Проектов</Text>
            </View>
            <View style={styles.statCard}>
              <View style={[styles.statIcon, { backgroundColor: '#fa709a' }]}>
                <Icon name="check-circle" size={24} color="#fff" />
              </View>
              <Text style={styles.statValue}>{groupStats.completedTasks}</Text>
              <Text style={styles.statLabel}>Заданий</Text>
            </View>
            <View style={styles.statCard}>
              <View style={[styles.statIcon, { backgroundColor: '#4facfe' }]}>
                <Icon name="star" size={24} color="#fff" />
              </View>
              <Text style={styles.statValue}>{groupStats.averageLevel}</Text>
              <Text style={styles.statLabel}>Ср. уровень</Text>
            </View>
          </View>
        </View>

        {/* Лидер группы */}
        {topStudent ? (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Icon name="crown" size={22} color="#ffd700" />
              <Text style={styles.sectionTitle}>Лидер группы</Text>
            </View>
            <View style={styles.topStudentCard}>
              <View style={styles.topBadge}>
                <Icon name="medal" size={20} color="#ffd700" />
                <Text style={styles.topBadgeText}>#1</Text>
              </View>
              <View style={styles.topStudentAvatar}>
                <Text style={styles.topStudentAvatarText}>
                  {(topStudent.full_name || topStudent.username).charAt(0).toUpperCase()}
                </Text>
              </View>
              <Text style={styles.topStudentName}>{topStudent.full_name || topStudent.username}</Text>
              <View style={styles.topStudentPoints}>
                <Icon name="wallet" size={18} color="#ffd700" />
                <Text style={styles.topStudentPointsText}>{topStudent.points || 0} баллов</Text>
              </View>
            </View>
          </View>
        ) : null}

        {/* Информация о группе */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Icon name="information" size={22} color="#667eea" />
            <Text style={styles.sectionTitle}>Информация</Text>
          </View>
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Название:</Text>
              <Text style={styles.infoValue}>{groupInfo.name}</Text>
            </View>
            {groupInfo.description ? (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Описание:</Text>
                <Text style={styles.infoValue}>{groupInfo.description}</Text>
              </View>
            ) : null}
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Студентов:</Text>
              <Text style={styles.infoValue}>{groupInfo.students?.length || 0} человек</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Создана:</Text>
              <Text style={styles.infoValue}>
                {new Date(groupInfo.created_at).toLocaleDateString('ru-RU')}
              </Text>
            </View>
          </View>
        </View>

        {/* Список студентов */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Icon name="account-group" size={22} color="#667eea" />
            <Text style={styles.sectionTitle}>Студенты ({sortedStudents.length})</Text>
          </View>
          {sortedStudents.map((student, index) => (
            <View key={student.id} style={styles.studentCard}>
              <View style={styles.studentRank}>
                <Text style={styles.studentRankText}>#{index + 1}</Text>
              </View>
              <View style={styles.studentAvatar}>
                <Text style={styles.studentAvatarText}>
                  {(student.full_name || student.username).charAt(0).toUpperCase()}
                </Text>
              </View>
              <View style={styles.studentInfo}>
                <Text style={styles.studentName}>{student.full_name || student.username}</Text>
                <View style={styles.studentMeta}>
                  <Icon name="wallet" size={14} color="#667eea" />
                  <Text style={styles.studentPoints}>{student.points || 0} баллов</Text>
                </View>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 50,
    backgroundColor: '#1a1a2e',
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a3e',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  content: {
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 20,
    marginBottom: 10,
  },
  emptyText: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
  },
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
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statCard: {
    width: '48%',
    backgroundColor: '#1a1a2e',
    borderRadius: 15,
    padding: 15,
    alignItems: 'center',
    marginBottom: 10,
  },
  statIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#888',
  },
  topStudentCard: {
    backgroundColor: '#1a1a2e',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    position: 'relative',
  },
  topBadge: {
    position: 'absolute',
    top: 15,
    right: 15,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffd70020',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15,
  },
  topBadgeText: {
    color: '#ffd700',
    fontWeight: 'bold',
    marginLeft: 4,
  },
  topStudentAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#667eea',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
    borderWidth: 3,
    borderColor: '#ffd700',
  },
  topStudentAvatarText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
  },
  topStudentName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  topStudentPoints: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  topStudentPointsText: {
    fontSize: 16,
    color: '#ffd700',
    marginLeft: 6,
    fontWeight: '600',
  },
  infoCard: {
    backgroundColor: '#1a1a2e',
    borderRadius: 15,
    padding: 15,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a3e',
  },
  infoLabel: {
    fontSize: 14,
    color: '#888',
  },
  infoValue: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '600',
    flex: 1,
    textAlign: 'right',
  },
  studentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
  },
  studentRank: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#667eea20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  studentRankText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#667eea',
  },
  studentAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#43e97b',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  studentAvatarText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  studentInfo: {
    flex: 1,
  },
  studentName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  studentMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  studentPoints: {
    fontSize: 13,
    color: '#888',
    marginLeft: 4,
  },
});
