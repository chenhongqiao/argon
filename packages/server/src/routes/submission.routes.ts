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
} from '@chenhongqiao/carbon-common'

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
      const result = await createSubmission(submission)
      await compileSubmission(result.submissionID)
      void reply.status(201).send(result)
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
      void reply.status(204).send()
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
      void reply.status(204).send()
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
        const result = await fetchSubmission(submissionID)
        void reply.status(200).send(result)
      } catch (err) {
        if (err instanceof NotFoundError) {
          void reply.status(404).send({ message: 'Submission not found.' })
        } else {
          throw err
        }
      }
    }
  )
  done()
}
