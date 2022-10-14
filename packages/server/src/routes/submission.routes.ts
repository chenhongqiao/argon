import { FastifyPluginCallback } from 'fastify'

import {
  compileSubmission,
  completeGrading,
  createSubmission,
  fetchSubmission,
  handleCompileResult,
  handleGradingResult
} from '../services/submission.services'
import {
  CompilingResultSchema,
  GradingResultSchema,
  NewSubmissionSchema,
  NotFoundError,
  SubmissionResultSchema
} from '@project-carbon/shared'

import { TypeBoxTypeProvider } from '@fastify/type-provider-typebox'
import { Type } from '@sinclair/typebox'

export const submissionRoutes: FastifyPluginCallback = (app, options, done) => {
  const authned = app.withTypeProvider<TypeBoxTypeProvider>()
  authned.addHook('onRequest', async (request, reply) => {
    try {
      await request.jwtVerify()
    } catch (err) {
      await reply.status(401).send('Please login first.')
    }
  })

  authned.post(
    '/',
    {
      schema: {
        body: NewSubmissionSchema,
        response: {
          201: Type.Object({ submissionId: Type.String() })
        }
      }
    },
    async (request, reply) => {
      const submission = request.body
      const created = await createSubmission(submission, request.user.userId)
      await compileSubmission(created.submissionId)
      return await reply.status(201).send(created)
    }
  )

  authned.get(
    '/:submissionId',
    {
      schema: {
        params: Type.Object({ submissionId: Type.String() }),
        response: {
          200: SubmissionResultSchema,
          404: Type.Object({ message: Type.String() })
        }
      }
    },
    async (request, reply) => {
      const { submissionId } = request.params
      try {
        const submission = await fetchSubmission(submissionId)
        return await reply.status(200).send(submission)
      } catch (err) {
        if (err instanceof NotFoundError) {
          return await reply.status(404).send({ message: 'Submission not found.' })
        } else {
          throw err
        }
      }
    }
  )

  const judger = app.withTypeProvider<TypeBoxTypeProvider>()
  judger.put(
    '/:submissionId/compiling-result',
    {
      schema: {
        params: Type.Object({ submissionId: Type.String() }),
        body: CompilingResultSchema
      }
    }, async (request, reply) => {
      const { submissionId } = request.params
      const compileResult = request.body
      try {
        await handleCompileResult(compileResult, submissionId)
      } catch (err) {
        await completeGrading(submissionId, err.message ?? 'Grading terminated due to an error.')
      }
      return await reply.status(204).send()
    }
  )

  judger.put(
    '/:submissionId/testcase-result/:testcaseIndex',
    {
      schema: {
        params: Type.Object({ submissionId: Type.String(), testcaseIndex: Type.String() }),
        body: GradingResultSchema
      }
    }, async (request, reply) => {
      const { submissionId, testcaseIndex } = request.params
      const gradingResult = request.body
      try {
        await handleGradingResult(gradingResult, submissionId, testcaseIndex)
      } catch (err) {
        await completeGrading(submissionId, err.message ?? 'Grading terminated due to an error.')
      }
      return await reply.status(204).send()
    }
  )
  return done()
}
