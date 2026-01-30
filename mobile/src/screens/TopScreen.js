import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import api from '../services/api';
import Toast from 'react-native-toast-message';

export default function TopScreen({ navigation }) {
  const [activeTab, setActiveTab] = useState('students');
  const [topStudents, setTopStudents] = useState([]);
  const [topGroups, setTopGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadLeaderboards();
  }, []);

  const loadLeaderboards = async () => {
    try {
      const [studentsRes, groupsRes] = await Promise.all([
        api.getTopStudents(),
        api.getTopGroups()
      ]);
      
      console.log('Students response:', studentsRes);
      console.log('Groups response:', groupsRes);
      
      // Проверяем разные варианты структуры ответа
      const students = studentsRes?.data?.students || studentsRes?.students || studentsRes?.data || [];
      const groups = groupsRes?.data?.groups || groupsRes?.groups || groupsRes?.data || [];
      
      setTopStudents(Array.isArray(students) ? students : []);
      setTopGroups(Array.isArray(groups) ? groups : []);
    } catch (error) {
      console.error('Ошибка загрузки рейтингов:', error);
      Toast.show({
        type: 'error',
        text1: 'Ошибка',
        text2: 'Не удалось загрузить рейтинги',
      });
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadLeaderboards();
    setRefreshing(false);
  };

  const getMedalIcon = (position) => {
    if (position === 1) return { name: 'crown', color: '#FFD700', size: 28 };
    if (position === 2) return { name: 'medal', color: '#C0C0C0', size: 26 };
    if (position === 3) return { name: 'medal', color: '#CD7F32', size: 24 };
    return null;
  };

  const filteredStudents = topStudents.filter(student => {
    const name = (student.full_name || student.username || '').toLowerCase();
    const group = (student.group_name || '').toLowerCase();
    const query = searchQuery.toLowerCase();
    return name.includes(query) || group.includes(query);
  });

  const filteredGroups = topGroups.filter(group => {
    const name = (group.name || '').toLowerCase();
    return name.includes(searchQuery.toLowerCase());
  });

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Icon name="arrow-left" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Топы</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#667eea" />
        </View>
      </View>
    );
  }

  const renderTopThree = () => {
    if (filteredStudents.length < 3) return null;

    return (
      <View style={styles.podiumContainer}>
        {/* 2 место */}
        <View style={[styles.podiumPlace, styles.secondPlace]}>
          <View style={styles.podiumMedal}>
            <Icon name="medal" size={32} color="#C0C0C0" />
          </View>
          <View style={styles.podiumAvatar}>
            <Text style={styles.podiumAvatarText}>
              {(filteredStudents[1].full_name || filteredStudents[1].username).charAt(0).toUpperCase()}
            </Text>
          </View>
          <Text style={styles.podiumName} numberOfLines={1}>
            {filteredStudents[1].full_name || filteredStudents[1].username}
          </Text>
          <Text style={styles.podiumPoints}>{filteredStudents[1].points}</Text>
          <View style={[styles.podiumBase, styles.secondBase]}>
            <Text style={styles.podiumRank}>2</Text>
          </View>
        </View>

        {/* 1 место */}
        <View style={[styles.podiumPlace, styles.firstPlace]}>
          <View style={styles.podiumMedal}>
            <Icon name="crown" size={36} color="#FFD700" />
          </View>
          <View style={[styles.podiumAvatar, styles.firstAvatar]}>
            <Text style={styles.podiumAvatarText}>
              {(filteredStudents[0].full_name || filteredStudents[0].username).charAt(0).toUpperCase()}
            </Text>
          </View>
          <Text style={styles.podiumName} numberOfLines={1}>
            {filteredStudents[0].full_name || filteredStudents[0].username}
          </Text>
          <Text style={[styles.podiumPoints, styles.firstPoints]}>{filteredStudents[0].points}</Text>
          <View style={[styles.podiumBase, styles.firstBase]}>
            <Text style={styles.podiumRank}>1</Text>
          </View>
        </View>

        {/* 3 место */}
        <View style={[styles.podiumPlace, styles.thirdPlace]}>
          <View style={styles.podiumMedal}>
            <Icon name="medal" size={28} color="#CD7F32" />
          </View>
          <View style={styles.podiumAvatar}>
            <Text style={styles.podiumAvatarText}>
              {(filteredStudents[2].full_name || filteredStudents[2].username).charAt(0).toUpperCase()}
            </Text>
          </View>
          <Text style={styles.podiumName} numberOfLines={1}>
            {filteredStudents[2].full_name || filteredStudents[2].username}
          </Text>
          <Text style={styles.podiumPoints}>{filteredStudents[2].points}</Text>
          <View style={[styles.podiumBase, styles.thirdBase]}>
            <Text style={styles.podiumRank}>3</Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-left" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Топы</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Поиск */}
      <View style={styles.searchContainer}>
        <Icon name="magnify" size={20} color="#888" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Поиск..."
          placeholderTextColor="#888"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Табы */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'students' && styles.activeTab]}
          onPress={() => setActiveTab('students')}
        >
          <Icon name="school" size={20} color={activeTab === 'students' ? '#667eea' : '#888'} />
          <Text style={[styles.tabText, activeTab === 'students' && styles.activeTabText]}>
            Ученики
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'groups' && styles.activeTab]}
          onPress={() => setActiveTab('groups')}
        >
          <Icon name="account-group" size={20} color={activeTab === 'groups' ? '#667eea' : '#888'} />
          <Text style={[styles.tabText, activeTab === 'groups' && styles.activeTabText]}>
            Группы
          </Text>
        </TouchableOpacity>
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
        {activeTab === 'students' ? (
          <>
            {renderTopThree()}
            
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Icon name="format-list-numbered" size={22} color="#667eea" />
                <Text style={styles.sectionTitle}>
                  Полный рейтинг ({filteredStudents.length})
                </Text>
              </View>
              
              {filteredStudents.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <Icon name="magnify" size={48} color="#666" />
                  <Text style={styles.emptyText}>Студенты не найдены</Text>
                </View>
              ) : (
                filteredStudents.map((student, index) => {
                  const medal = getMedalIcon(index + 1);
                  return (
                    <View key={student.id} style={[
                      styles.listItem,
                      index < 3 && styles.topThreeItem
                    ]}>
                      <View style={styles.rankContainer}>
                        {medal ? (
                          <Icon name={medal.name} size={medal.size} color={medal.color} />
                        ) : (
                          <Text style={styles.rankText}>#{index + 1}</Text>
                        )}
                      </View>
                      <View style={styles.studentAvatar}>
                        <Text style={styles.studentAvatarText}>
                          {(student.full_name || student.username).charAt(0).toUpperCase()}
                        </Text>
                      </View>
                      <View style={styles.studentInfo}>
                        <Text style={styles.studentName}>
                          {student.full_name || student.username}
                        </Text>
                        <Text style={styles.studentGroup}>
                          {student.group_name || 'Без группы'}
                        </Text>
                      </View>
                      <View style={styles.pointsContainer}>
                        <Text style={styles.pointsValue}>{student.points}</Text>
                        <Text style={styles.pointsLabel}>баллов</Text>
                      </View>
                    </View>
                  );
                })
              )}
            </View>
          </>
        ) : (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Icon name="account-group" size={22} color="#667eea" />
              <Text style={styles.sectionTitle}>
                Топ групп ({filteredGroups.length})
              </Text>
            </View>
            
            {filteredGroups.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Icon name="magnify" size={48} color="#666" />
                <Text style={styles.emptyText}>Группы не найдены</Text>
              </View>
            ) : (
              filteredGroups.map((group, index) => {
                const medal = getMedalIcon(index + 1);
                return (
                  <View key={group.id} style={[
                    styles.listItem,
                    index < 3 && styles.topThreeItem
                  ]}>
                    <View style={styles.rankContainer}>
                      {medal ? (
                        <Icon name={medal.name} size={medal.size} color={medal.color} />
                      ) : (
                        <Text style={styles.rankText}>#{index + 1}</Text>
                      )}
                    </View>
                    <View style={styles.groupIcon}>
                      <Icon name="account-group" size={24} color="#667eea" />
                    </View>
                    <View style={styles.groupInfo}>
                      <Text style={styles.groupName}>{group.name}</Text>
                      <View style={styles.groupStats}>
                        <Text style={styles.groupStat}>
                          <Icon name="account" size={12} /> {group.student_count} студ.
                        </Text>
                        <Text style={styles.groupStat}>
                          Ср: {group.average_points}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.pointsContainer}>
                      <Text style={styles.pointsValue}>{group.total_points}</Text>
                      <Text style={styles.pointsLabel}>всего</Text>
                    </View>
                  </View>
                );
              })
            )}
          </View>
        )}
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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a2e',
    margin: 15,
    marginBottom: 10,
    padding: 12,
    borderRadius: 12,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    color: '#fff',
    fontSize: 14,
  },
  tabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 15,
    marginBottom: 10,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    backgroundColor: '#1a1a2e',
    borderRadius: 10,
    marginHorizontal: 5,
  },
  activeTab: {
    backgroundColor: '#667eea20',
  },
  tabText: {
    color: '#888',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  activeTabText: {
    color: '#667eea',
  },
  content: {
    flex: 1,
  },
  podiumContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-end',
    paddingHorizontal: 15,
    paddingVertical: 20,
    marginBottom: 10,
  },
  podiumPlace: {
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 5,
  },
  firstPlace: {
    marginBottom: 0,
  },
  secondPlace: {
    marginBottom: 20,
  },
  thirdPlace: {
    marginBottom: 30,
  },
  podiumMedal: {
    marginBottom: 10,
  },
  podiumAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#43e97b',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    borderWidth: 2,
    borderColor: '#2a2a3e',
  },
  firstAvatar: {
    width: 70,
    height: 70,
    borderRadius: 35,
    borderWidth: 3,
    borderColor: '#FFD700',
  },
  podiumAvatarText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  podiumName: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '600',
    marginBottom: 4,
    textAlign: 'center',
  },
  podiumPoints: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#667eea',
    marginBottom: 8,
  },
  firstPoints: {
    fontSize: 18,
    color: '#FFD700',
  },
  podiumBase: {
    width: '100%',
    backgroundColor: '#1a1a2e',
    paddingVertical: 8,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    alignItems: 'center',
  },
  firstBase: {
    height: 80,
    backgroundColor: '#FFD70020',
  },
  secondBase: {
    height: 60,
    backgroundColor: '#C0C0C020',
  },
  thirdBase: {
    height: 50,
    backgroundColor: '#CD7F3220',
  },
  podiumRank: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  section: {
    padding: 15,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    marginLeft: 8,
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 14,
    color: '#888',
    marginTop: 10,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
  },
  topThreeItem: {
    borderWidth: 1,
    borderColor: '#667eea30',
  },
  rankContainer: {
    width: 40,
    alignItems: 'center',
    marginRight: 10,
  },
  rankText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#888',
  },
  studentAvatar: {
    width: 45,
    height: 45,
    borderRadius: 22.5,
    backgroundColor: '#667eea',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  studentAvatarText: {
    fontSize: 18,
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
  studentGroup: {
    fontSize: 12,
    color: '#888',
  },
  pointsContainer: {
    alignItems: 'flex-end',
  },
  pointsValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#667eea',
  },
  pointsLabel: {
    fontSize: 11,
    color: '#888',
  },
  groupIcon: {
    width: 45,
    height: 45,
    borderRadius: 22.5,
    backgroundColor: '#667eea20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  groupInfo: {
    flex: 1,
  },
  groupName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  groupStats: {
    flexDirection: 'row',
    gap: 10,
  },
  groupStat: {
    fontSize: 11,
    color: '#888',
  },
});
