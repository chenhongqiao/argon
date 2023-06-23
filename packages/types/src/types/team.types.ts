import { Static, Type } from '@sinclair/typebox'

export const NewTeamSchema = Type.Object({
  name: Type.String()
}, { additionalProperties: false })
export type NewTeam = Static<typeof NewTeamSchema>

export const TeamSchema = Type.Intersect([NewTeamSchema, Type.Object({
  id: Type.String(),
  contestId: Type.String(),
  captain: Type.String(),
  members: Type.Array(Type.String())
})])
export type Team = Static<typeof TeamSchema>

export interface TeamInvitation {
  id: string
  teamId: string
  userId: string
  contestId: string
  createdAt: Date
}
