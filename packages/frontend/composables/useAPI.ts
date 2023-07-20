export const useAPI: typeof useFetch = (request, opts?) => {
  const config = useRuntimeConfig()
  return useFetch(request, {
    baseURL: config.public.APIBase as string,
    credentials: 'include',
    ...opts
  })
}
