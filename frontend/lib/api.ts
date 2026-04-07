import axios, { AxiosRequestConfig } from 'axios'
import Cookies from 'js-cookie'

const ERROS_SEM_RETRY = [400, 401, 403, 404, 422]
const MAX_RETRY = 2

interface ConfigComRetry extends AxiosRequestConfig {
  _retry?: boolean
  _retryCount?: number
}

const api = axios.create({ 
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'https://ongvlvl-production.up.railway.app/api'
})

// ─── INTERCEPTOR DE REQUEST ───────────────────────────────────────────────────
api.interceptors.request.use(
  (config) => {
    const token = Cookies.get('access_token')
    if (token) config.headers.Authorization = `Bearer ${token}`

    if (process.env.NODE_ENV === 'development') {
      const method = config.method?.toUpperCase()
      if (method === 'POST') {
        if (!config.data) {
          console.warn(`[API] POST ${config.url} — sem body`)
        } else {
          console.log(`[API] POST ${config.url}`, config.data instanceof FormData ? '[FormData]' : config.data)
        }
      }
      if (method === 'GET') {
        console.log(`[API] GET ${config.url}`, config.params || '')
      }
    }

    return config
  },
  (error) => {
    console.error('[API] Erro ao montar requisição:', error)
    return Promise.reject(error)
  }
)

// ─── INTERCEPTOR DE RESPONSE ──────────────────────────────────────────────────
api.interceptors.response.use(
  (res) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`[API] ${res.status} ${res.config.method?.toUpperCase()} ${res.config.url}`)
    }
    return res
  },
  async (error) => {
    const config = error.config as ConfigComRetry
    const status = error.response?.status

    if (status === 401 && !config._retry) {
      const refresh = Cookies.get('refresh_token')
      if (refresh) {
        try {
          config._retry = true
          const { data } = await axios.post(
            `${process.env.NEXT_PUBLIC_API_URL || 'https://ongvlvl-production.up.railway.app'}/api/token/refresh/`,
            { refresh }
          )
          Cookies.set('access_token', data.access, { secure: true, sameSite: 'strict' })
          config.headers = { ...config.headers, Authorization: `Bearer ${data.access}` }
          return api(config)
        } catch {
          Cookies.remove('access_token')
          Cookies.remove('refresh_token')
          if (typeof window !== 'undefined') window.location.href = '/login'
          return Promise.reject(error)
        }
      } else {
        if (typeof window !== 'undefined') window.location.href = '/login'
        return Promise.reject(error)
      }
    }

    if (status && ERROS_SEM_RETRY.includes(status)) {
      if (process.env.NODE_ENV === 'development') {
        console.warn(`[API] Erro ${status} em ${config.method?.toUpperCase()} ${config.url} — sem retry`)
      }
      return Promise.reject(error)
    }

    config._retryCount = config._retryCount ?? 0

    if (config._retryCount < MAX_RETRY) {
      config._retryCount += 1
      const espera = config._retryCount * 1000
      if (process.env.NODE_ENV === 'development') {
        console.warn(`[API] Tentativa ${config._retryCount}/${MAX_RETRY} para ${config.method?.toUpperCase()} ${config.url} em ${espera}ms`)
      }
      await new Promise((resolve) => setTimeout(resolve, espera))
      return api(config)
    }

    console.error(`[API] Falha após ${MAX_RETRY} tentativas em ${config.url}`)
    return Promise.reject(error)
  }
)

export default api
