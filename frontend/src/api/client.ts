import axios from 'axios'

const API_BASE = import.meta.env.VITE_API_URL || '/api'

export const client = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
})

// Attach JWT token to every request
client.interceptors.request.use((config) => {
  const raw = localStorage.getItem('taskflow_auth')
  if (raw) {
    try {
      const auth = JSON.parse(raw)
      if (auth?.token) {
        config.headers.Authorization = `Bearer ${auth.token}`
      }
    } catch {
      // ignore
    }
  }
  return config
})

// Redirect to login on 401
client.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('taskflow_auth')
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)
