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
  domainId: Type.String({ minLength: 12, maxLength: 12 }),
  id: Type.String({ minLength: 12, maxLength: 12 })
})])
export type Contest = Static<typeof ContestSchema>
