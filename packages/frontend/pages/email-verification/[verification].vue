<template>
  <div class="flex justify-center">
    <NCard ref="loadingBarTargetRef" class="w-[400px]">
      <NResult :status="status" :title="title" :description="description" />
    </NCard>
  </div>
</template>
<script lang="ts" setup>
const route = useRoute()
const { verification } = route.params as { verification: string }
const userId = verification.split('-')[0]
const verificationId = verification.split('-')[1]
const status = ref<
  | 'error'
  | 'success'
  | '500'
  | 'info'
  | 'warning'
  | '404'
  | '403'
  | '418'
  | undefined
>(undefined)
const title = ref('')
const description = ref('')
const { error } = await useAPI(
  `/users/${userId}/email-verifications/${verificationId}`,
  {
    method: 'post',
    immediate: true,
    watch: false
  }
)
if (error.value != null) {
  if (error.value?.statusCode === 409) {
    status.value = 'error'
    title.value = 'Email unavailable'
    description.value =
      'After you registered, another account claimed this email address before you.'
  }
  if (error.value?.statusCode === 401) {
    status.value = 'error'
    title.value = 'Unauthorized'
    description.value =
      'You are either not logged in or attempting to verify the email for a different user.'
  } else {
    status.value = 'error'
    title.value = 'Inavlid confirmation link'
    description.value =
      'The email confirmation link may have already been used or expired. Request a new one from your account settings if you still need to verify your email.'
  }
} else {
  status.value = 'success'
  title.value = 'Email confirmed'
  description.value = 'You can now close this tab.'
}
</script>
