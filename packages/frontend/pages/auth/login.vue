<template>
  <div>
    <div class="flex justify-center">
      <NImage src="/logo.png" class="h-20" preview-disabled />
    </div>
    <div class="flex justify-center mt-8">
      <NCard class="w-[400px]" title="Sign in to TeamsCode">
        <NAlert
          v-if="loginFailed"
          type="error"
          closable
          @click="loginFailed = false">
          Incorrect username or password
        </NAlert>
        <div class="mt-4">
          <NForm ref="formRef" :model="formData" :rules="rules">
            <NFormItem label="Username/Email" path="usernameOrEmail">
              <NInput v-model:value="formData.usernameOrEmail" placeholder="">
              </NInput>
            </NFormItem>
            <NFormItem
              label="Password"
              path="password"
              class="mt-0"
              required
              type="password">
              <NInput
                v-model:value="formData.password"
                placeholder=""
                type="password"
                show-password-on="click">
              </NInput>
            </NFormItem>
          </NForm>
          <div class="flex">
            <div class="my-auto grow">
              No account?
              <NuxtLink to="/auth/register" #="{ navigate, href }"
                ><n-a :href="href" @click="navigate">Register</n-a></NuxtLink
              >
            </div>
            <NButton type="primary" :loading="loginLoading" @click="submit"
              >Sign in</NButton
            >
          </div>
        </div>
      </NCard>
    </div>
  </div>
</template>
<script setup lang="ts">
import { UserLogin } from '@argoncs/types'
import { useUserStore } from '~/stores/user'

const formData: Ref<UserLogin> = ref({} as UserLogin)
const formRef = ref()

const loginFailed = ref(false)
const loginLoading = ref(false)

const { $router } = useNuxtApp()

async function submit() {
  const { $api } = useNuxtApp()

  try {
    await formRef.value.validate()
  } catch {
    return
  }
  try {
    loginLoading.value = true
    await $api<{
      sessionId: string
      userId: string
    }>('/sessions', { method: 'post', body: formData.value }).catch((err) => {
      if (err.data.statusCode === 401) {
        loginFailed.value = true
        formData.value.password = ''
      } else {
        throw createError({
          statusCode: err.data.statusCode,
          message: err.data.message
        })
      }
    })
    const { attach } = useUserStore()
    await attach()
    navigateTo(($router.options.history.state.back as string) ?? '/')
  } finally {
    loginLoading.value = false
  }
}
const rules = {
  password: [
    {
      required: true,
      message: 'Password is required',
      trigger: 'blur'
    }
  ],
  usernameOrEmail: [
    {
      required: true,
      message: 'Username or Email is required',
      trigger: 'blur'
    }
  ]
}
</script>
