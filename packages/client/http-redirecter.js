import Fastify from 'fastify'
import fastifyStatic from '@fastify/static';

const fastify = Fastify({
  logger: true,
})


fastify.get('/*', async function handler (request, reply) {
  reply.redirect('https://contest.joincpi.org', 301);
})

fastify.listen(
  { port: '8080', host: '0.0.0.0' },
  function (err, address) {
    if (err) {
      fastify.log.error(err)
      process.exit(1)
    }
    fastify.log.info({msg: `up at: ${address}`})
  }
)
