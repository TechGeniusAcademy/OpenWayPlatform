import api from '../utils/api';

// Получить все дизайн-проекты пользователя
export const getAllDesignProjects = async () => {
  try {
    const response = await api.get('/design-projects');
    return response.data;
  } catch (error) {
    console.error('Error fetching design projects:', error);
    throw error;
  }
};

// Получить один дизайн-проект
export const getDesignProject = async (projectId) => {
  try {
    const response = await api.get(`/design-projects/${projectId}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching design project:', error);
    throw error;
  }
};

// Создать новый дизайн-проект
export const createDesignProject = async (projectData) => {
  try {
    const response = await api.post('/design-projects', projectData);
    return response.data;
  } catch (error) {
    console.error('Error creating design project:', error);
    throw error;
  }
};

// Обновить дизайн-проект
export const updateDesignProject = async (projectId, projectData) => {
  try {
    const response = await api.put(`/design-projects/${projectId}`, projectData);
    return response.data;
  } catch (error) {
    console.error('Error updating design project:', error);
    throw error;
  }
};

// Удалить дизайн-проект
export const deleteDesignProject = async (projectId) => {
  if (!projectId) {
    console.error('Project ID is required for deletion');
    throw new Error('Project ID is required');
  }
  
  try {
    const response = await api.delete(`/design-projects/${projectId}`);
    return response.data;
  } catch (error) {
    console.error('Error deleting design project:', error);
    throw error;
  }
};

// Сохранить workspace (текущее состояние)
export const saveWorkspace = async (workspaceData) => {
  try {
    const response = await api.post('/design-projects/workspace', workspaceData);
    return response.data;
  } catch (error) {
    console.error('Error saving workspace:', error);
    throw error;
  }
};

// Загрузить workspace
export const loadWorkspace = async () => {
  try {
    const response = await api.get('/design-projects/workspace/current');
    return response.data;
  } catch (error) {
    console.error('Error loading workspace:', error);
    throw error;
  }
};
