import { FastifyPluginCallback } from 'fastify'

import {
  compileSubmission,
  completeGrading,
  createSubmission,
  fetchSubmission,
  handleCompileResult,
  handleGradingResult
} from '../services/submissions.service'
import {
  CompileResultSchema,
  CompilingSubmissionSchema,
  FailedSubmissionSchema,
  GradedSubmissionSchema,
  GradingResultSchema,
  GradingSubmissionSchema,
  NewSubmissionSchema,
  NotFoundError
} from '@project-carbon/shared'

import { TypeBoxTypeProvider } from '@fastify/type-provider-typebox'
import { Type } from '@sinclair/typebox'

export const submissionsRoutes: FastifyPluginCallback = (app, options, done) => {
  const route = app.withTypeProvider<TypeBoxTypeProvider>()
  route.post(
    '/',
    {
      schema: {
        body: NewSubmissionSchema,
        response: {
          201: Type.Object({ submissionID: Type.String() }),
          500: Type.Object({ message: Type.String() })
        }
      }
    },
    async (request, reply) => {
      const submission = request.body
      try {
        const result = await createSubmission(submission)
        await compileSubmission(result.submissionID)
        void reply.status(201).send(result)
      } catch (err) {
        void reply.status(500).send({ message: 'Server error' })
      }
    }
  )

  route.post(
    '/:submissionID/compileResult',
    {
      schema: {
        params: Type.Object({ submissionID: Type.String() }),
        body: CompileResultSchema
      }
    }, async (request, reply) => {
      const { submissionID } = request.params
      const compileResult = request.body
      try {
        await handleCompileResult(compileResult, submissionID)
      } catch (err) {
        await completeGrading(submissionID, err.message ?? 'Grading terminated due to an error')
      }
      void reply.status(204).send()
    }
  )

  route.post(
    '/:submissionID/gradingResult/:testcaseIndex',
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
        await completeGrading(submissionID, err.message ?? 'Grading terminated due to an error')
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
          200: Type.Union([CompilingSubmissionSchema, GradedSubmissionSchema, GradingSubmissionSchema, FailedSubmissionSchema]),
          404: Type.Object({ message: Type.String() }),
          500: Type.Object({ message: Type.String() })
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
          void reply.status(404).send({ message: 'Submission not found' })
        } else {
          void reply.status(500).send({ message: 'Server error' })
        }
      }
    }
  )
  done()
}
