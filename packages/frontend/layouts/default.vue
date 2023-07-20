<template>
  <NaiveConfig :theme-config="themeConfig">
    <NLayout has-sider position="absolute">
      <NLayoutSider
        v-model:collapsed="collapsed"
        bordered
        show-trigger
        collapse-mode="width"
        :collapsed-width="64"
        :width="240"
        :native-scrollbar="false"
        style="max-height: 320px">
        <div class="flex justify-center">
          <div>
            <NImage src="/logo.png" class="h-9 mt-4 mb-4" preview-disabled />
          </div>
          <div v-if="!collapsed" class="pt-0 mt-5 ml-4">
            <NH2 class="text-primary font-semibold">TEAMSCODE</NH2>
          </div>
        </div>
        <NMenu
          v-model:value="activeMenu"
          :collapsed-width="64"
          :collapsed-icon-size="22"
          :options="menuOptions" />
      </NLayoutSider>
      <NLayout class="flex h-min-screen flex-col">
        <NLayoutHeader bordered class="px-6 py-3 flex">
          <NBreadcrumb class="grow mt-1">
            <NBreadcrumbItem>Home</NBreadcrumbItem>
            <NBreadcrumbItem>Account</NBreadcrumbItem>
            <NBreadcrumbItem>Category</NBreadcrumbItem>
          </NBreadcrumb>
          <div v-if="!profile">
            <NuxtLink to="/auth/login" class="mr-2">
              <NButton class="ml-auto"
                >Sign in
                <template #icon>
                  <NIcon>
                    <LoginIcon />
                  </NIcon>
                </template>
              </NButton>
            </NuxtLink>
            <NuxtLink to="/auth/register">
              <NButton class="ml-auto" type="primary"
                >Sign up
                <template #icon>
                  <NIcon>
                    <SignupIcon />
                  </NIcon>
                </template>
              </NButton>
            </NuxtLink>
          </div>
          <div v-else>
            <NDropdown
              :options="options"
              placement="bottom-start"
              trigger="click"
              @select="handleSelect">
              <NAvatar
                class="cursor-pointer"
                round
                size="medium"
                :src="gravatar" />
            </NDropdown>
          </div>
        </NLayoutHeader>
        <NCard embedded :bordered="false" class="min-h-[calc(100vh-109px)]">
          <slot />
        </NCard>
        <NLayoutFooter bordered class="p-4 text-center">
          TeamsCode is a 501(c)(3) nonprofit organization. All rights reserved.
        </NLayoutFooter>
      </NLayout>
    </NLayout>
  </NaiveConfig>
</template>
<script lang="ts">
import { ThemeConfig } from '@bg-dev/nuxt-naiveui'
import { NIcon, NText } from 'naive-ui'
import {
  HomeOutlined as HomeIcon,
  UserAddOutlined as SignupIcon,
  TrophyOutlined as ContestIcon,
  LoginOutlined as LoginIcon
} from '@vicons/antd'
import { storeToRefs } from 'pinia'
import { NuxtLink } from '#components'
import { useUserStore } from '~/stores/user'
function useMenu() {
  const menuOptions = [
    {
      label: () =>
        h(
          NuxtLink,
          {
            to: '/'
          },
          { default: () => 'Home' }
        ),
      key: '/',
      icon: () => h(NIcon, { component: HomeIcon })
    },
    {
      label: () =>
        h(
          NuxtLink,
          {
            to: '/contests'
          },
          { default: () => 'Contests' }
        ),
      key: '/contests',
      icon: () => h(NIcon, { component: ContestIcon })
    }
  ]

  const collapsed = ref(false)
  const route = useRoute()

  const activeMenu = ref('/' + route.path.split('/')[1] || '/')
  watch(
    () => route.path,
    (value) => {
      activeMenu.value = '/' + value.split('/')[1]
    }
  )

  return { activeMenu, collapsed, menuOptions }
}

function useTheme() {
  const themeConfig: ThemeConfig = {
    shared: {
      common: {
        fontFamily: 'Barlow'
      }
    },
    light: {
      common: {
        primaryColor: '#0096c7',
        primaryColorHover: '#1ba0cc',
        primaryColorPressed: '#0a83ab'
      }
    }
  }

  return { themeConfig }
}

function useStores() {
  const { $pinia } = useNuxtApp()
  const { profile } = storeToRefs(useUserStore($pinia))
  const { gravatar, detach } = useUserStore($pinia)

  return { profile, gravatar, detach }
}

function useAvatar() {
  const { profile, detach } = useStores()

  function renderCustomHeader() {
    return h(
      'div',
      {
        style: 'display: flex; align-items: center; padding: 8px 12px;'
      },
      [
        h('div', null, [
          h('div', null, [
            h(NText, { depth: 2 }, { default: () => profile.value?.name })
          ]),
          h('div', { style: 'font-size: 12px;' }, [
            h(NText, { depth: 3 }, { default: () => profile.value?.username })
          ])
        ])
      ]
    )
  }

  const options = [
    {
      key: 'header',
      type: 'render',
      render: renderCustomHeader
    },
    {
      key: 'header-divider',
      type: 'divider'
    },
    {
      label: 'Logout',
      key: 'logout'
    }
  ]
  function handleSelect(key: string | number) {
    if (key === 'logout') {
      detach()
    }
  }

  return { handleSelect, options }
}

export default {
  components: {
    SignupIcon,
    LoginIcon
  },
  setup() {
    return {
      ...useMenu(),
      ...useTheme(),
      ...useStores(),
      ...useAvatar()
    }
  }
}
</script>
<style scoped>
.brand {
  display: flex;
  align-items: center;
  gap: 1em;
}
</style>
