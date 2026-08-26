import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { AuthUser, TokenPair } from '@/types/api'

const STORAGE_KEY = 'openpoll.auth'

interface PersistedAuth {
  user: AuthUser
  tokens: TokenPair
}

function loadPersisted(): PersistedAuth | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as PersistedAuth) : null
  } catch {
    return null
  }
}

export const useAuthStore = defineStore('auth', () => {
  const persisted = loadPersisted()
  const user = ref<AuthUser | null>(persisted?.user ?? null)
  const accessToken = ref<string | null>(persisted?.tokens.accessToken ?? null)
  const refreshToken = ref<string | null>(persisted?.tokens.refreshToken ?? null)

  const isAuthenticated = computed(() => !!accessToken.value)

  function persist() {
    if (user.value && accessToken.value && refreshToken.value) {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          user: user.value,
          tokens: { accessToken: accessToken.value, refreshToken: refreshToken.value },
        }),
      )
    } else {
      localStorage.removeItem(STORAGE_KEY)
    }
  }

  function setSession(newUser: AuthUser, tokens: TokenPair) {
    user.value = newUser
    accessToken.value = tokens.accessToken
    refreshToken.value = tokens.refreshToken
    persist()
  }

  function setTokens(tokens: TokenPair) {
    accessToken.value = tokens.accessToken
    refreshToken.value = tokens.refreshToken
    persist()
  }

  function logout() {
    user.value = null
    accessToken.value = null
    refreshToken.value = null
    persist()
  }

  return { user, accessToken, refreshToken, isAuthenticated, setSession, setTokens, logout }
})
