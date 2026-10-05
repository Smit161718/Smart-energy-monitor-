const API_URL = 'http://localhost:5000/api';

// Set Auth Token helper
export const setAuthToken = (token) => {
  if (token) {
    localStorage.setItem('energy_token', token);
  } else {
    localStorage.removeItem('energy_token');
  }
};

// API Fetch Helper
const apiRequest = async (endpoint, options = {}) => {
  const token = localStorage.getItem('energy_token');
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const url = `${API_URL}${endpoint}`;
  const config = {
    ...options,
    headers,
  };

  try {
    const response = await fetch(url, config);
    if (!response.ok) {
      const errData = await response.json().catch(() => ({ msg: 'Unknown error' }));
      throw new Error(errData.msg || `Request failed with status ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error(`API Error in ${endpoint}:`, error.message);
    throw error;
  }
};

export const authAPI = {
  register: (data) => apiRequest('/auth/register', { method: 'POST', body: JSON.stringify(data) }),
  login: (data) => apiRequest('/auth/login', { method: 'POST', body: JSON.stringify(data) }),
  getProfile: () => apiRequest('/auth/profile'),
  updateProfile: (data) => apiRequest('/auth/profile', { method: 'PUT', body: JSON.stringify(data) }),
};

export const meterAPI = {
  getLatest: () => apiRequest('/meter'),
  getHistory: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiRequest(`/meter/history?${query}`);
  },
  getCharts: (range = 'day') => apiRequest(`/meter/charts?range=${range}`),
};

export const reportAPI = {
  getToday: () => apiRequest('/report/today'),
  getMonthly: () => apiRequest('/report/monthly'),
};

export const notificationsAPI = {
  getAll: () => apiRequest('/notifications'),
  markAsRead: (id) => apiRequest(`/notifications/${id}/read`, { method: 'PUT' }),
  clearAll: () => apiRequest('/notifications', { method: 'DELETE' }),
};

export const settingsAPI = {
  getSettings: () => apiRequest('/settings'),
  updateSettings: (data) => apiRequest('/settings', { method: 'PUT', body: JSON.stringify(data) }),
};

export const systemAPI = {
  getStatus: () => apiRequest('/status'),
};
