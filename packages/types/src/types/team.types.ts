import { Static, Type } from '@sinclair/typebox'
import { PublicUserProfileSchema } from './user.types.js'

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

export const TeamInvitationSchema = Type.Object({
  id: Type.String(),
  teamId: Type.String(),
  userId: Type.String(),
  contestId: Type.String(),
  createdAt: Type.Number()
})
export type TeamInvitation = Static<typeof TeamInvitationSchema>

export const TeamMembersSchema = Type.Array(PublicUserProfileSchema)
export type TeamMembers = Static<typeof TeamMembersSchema>

export const TeamScoreSchema = Type.Object({
  id: Type.String(),
  scores: Type.Record(Type.String(), Type.Number()),
  time: Type.Record(Type.String(), Type.Number()),
  totalScore: Type.Number(),
  lastTime: Type.Number()
})
export type TeamScore = Static<typeof TeamScoreSchema>
