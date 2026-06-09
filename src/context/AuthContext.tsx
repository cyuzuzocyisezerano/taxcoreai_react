import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { api, setToken, type AuthUser } from '../lib/api'

interface AuthContextValue {
  user: AuthUser | null
  loading: boolean
  login: (username: string, password: string, remember?: boolean) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('taxcoreai_token')
    if (!token) {
      setLoading(false)
      return
    }

    api
      .me()
      .then(({ user }) => setUser(user))
      .catch(() => {
        setToken(null)
        setUser(null)
      })
      .finally(() => setLoading(false))
  }, [])

  const login = useCallback(async (username: string, password: string, remember = false) => {
    const { token, user } = await api.login(username, password)
    setToken(token)
    if (!remember) {
      sessionStorage.setItem('taxcoreai_session', '1')
    } else {
      sessionStorage.removeItem('taxcoreai_session')
    }
    setUser(user)
  }, [])

  const logout = useCallback(async () => {
    try {
      await api.logout()
    } catch {
      /* ignore if token already invalid */
    }
    setToken(null)
    setUser(null)
    sessionStorage.removeItem('taxcoreai_session')
  }, [])

  const value = useMemo(
    () => ({ user, loading, login, logout }),
    [user, loading, login, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
