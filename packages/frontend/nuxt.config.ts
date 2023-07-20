// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  devtools: { enabled: true },
  modules: [
    '@bg-dev/nuxt-naiveui',
    '@nuxtjs/google-fonts',
    '@nuxtjs/tailwindcss',
    '@pinia/nuxt'
  ],
  runtimeConfig: {
    public: {
      APIBase: 'http://localhost:8000/v1'
    }
  },
  googleFonts: {
    families: {
      Roboto: [100, 200, 300, 400, 700, 900],
      Barlow: [400, 500, 600, 700, 800, 900]
    },
    download: true,
    display: 'swap'
  },

  naiveui: {
    colorModePreference: 'light',
    iconSize: 18,
    themeConfig: {}
  }
})
