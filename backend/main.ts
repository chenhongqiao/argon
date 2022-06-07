import Fastify from 'fastify';

const app = Fastify({logger: true});

import {routes as problemRoutes} from './routes/problems.route';

app.register(problemRoutes, {prefix: '/problems'});

async function start() {
  try {
    await app.listen(3000);
  } catch (err) {
    app.log.error(err);
    throw err;
  }
}
start();
