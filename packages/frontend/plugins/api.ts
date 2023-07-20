import { $fetch } from 'ofetch'

export default defineNuxtPlugin(() => {
  const config = useRuntimeConfig()
  const api = $fetch.create({
    baseURL: config.public.APIBase as string,
    credentials: 'include'
  })
  return {
    provide: {
      api
    }
  }
})
