import { type Static, Type } from '@sinclair/typebox'
import { ContestProblemSchema } from './problem.types.js'

export const NewContestSchema = Type.Object({
  name: Type.String(),
  description: Type.String(),
  startTime: Type.Number(),
  endTime: Type.Number(),
  teamSize: Type.Number(),
  handle: Type.String(),
  seriesId: Type.String()
}, { additionalProperties: false })
export type NewContest = Static<typeof NewContestSchema>

export const ContestSchema = Type.Object({
  name: Type.String(),
  description: Type.String(),
  startTime: Type.Number(),
  endTime: Type.Number(),
  teamSize: Type.Number(),
  handle: Type.String(),
  seriesId: Type.String(),

  domainId: Type.String(),
  id: Type.String(),
  published: Type.Boolean()
})
export type Contest = Static<typeof ContestSchema>

export const ContestProblemListSchema = Type.Object({
  id: Type.String(),
  problems: Type.Array(Type.Pick(ContestProblemSchema, ['id', 'name']))
})
export type ConetstProblemList = Static<typeof ContestProblemListSchema>

export const NewContestSeriesSchema = Type.Object({
  name: Type.String()
})
export type NewContestSeries = Static<typeof NewContestSeriesSchema>

export const ContestSeriesSchema = Type.Object({
  name: Type.String(),

  contests: Type.Array(Type.String()),
  id: Type.String(),
  domainId: Type.String()
})
export type ContestSeries = Static<typeof ContestSeriesSchema>
