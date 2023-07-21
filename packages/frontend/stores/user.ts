import { defineStore } from 'pinia'
import { type PrivateUserProfile } from '@argoncs/types'
import gravatarUrl from 'gravatar-url'

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
  const gravatar = computed(() => {
    if (profile.value != null && profile.value.email != null) {
      return gravatarUrl(profile.value.email, { size: 200 })
    } else {
      return null
    }
  })

  return { session, profile, attach, destroy, name, gravatar }
})
