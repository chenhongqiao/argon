<template>
  <div class="flex justify-center">
    <div
      class="grid grid-cols-5 gap-12 justify-center mt-8 w-[1000px] justify-center">
      <NImage class="col-span-2" src="/register.jpg" />
      <NCard class="col-span-3" title="Join the TeamsCode community">
        <div class="mt-4">
          <VueForm
            ref="form"
            v-model="formData"
            :schema="NewUserSchema"
            :ui-schema="uiSchema"
            :form-props="{ labelSuffix: '', layoutColumn: 2 }">
            <div class="text-right">
              <NButton type="primary" @click="submit">Sign up</NButton>
            </div>
          </VueForm>
        </div>
      </NCard>
    </div>
  </div>
</template>
<script setup lang="ts">
import { NewUserSchema } from '@argoncs/types'
import VueForm from '@lljj/vue3-form-naive'
const formData = {}
const form = ref()
async function submit() {
  await form.value.$$uiFormRef.validate()
}
const uiSchema = {
  name: {
    'ui:title': 'Display Name',
    'ui:options': {
      placeholder: '',
      type: 'email'
    }
  },
  email: {
    'ui:title': 'Email',
    'ui:options': {
      placeholder: ''
    }
  },
  username: {
    'ui:title': 'Username',
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
  },
  'ui:order': ['name', 'username', 'email', 'password']
}
</script>
