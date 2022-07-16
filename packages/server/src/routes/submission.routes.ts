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
} from '@pccs/common'

import { TypeBoxTypeProvider } from '@fastify/type-provider-typebox'
import { Type } from '@sinclair/typebox'

export const submissionRoutes: FastifyPluginCallback = (app, options, done) => {
  const route = app.withTypeProvider<TypeBoxTypeProvider>()
  route.post(
    '/',
    {
      schema: {
        body: NewSubmissionSchema,
        response: {
          201: Type.Object({ submissionID: Type.String() })
        }
      }
    },
    async (request, reply) => {
      const submission = request.body
      const created = await createSubmission(submission)
      await compileSubmission(created.submissionID)
      return await reply.status(201).send(created)
    }
  )

  route.put(
    '/:submissionID/compiling-result',
    {
      schema: {
        params: Type.Object({ submissionID: Type.String() }),
        body: CompilingResultSchema
      }
    }, async (request, reply) => {
      const { submissionID } = request.params
      const compileResult = request.body
      try {
        await handleCompileResult(compileResult, submissionID)
      } catch (err) {
        await completeGrading(submissionID, err.message ?? 'Grading terminated due to an error.')
      }
      return await reply.status(204).send()
    }
  )

  route.put(
    '/:submissionID/testcase-result/:testcaseIndex',
    {
      schema: {
        params: Type.Object({ submissionID: Type.String(), testcaseIndex: Type.String() }),
        body: GradingResultSchema
      }
    }, async (request, reply) => {
      const { submissionID, testcaseIndex } = request.params
      const gradingResult = request.body
      try {
        await handleGradingResult(gradingResult, submissionID, testcaseIndex)
      } catch (err) {
        await completeGrading(submissionID, err.message ?? 'Grading terminated due to an error.')
      }
      return await reply.status(204).send()
    }
  )

  route.get(
    '/:submissionID',
    {
      schema: {
        params: Type.Object({ submissionID: Type.String() }),
        response: {
          200: SubmissionResultSchema,
          404: Type.Object({ message: Type.String() })
        }
      }
    },
    async (request, reply) => {
      const { submissionID } = request.params
      try {
        const submission = await fetchSubmission(submissionID)
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
  done()
}
