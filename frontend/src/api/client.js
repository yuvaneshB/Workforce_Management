import axios from 'axios';

export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL?.trim() || 'http://127.0.0.1:8000';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 45000,
  headers: {
    Accept: 'application/json',
  },
});

export function extractApiErrorMessage(error) {
  if (axios.isCancel(error) || error?.code === 'ERR_CANCELED') {
    return null;
  }

  if (error?.code === 'ECONNABORTED' || error?.message?.toLowerCase().includes('timeout')) {
    return 'The AI agent request timed out while processing with the language model and database. Please try again.';
  }

  if (error?.response) {
    const data = error.response.data;
    const msg = data?.error || data?.detail;
    if (typeof msg === 'string' && msg.trim()) {
      return msg;
    }
    return `Backend returned HTTP ${error.response.status}.`;
  }

  if (error?.request) {
    return `Unable to reach the FastAPI backend at ${API_BASE_URL}.`;
  }

  return error?.message || 'Unexpected API request error.';
}

