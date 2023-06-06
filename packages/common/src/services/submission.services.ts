import { ContestSubmission, TestingSubmission } from '@argoncs/types'
import { NotFoundError } from 'http-errors-enhanced'
import { mongoDB } from '../connections/mongodb.connections'

const submissionCollection = mongoDB.collection<TestingSubmission | ContestSubmission>('submissions')

export async function fetchSubmission (submissionId: string): Promise<TestingSubmission | ContestSubmission> {
  const submission = await submissionCollection.findOne({ id: submissionId })
  if (submission == null) {
    throw new NotFoundError('No submission found with the given ID.', { submissionId })
  }
  return submission
}
