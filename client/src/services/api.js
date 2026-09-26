const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

let accessToken = localStorage.getItem('duster_token') || null;
let currentWorkspaceId = localStorage.getItem('duster_active_workspace') || null;

export const setAuthToken = (token) => {
  accessToken = token;
  if (token) {
    localStorage.setItem('duster_token', token);
  } else {
    localStorage.removeItem('duster_token');
  }
};

export const getAuthToken = () => accessToken;

export const setActiveWorkspaceHeader = (workspaceId) => {
  currentWorkspaceId = workspaceId;
  if (workspaceId) {
    localStorage.setItem('duster_active_workspace', workspaceId);
  } else {
    localStorage.removeItem('duster_active_workspace');
  }
};

export const getActiveWorkspaceId = () => currentWorkspaceId;

export async function request(endpoint, options = {}) {
  const url = `${API_URL}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }

  if (currentWorkspaceId) {
    headers['x-workspace-id'] = currentWorkspaceId;
  }

  // If payload is FormData, do not set application/json
  if (options.body instanceof FormData) {
    delete headers['Content-Type'];
  }

  const config = {
    ...options,
    headers,
    credentials: 'include', // sends refresh token cookie
  };

  let response = await fetch(url, config);

  // If 401 unauthorized and not on auth endpoints, try silent refresh once
  if (response.status === 401 && !endpoint.startsWith('/auth/')) {
    try {
      const refreshRes = await fetch(`${API_URL}/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
      });

      if (refreshRes.ok) {
        const refreshData = await refreshRes.json();
        setAuthToken(refreshData.token);
        headers['Authorization'] = `Bearer ${refreshData.token}`;
        response = await fetch(url, { ...config, headers });
      } else {
        setAuthToken(null);
      }
    } catch (e) {
      setAuthToken(null);
    }
  }

  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    const data = await response.json();
    if (!response.ok) {
      const error = new Error(data.error || 'API request failed');
      error.status = response.status;
      error.data = data;
      throw error;
    }
    return data;
  }

  if (!response.ok) {
    throw new Error(`HTTP error ${response.status}`);
  }

  return response;
}
