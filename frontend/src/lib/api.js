import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add userId header to every request
function getUserId() {
  if (typeof window === 'undefined') return null;
  try {
    const stored = localStorage.getItem('recipeUser');
    if (stored) {
      const user = JSON.parse(stored);
      return user.id;
    }
  } catch {}
  return null;
}

api.interceptors.request.use((config) => {
  const userId = getUserId();
  if (userId) {
    config.headers['X-User-Id'] = userId;
  }
  return config;
});

// ============ AUTH ============

export async function login(username, password) {
  const response = await api.post('/auth/login', { username, password });
  return response.data;
}

// ============ RECIPES ============

export async function getRecipes(params = {}) {
  const { categoryId, search, favorite } = params;
  const queryParams = new URLSearchParams();
  
  if (categoryId) queryParams.append('categoryId', categoryId);
  if (search) queryParams.append('search', search);
  if (favorite) queryParams.append('favorite', 'true');
  
  const query = queryParams.toString();
  const url = query ? `/recipes?${query}` : '/recipes';
  
  const response = await api.get(url);
  return response.data;
}

export async function getMyRecipes() {
  const response = await api.get('/recipes/my');
  return response.data;
}

export async function getOthersPublicRecipes() {
  const response = await api.get('/recipes/others-public');
  return response.data;
}

export async function getRecipe(id) {
  const response = await api.get(`/recipes/${id}`);
  return response.data;
}

export async function createRecipe(recipeData) {
  const response = await api.post('/recipes', recipeData);
  return response.data;
}

export async function updateRecipe(id, recipeData) {
  const response = await api.put(`/recipes/${id}`, recipeData);
  return response.data;
}

export async function deleteRecipe(id) {
  const response = await api.delete(`/recipes/${id}`);
  return response.data;
}

export async function toggleFavorite(id) {
  const response = await api.patch(`/recipes/${id}/favorite`);
  return response.data;
}

export async function toggleVisibility(id) {
  const response = await api.patch(`/recipes/${id}/visibility`);
  return response.data;
}

// ============ CATEGORIES ============

export async function getCategories() {
  const response = await api.get('/categories');
  return response.data;
}

export async function createCategory(name) {
  const response = await api.post('/categories', { name });
  return response.data;
}

export default api;
