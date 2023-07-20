import { teamScoreCollection } from '../connections/mongodb.connections.js'

export async function recalculateTeamTotalScore ({ contestId, teamId = undefined }: { contestId: string, teamId?: string }): Promise<void> {
  const query = teamId != null ? { contestId, id: teamId } : { contestId }
  await teamScoreCollection.updateMany(query, [
    {
      $project: { scores: { $objectToArray: '$scores' } }
    },
    {
      $set: { totalScore: { $sum: '$scores.v' } }
    }
  ])

  await teamScoreCollection.updateMany(query, [
    {
      $project: { time: { $objectToArray: '$time' } }
    },
    {
      $set: { lastTime: { $max: '$time.v' } }
    }
  ])
}
