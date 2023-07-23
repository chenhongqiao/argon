import { defineStore } from 'pinia'
import { type PrivateUserProfile } from '@argoncs/types'

interface SessionStoreState {
  userId: string
  sessionId: string
}

export const useUserStore = defineStore('user', () => {
  const session: Ref<SessionStoreState | null> = ref(null)
  const profile: Ref<PrivateUserProfile | null> = ref(null)

  async function attach() {
    const { data } = await useAPI<{
      session: SessionStoreState
      profile: PrivateUserProfile
    }>('/current-session', {
      cache: 'no-store',
      immediate: true,
      watch: false
    })
    if (data.value != null) {
      session.value = data.value?.session
      profile.value = data.value?.profile
    }
  }
  async function destroy() {
    session.value = null
    profile.value = null
    const { $api } = useNuxtApp()
    await $api('/current-session', { method: 'delete' })
  }

  const name = computed(() => {
    if (profile.value != null) {
      return profile.value.name
    }
  })

  const loggedIn = computed(() => {
    return session.value != null && profile.value != null
  })

  const gravatar = computed(() => {
    return profile.value?.gravatar
  })

  return { session, profile, attach, destroy, name, gravatar, loggedIn }
})
