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

  async function attach(userId: string, sessionId: string) {
    session.value = { userId, sessionId }
    const { data } = await useAPI<PrivateUserProfile>(
      `/users/${userId}/profiles/private`,
      { cache: 'no-store', immediate: true, watch: false }
    )
    profile.value = data.value
  }

  const sessionUser = useCookie('session_user')
  const sessionId = useCookie('session_id')
  watchEffect(async () => {
    if (sessionUser.value != null && sessionId.value != null) {
      await attach(sessionUser.value, sessionId.value)
    }
  })

  function destroy() {
    session.value = null
    profile.value = null
    sessionUser.value = null
    sessionId.value = null
  }

  const name = computed(() => {
    if (profile.value != null) {
      return profile.value.name
    }
  })
  const gravatar = computed(() => {
    if (profile.value != null) {
      return gravatarUrl(profile.value.email ?? '', { size: 200 })
    }
  })

  return { session, profile, attach, detach, name, gravatar }
})
