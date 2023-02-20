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
  domainId: Type.RegEx(/^[a-f\d]{24}$/i),
  id: Type.RegEx(/^[a-f\d]{24}$/i)
})])
export type Contest = Static<typeof ContestSchema>
