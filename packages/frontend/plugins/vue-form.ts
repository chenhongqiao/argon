import VueForm, { i18n } from '@lljj/vue3-form-naive'
import { NForm, NFormItem, NInput, NButton } from 'naive-ui'

import localizeEn from 'ajv-i18n/localize/en'
export default defineNuxtPlugin((nuxtApp) => {
  i18n.useLocal(localizeEn)
  nuxtApp.vueApp.component('n-form', NForm)
  nuxtApp.vueApp.component('n-form-item', NFormItem)
  nuxtApp.vueApp.component('n-input', NInput)
  nuxtApp.vueApp.component('n-button', NButton)
  nuxtApp.vueApp.component('vue-form', VueForm)
})
