<template>
  <div class="flex justify-center">
    <div
      class="grid grid-cols-5 gap-12 justify-center mt-8 w-[1000px] justify-center">
      <NImage class="col-span-2" src="/register.jpg" />
      <NCard class="col-span-3" title="Join the TeamsCode community">
        <NSteps :current="step" :status="status" class="mt-8">
          <NStep title="Account Details" />
          <NStep title="Contestant Information" />
        </NSteps>
        <div v-if="step === 1" class="mt-4">
          <!-- @vue-ignore -->
          <NForm ref="accountRef" :rules="accountRules" :model="accountForm">
            <NGrid :span="24">
              <NFormItemGi
                :span="12"
                label="Full Name"
                path="name"
                class="pr-2">
                <NInput
                  v-model:value="accountForm.name"
                  :maxlength="32"
                  placeholder="" />
              </NFormItemGi>
              <NFormItemGi
                :span="12"
                label="Email"
                path="email"
                class="pr-2"
                :validation-status="emailStatus"
                :feedback="emailFeedback">
                <NInput
                  v-model:value="accountForm.email"
                  :maxlength="32"
                  placeholder="" />
              </NFormItemGi>
              <NFormItemGi
                :span="12"
                label="Password"
                path="password"
                class="pr-2">
                <NInput
                  v-model:value="accountForm.password"
                  :maxlength="32"
                  placeholder=""
                  show-password-on="click"
                  type="password" />
              </NFormItemGi>
              <NFormItemGi
                :span="12"
                label="Username"
                path="username"
                :validation-status="usernameStatus"
                :feedback="usernameFeedback"
                class="pr-2">
                <NInput
                  v-model:value="accountForm.username"
                  :maxlength="32"
                  placeholder="a-Z, 0-9, and _ only" />
              </NFormItemGi>
            </NGrid>
          </NForm>
          <div class="mt-4 flex">
            <div class="my-auto grow">
              Already have an account?
              <NuxtLink to="/auth/login" #="{ navigate, href }"
                ><n-a :href="href" @click="navigate">Sign in</n-a></NuxtLink
              >
            </div>
            <NButton type="primary" @click="finishAccountInfo">Next</NButton>
          </div>
        </div>
        <div v-else-if="step === 2" class="mt-4">
          <!-- @vue-ignore -->
          <NForm
            ref="contestantRef"
            :rules="contestantRules"
            :model="contestantForm">
            <NGrid :span="24">
              <NFormItemGi :span="17" label="School" path="school" class="pr-2">
                <NInput
                  v-model:value="contestantForm.school"
                  placeholder=""
                  :maxlength="48" />
              </NFormItemGi>
              <NFormItemGi
                :span="7"
                label="HS Graduation Year"
                path="year"
                class="pr-2">
                <NInputNumber
                  v-model:value="contestantForm.year"
                  :min="1900"
                  :max="2100"
                  placeholder="" />
              </NFormItemGi>
              <NFormItemGi
                :span="12"
                label="Country/Region"
                path="country"
                class="pr-2">
                <NSelect
                  v-model:value="contestantForm.country"
                  placeholder=""
                  filterable
                  :options="countries" />
              </NFormItemGi>
              <NFormItemGi
                :span="12"
                label="State/Province"
                path="region"
                class="pr-2">
                <NSelect
                  v-model:value="contestantForm.region"
                  placeholder=""
                  filterable
                  :options="regions" />
              </NFormItemGi>
            </NGrid>
          </NForm>
          <div class="mt-4 flex justify-end">
            <NButton class="mr-2" @click="step -= 1">Back</NButton>
            <NButton
              type="primary"
              :loading="signupLoading"
              @click="finishContestantInfo()"
              >Sign up</NButton
            >
          </div>
        </div>
        <div v-else-if="step === 3" class="mt-20">
          <NResult
            status="success"
            title="Almost set!"
            :description="`Please check your inbox for an email address confirmation email we've just sent to ${accountForm.email}.`">
            <template #icon>
              <NIcon size="80">
                <Icon name="twemoji:partying-face"></Icon>
              </NIcon>
            </template>
            <template #footer>
              <NuxtLink to="/">
                <NButton type="primary">Home</NButton>
              </NuxtLink>
            </template>
          </NResult>
        </div>
      </NCard>
    </div>
  </div>
</template>
<script lang="ts" setup>
import { NewUser } from '@argoncs/types'
import { watchDebounced } from '@vueuse/core'
import { allCountries } from 'country-region-data'
import { useUserStore } from '~/stores/user'
const accountForm = ref({}) as Ref<
  Pick<NewUser, 'name' | 'email' | 'password' | 'username'>
>
const accountRef = ref()
const usernameStatus: Ref<'error' | 'success' | 'warning' | undefined> =
  ref(undefined)
const usernameFeedback = ref('')
const emailStatus: Ref<'error' | 'success' | 'warning' | undefined> =
  ref(undefined)
const emailFeedback = ref('')
const { $api } = useNuxtApp()
async function validateUsername() {
  if (accountForm.value.username !== '' && usernameStatus.value !== 'error') {
    try {
      await $api(`/users/${accountForm.value.username}`, { method: 'head' })
      usernameStatus.value = 'error'
      usernameFeedback.value = `${accountForm.value.username} is not available`
      return false
    } catch {
      usernameStatus.value = undefined
      usernameFeedback.value = ''
      return true
    }
  }
}
async function validateEmail() {
  if (accountForm.value.email !== '' && emailStatus.value !== 'error') {
    try {
      await $api(`/users/${accountForm.value.email}`, { method: 'head' })
      emailStatus.value = 'error'
      emailFeedback.value = `${accountForm.value.email} is associated with another account`
      return false
    } catch {
      emailStatus.value = undefined
      emailFeedback.value = ''
      return true
    }
  }
}
async function validateForm() {
  try {
    await accountRef.value.validate()
    return true
  } catch {
    return false
  }
}
async function finishAccountInfo() {
  if (
    (await validateForm()) &&
    (await validateUsername()) &&
    (await validateEmail())
  ) {
    step.value += 1
  }
}
watchDebounced(
  () => accountForm.value.username,
  async () => {
    await validateUsername()
  },
  { debounce: 500 }
)
watch(
  () => accountForm.value.username,
  () => {
    if (usernameFeedback.value.endsWith('is not available')) {
      usernameStatus.value = undefined
      usernameFeedback.value = ''
    }
  }
)
watchDebounced(
  () => accountForm.value.email,
  async () => {
    await validateEmail()
  },
  { debounce: 500 }
)
watch(
  () => accountForm.value.email,
  () => {
    if (emailFeedback.value.endsWith('is associated with another account')) {
      emailStatus.value = undefined
      emailFeedback.value = ''
    }
  }
)
const accountRules = {
  name: [
    {
      required: true,
      message: 'Required',
      trigger: 'blur'
    }
  ],
  email: [
    {
      required: true,
      message: 'Required',
      trigger: 'blur'
    },
    {
      type: 'email',
      trigger: 'blur',
      message: 'Invalid email'
    }
  ],
  password: [
    {
      required: true,
      message: 'Required',
      trigger: 'blur'
    },
    {
      min: 8,
      message: 'Must be at least 8 characters long',
      trigger: 'blur'
    }
  ],
  username: [
    {
      required: true,
      message: 'Required',
      trigger: 'blur'
    },
    {
      pattern: /^[A-Za-z0-9_]*$/,
      message: 'Can only include letters, numbers, and underscores',
      trigger: 'input'
    }
  ]
}
const contestantForm = ref({}) as Ref<
  Pick<NewUser, 'school' | 'year' | 'country' | 'region'>
>
const contestantRef = ref()
const { attach } = useUserStore()
const signupLoading = ref(false)
async function finishContestantInfo() {
  try {
    await contestantRef.value.validate()
  } catch {
    return
  }
  try {
    signupLoading.value = true
    const completedForm = { ...accountForm.value, ...contestantForm.value }
    const { userId } = await $api<{ userId: string }>('/users', {
      method: 'post',
      body: completedForm
    })
    await $api('/sessions', {
      method: 'post',
      body: {
        usernameOrEmail: accountForm.value.username,
        password: accountForm.value.password
      }
    })
    await attach()
    await $api(`/users/${userId}/email-verifications`, {
      method: 'post'
    })
    step.value += 1
  } finally {
    signupLoading.value = false
  }
}
const countries = computed(() => {
  const countries = allCountries
    .filter((data) => data[0] !== 'United States')
    .map((data) => {
      return { label: data[0], value: data[0] }
    })

  return [{ label: 'United States', value: 'United States' }, ...countries]
})
const regions = computed(() => {
  const country = allCountries
    .filter((data) => data[0] === contestantForm.value.country)
    .map((data) => data[2])[0]

  if (country != null) {
    return country.map((region) => {
      return { label: region[0], value: region[0] }
    })
  } else {
    return []
  }
})
const contestantRules = {
  school: [
    {
      required: true,
      message: 'Required',
      trigger: 'blur'
    }
  ],
  year: [
    {
      required: true,
      type: 'number',
      message: 'Required',
      trigger: 'blur'
    }
  ],
  country: [
    {
      required: true,
      message: 'Required',
      trigger: 'blur'
    }
  ],
  region: [
    {
      required: true,
      message: 'Required',
      trigger: 'blur'
    }
  ]
}
const status: Ref<'error' | 'process' | 'wait' | 'finish' | undefined> =
  ref('process')
const step = ref(1)
</script>
