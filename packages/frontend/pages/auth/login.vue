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
          <VueForm
            ref="form"
            v-model="formData"
            :schema="UserLoginSchema"
            :ui-schema="uiSchema"
            :form-props="{ labelSuffix: '' }">
            <div class="flex">
              <div class="my-auto grow">
                No account?
                <NuxtLink to="/auth/register" #="{ navigate, href }"
                  ><n-a :href="href" @click="navigate">Sign up</n-a></NuxtLink
                >
              </div>
              <NButton type="primary" :loading="loginLoading" @click="submit"
                >Sign in</NButton
              >
            </div>
          </VueForm>
        </div>
      </NCard>
    </div>
  </div>
</template>
<script setup lang="ts">
import { UserLogin, UserLoginSchema } from '@argoncs/types'
import VueForm from '@lljj/vue3-form-naive'
import { useUserStore } from '~/stores/user'

const formData: Ref<UserLogin> = ref({} as UserLogin)
const form = ref()

const loginFailed = ref(false)
const loginLoading = ref(false)

async function submit() {
  const { $api } = useNuxtApp()
  try {
    loginLoading.value = true
    await form.value.$$uiFormRef.validate()
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
    attach()
  } finally {
    loginLoading.value = false
  }
}
const uiSchema = {
  usernameOrEmail: {
    'ui:title': 'Username/Email',
    'ui:options': {
      placeholder: ''
    }
  },
  password: {
    'ui:title': 'Password',
    'ui:options': {
      placeholder: '',
      type: 'password',
      'show-password-on': 'click'
    }
  }
}
</script>
