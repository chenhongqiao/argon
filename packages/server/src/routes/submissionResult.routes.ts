import { FastifyPluginCallback } from 'fastify'

import {
  completeGrading,
  handleCompileResult,
  handleGradingResult
} from '../services/submission.services'
import {
  CompilingResultSchema,
  GradingResultSchema
} from '@project-carbon/shared'

import { TypeBoxTypeProvider } from '@fastify/type-provider-typebox'
import { Type } from '@sinclair/typebox'

export const submissionRoutes: FastifyPluginCallback = (app, options, done) => {
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
        params: Type.Object({ submissionId: Type.String(), testcaseIndex: Type.Number() }),
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
