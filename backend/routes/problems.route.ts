import {FastifyInstance} from 'fastify';

import * as ProblemsService from '../services/problems.service';

import {NotFoundError} from '../../common/classes/error.class';

import {Type} from '@sinclair/typebox';

export async function routes(app: FastifyInstance) {
  app.post<{Body: ProblemsService.NewProblem}>(
    '/',
    {
      schema: {
        body: ProblemsService.NewProblemSchema,
        response: {
          200: {type: 'object', properties: {id: {type: 'string'}}},
          500: {type: 'object', properties: {message: {type: 'string'}}},
        },
      },
    },
    async (request, reply) => {
      const problem = request.body;
      try {
        const result = await ProblemsService.create(problem);
        reply.status(200).send(result);
      } catch (err) {
        reply.status(500).send({message: 'Server error'});
      }
    }
  );

  app.get<{Params: {problemID: string}}>(
    '/:problemID',
    {
      schema: {
        params: {
          problemID: {type: 'string'},
        },
        response: {
          200: ProblemsService.ProblemSchema,
          404: {type: 'object', properties: {message: {type: 'string'}}},
          500: {type: 'object', properties: {message: {type: 'string'}}},
        },
      },
    },
    async (request, reply) => {
      const {problemID} = request.params;
      try {
        const problem = await ProblemsService.fetch(problemID);
        reply.status(200).send(problem);
      } catch (err) {
        if (err instanceof NotFoundError) {
          reply.status(404).send({message: 'Problem not found'});
        } else {
          reply.status(500).send({message: 'Server error'});
        }
      }
    }
  );

  app.get<{Params: {problemID: string}}>(
    '/',
    {
      schema: {
        response: {
          200: Type.Array(ProblemsService.ProblemSchema),
          500: {type: 'object', properties: {message: {type: 'string'}}},
        },
      },
    },
    async (request, reply) => {
      try {
        const problems = await ProblemsService.fetchAll();
        reply.status(200).send(problems);
      } catch (err) {
        reply.status(500).send({message: 'Server error'});
      }
    }
  );

  app.put<{Body: ProblemsService.Problem}>(
    '/',
    {
      schema: {
        body: ProblemsService.ProblemSchema,
        response: {
          200: {type: 'object', properties: {id: {type: 'string'}}},
          400: {type: 'object', properties: {message: {type: 'string'}}},
          500: {type: 'object', properties: {message: {type: 'string'}}},
        },
      },
    },
    async (request, reply) => {
      try {
        const problem = request.body;
        const result = await ProblemsService.update(problem);
        reply.status(200).send(result);
      } catch (err) {
        if (err instanceof NotFoundError) {
          reply.status(404).send({message: 'Problem not found'});
        } else {
          reply.status(500).send({message: 'Server error'});
        }
      }
    }
  );

  app.delete<{Params: {problemID: string}}>(
    '/:problemID',
    {
      schema: {
        params: {
          problemID: {type: 'string'},
        },
        response: {
          200: {type: 'object', properties: {id: {type: 'string'}}},
          404: {type: 'object', properties: {message: {type: 'string'}}},
          500: {type: 'object', properties: {message: {type: 'string'}}},
        },
      },
    },
    async (request, reply) => {
      const {problemID} = request.params;
      try {
        const result = await ProblemsService.remove(problemID);
        reply.status(200).send(result);
      } catch (err) {
        if (err instanceof NotFoundError) {
          reply.status(404).send({message: 'Problem not found'});
        } else {
          reply.status(500).send({message: 'Server error'});
        }
      }
    }
  );
}
