import { type Submission } from '@argoncs/types'
import { NotFoundError } from 'http-errors-enhanced'
import { submissionCollection } from '../connections/mongodb.connections.js'

export async function fetchSubmission ({ submissionId }: { submissionId: string }): Promise<Submission> {
  const submission = await submissionCollection.findOne({ id: submissionId })
  if (submission == null) {
    throw new NotFoundError('Submission not found')
  }
  return submission
}
