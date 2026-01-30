import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';

export default function TeacherDashboard({ navigation }) {
  const { logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    navigation.replace('Login');
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Панель учителя</Text>
        <Text style={styles.subtitle}>Управление учебным процессом</Text>
      </View>

      <View style={styles.content}>
        <TouchableOpacity style={styles.card}>
          <Icon name="account-group" size={48} color="#00d4ff" />
          <Text style={styles.cardTitle}>Мои группы</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.card}>
          <Icon name="clipboard-list" size={48} color="#4ecdc4" />
          <Text style={styles.cardTitle}>Домашние задания</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.card}>
          <Icon name="file-document-edit" size={48} color="#ff6b6b" />
          <Text style={styles.cardTitle}>Проверка работ</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.card}>
          <Icon name="chart-line" size={48} color="#ffd93d" />
          <Text style={styles.cardTitle}>Статистика</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Icon name="logout" size={24} color="#fff" />
        <Text style={styles.logoutText}>Выйти</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f1e',
  },
  header: {
    padding: 20,
    paddingTop: 40,
    backgroundColor: '#1a1a2e',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
    color: '#888',
  },
  content: {
    flex: 1,
    padding: 20,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  card: {
    width: '48%',
    backgroundColor: '#1a1a2e',
    borderRadius: 15,
    padding: 20,
    alignItems: 'center',
    marginBottom: 15,
    borderWidth: 2,
    borderColor: '#2a2a3e',
  },
  cardTitle: {
    color: '#fff',
    marginTop: 10,
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ff6b6b',
    margin: 20,
    padding: 15,
    borderRadius: 10,
  },
  logoutText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 10,
  },
});
