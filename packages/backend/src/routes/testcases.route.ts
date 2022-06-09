import { FastifyInstance } from 'fastify';

import * as TestcasesService from '../services/testcases.service';

export async function routes(app: FastifyInstance) {
  app.post(
    '/',
    {
      schema: {
        response: {
          200: {
            type: 'array',
            items: { type: 'object', properties: { id: { type: 'string' } } },
          },
          500: { type: 'object', properties: { message: { type: 'string' } } },
        },
      },
    },
    async (request, reply) => {
      const testcases = request.parts();
      const queue = [];
      try {
        for await (const file of testcases) {
          queue.push(TestcasesService.upload(file));
        }
        const results = await Promise.all(queue);
        reply.status(200).send(results);
      } catch (err) {
        console.error(err);
        reply.status(500).send({ message: 'Server error' });
      }
    }
  );
}
