import Fastify from 'fastify';
import multipart from '@fastify/multipart';

const app = Fastify({ logger: true });

import { routes as problemsRoutes } from './routes/problems.route';
import { routes as testcasesRoutes } from './routes/testcases.route';

app.register(multipart, {
  prefix: '/testcases',
  limits: {
    fileSize: 20971520,
  },
});
app.register(problemsRoutes, { prefix: '/problems' });
app.register(testcasesRoutes, { prefix: '/testcases' });

export async function startServer() {
  try {
    await app.listen(3000);
  } catch (err) {
    app.log.error(err);
    throw err;
  }
}