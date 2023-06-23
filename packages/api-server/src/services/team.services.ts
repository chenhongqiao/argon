import { ClientSession, mongoClient, teamCollection, teamInvitationCollection, userCollection } from '@argoncs/common'
import { NewTeam, Team } from '@argoncs/types'
import { ConflictError, NotFoundError } from 'http-errors-enhanced'
import { nanoid } from '../utils/nanoid.utils.js'

export async function createTeam (newTeam: NewTeam, contestId: string, userId: string): Promise<{ teamId: string }> {
  const id = await nanoid()
  const team: Team = {
    ...newTeam,
    id,
    contestId,
    captain: userId,
    members: [userId]
  }
  const session = mongoClient.startSession()
  try {
    await session.withTransaction(async () => {
      await teamCollection.insertOne(team, { session })
      const { matchedCount: matchedUser } = await userCollection.updateOne({ id: userId },
        { $set: { [`teams.${contestId}`]: id } }, { session })
      if (matchedUser === 0) {
        throw new NotFoundError('User not found', { userId })
      }
    })
    return { teamId: id }
  } finally {
    await session.endSession()
  }
}

export async function createTeamInvitation (teamId: string, contestId: string, userId: string): Promise<{ invitationId: string }> {
  const session = mongoClient.startSession()
  const id = await nanoid()
  try {
    await session.withTransaction(async () => {
      const user = await userCollection.findOne({ id: userId }, { session })
      if (user == null) {
        throw new NotFoundError('User not found', { userId })
      }
      const team = await teamCollection.findOne({ id: teamId, contestId }, { session })
      if (team == null) {
        throw new NotFoundError('Team not found', { teamId })
      }
      await teamInvitationCollection.insertOne({ id, userId, teamId, contestId, createdAt: new Date() }, { session })
    })
    return { invitationId: id }
  } finally {
    await session.endSession()
  }
}

export async function completeTeamInvitation (invitationId: string, userId: string): Promise<{ modified: boolean }> {
  const session = mongoClient.startSession()
  try {
    let modifiedCount = 0
    await session.withTransaction(async () => {
      const invitation = await teamInvitationCollection.findOne({ id: invitationId }, { session })
      if (invitation == null) {
        throw new NotFoundError('No invitation for the given user found', { invitationId, userId })
      }
      if (invitation.userId !== userId) {
        throw new NotFoundError('No invitation for the given user found', { invitationId, userId })
      }

      const { teamId, contestId } = invitation
      const user = await userCollection.findOne({ id: userId }, { session })
      if (user == null) {
        throw new NotFoundError('User not found', { userId })
      }
      if (user.teams[contestId] != null || user.teams[contestId] !== teamId) {
        throw new ConflictError('User is already part of another team for this contest')
      }

      // @ts-expect-error
      // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
      const { modifiedCount: modifiedUser } = await userCollection.updateOne({ id: userId }, { $set: { [`teams.${team.contestId}`]: teamId } }, { session })
      modifiedCount += Math.floor(modifiedUser)

      const { modifiedCount: modifiedTeam } = await teamCollection.updateOne({ id: teamId, contestId }, { $addToSet: { members: userId } }, { session })
      modifiedCount += Math.floor(modifiedTeam)
    })
    return { modified: modifiedCount > 0 }
  } finally {
    await session.endSession()
  }
}

export async function makeTeamCaptain (teamId: string, contestId: string, userId: string): Promise<{ modified: boolean }> {
  const session = mongoClient.startSession()
  try {
    let modifiedCount = 0
    await session.withTransaction(async () => {
      const team = await teamCollection.findOne({ id: teamId, contestId }, { session })
      if (team == null) {
        throw new NotFoundError('Team not found', { teamId })
      }
      if (team.members.find((value) => value === userId) == null) {
        throw new NotFoundError('User is not part of the team', { userId, teamId })
      }
      const { modifiedCount: modifiedTeam } = await teamCollection.updateOne({ id: teamId, contestId }, { $set: { captain: userId } }, { session })
      modifiedCount += Math.floor(modifiedTeam)
    })
    return { modified: modifiedCount > 0 }
  } finally {
    await session.endSession()
  }
}

export async function removeTeamMember (teamId: string, contestId: string, userId: string, rootSession?: ClientSession): Promise<{ modified: boolean }> {
  const session = rootSession ?? mongoClient.startSession()
  let modifiedCount = 0
  try {
    await session.withTransaction(async () => {
      const { matchedCount: matchedTeam, modifiedCount: modifiedTeam } = await teamCollection.updateOne({ id: teamId, contestId }, { $pull: { members: userId } }, { session })
      if (matchedTeam === 0) {
        throw new NotFoundError('Team not found', { teamId })
      }
      modifiedCount += Math.floor(modifiedTeam)

      const team = await teamCollection.findOne({ id: teamId, contestId }, { session })
      if (team == null) {
        throw new NotFoundError('Team not found', { teamId })
      }
      // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
      const { matchedCount: matchedUser, modifiedCount: modifiedUser } = await userCollection.updateOne({ id: userId }, { $unset: { [`members.${team.contestId}`]: '' } }, { session })
      if (matchedUser === 0) {
        throw new NotFoundError('User not found', { userId })
      }
      modifiedCount += Math.floor(modifiedUser)
    })
    return { modified: modifiedCount > 0 }
  } finally {
    await session.endSession()
  }
}
