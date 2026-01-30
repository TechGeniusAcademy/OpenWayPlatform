import axios from 'axios';
import { API_URL } from '../config/constants';

class ApiService {
  constructor() {
    this.api = axios.create({
      baseURL: API_URL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.api.interceptors.response.use(
      (response) => response.data,
      (error) => {
        console.error('API Error:', error.response?.data || error.message);
        throw error.response?.data || error;
      }
    );
  }

  setAuthToken(token) {
    if (token) {
      this.api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
      delete this.api.defaults.headers.common['Authorization'];
    }
  }

  // Auth
  async login(email, password) {
    return this.api.post('/api/auth/login', { email, password });
  }

  // Users
  async getProfile() {
    return this.api.get('/api/auth/me');
  }

  async updateProfile(data) {
    return this.api.put('/api/users/profile', data);
  }

  // Points
  async getPoints() {
    return this.api.get('/api/points/my');
  }

  async getPointsHistory() {
    return this.api.get('/api/points/history');
  }

  // Tests
  async getTests() {
    return this.api.get('/api/tests');
  }

  async getTest(id) {
    return this.api.get(`/api/tests/${id}`);
  }

  async submitTest(id, answers) {
    return this.api.post(`/api/tests/${id}/submit`, { answers });
  }

  // Homeworks
  async getHomeworks() {
    return this.api.get('/api/homeworks');
  }

  async submitHomework(id, formData) {
    return this.api.post(`/api/homeworks/${id}/submit`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  }

  // Chat
  async getChats() {
    return this.api.get('/api/chat');
  }

  async getMessages(chatId) {
    return this.api.get(`/api/chat/${chatId}/messages`);
  }

  async sendMessage(chatId, content, messageType = 'text') {
    return this.api.post(`/api/chat/${chatId}/messages`, { 
      content, 
      message_type: messageType 
    });
  }

  async markAsRead(chatId) {
    return this.api.put(`/api/chat/${chatId}/mark-read`);
  }

  // Groups
  async getGroups() {
    return this.api.get('/api/groups');
  }

  async getGroupById(groupId) {
    return this.api.get(`/api/groups/${groupId}`);
  }

  // Leaderboards
  async getTopStudents(limit = 20) {
    return this.api.get(`/api/points/top-students?limit=${limit}`);
  }

  async getTopGroups(limit = 10) {
    return this.api.get(`/api/points/top-groups?limit=${limit}`);
  }

  // Updates
  async getUpdates() {
    return this.api.get('/api/updates');
  }

  // Shop
  async getShopItems() {
    return this.api.get('/api/shop/items');
  }

  async purchaseItem(itemId) {
    return this.api.post(`/api/shop/purchase/${itemId}`);
  }

  // Knowledge Base
  async getCategories() {
    return this.api.get('/api/knowledge-base/categories');
  }

  async getArticles(categoryId) {
    return this.api.get(`/api/knowledge-base/categories/${categoryId}/articles`);
  }

  async getArticle(articleId) {
    return this.api.get(`/api/knowledge-base/articles/${articleId}`);
  }
}

export default new ApiService();
