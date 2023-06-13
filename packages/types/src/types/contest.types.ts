import { Static, Type } from '@sinclair/typebox'

export const NewContestSchema = Type.Object({
  name: Type.String(),
  description: Type.String(),
  startTime: Type.Number(),
  endTime: Type.Number(),
  teamSize: Type.Number()
}, { additionalProperties: false })
export type NewContest = Static<typeof NewContestSchema>

export const ContestSchema = Type.Intersect([NewContestSchema, Type.Object({
  domainId: Type.String(),
  id: Type.String()
})])
export type Contest = Static<typeof ContestSchema>

export const NewTeamSchema = Type.Object({
  name: Type.String(),
  contestId: Type.String()
})
