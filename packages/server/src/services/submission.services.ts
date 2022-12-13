import {
  CompilingResult,
  CompilingStatus,
  CompilingTask,
  DataError,
  GradingTask,
  GradingResult,
  JudgerTaskType,
  NewSubmission,
  NotFoundError,
  Problem,
  SubmissionStatus,
  ContestSubmission,
  TestingSubmission,
  SubmissionType,
  TestingSubmissionWithoutIds,
  ContestSubmissionWithoutIds,
  GradingStatus
} from '@argoncs/types'
import { messageSender, mongoDB, ObjectId } from '@argoncs/libraries'
import { languageConfigs } from '@argoncs/configs'

import { fetchFromProblemBank } from './problem.services'

type TestingSubmissionDB = TestingSubmissionWithoutIds & { _id?: ObjectId, domains_id: ObjectId, problemBank_id: ObjectId }
type ContestSubmissionDB = ContestSubmissionWithoutIds & { _id?: ObjectId, contests_id: ObjectId, contestProblems_id: ObjectId }

const submissionCollection = mongoDB.collection<TestingSubmissionDB | ContestSubmissionDB>('submissions')

export async function createTestingSubmission (submission: NewSubmission, domainId: string, problemId: string, userId: string): Promise<{ submissionId: string }> {
  const pendingSubmission: TestingSubmissionDB = {
    ...submission,
    status: SubmissionStatus.Pending,
    domains_id: new ObjectId(domainId),
    problemBank_id: new ObjectId(problemId),
    type: SubmissionType.Testing
  }

  const { insertedId } = await submissionCollection.insertOne(pendingSubmission)
  return { submissionId: insertedId.toString() }
}

export async function queueSubmission (submissionId: string): Promise<void> {
  const submission = await fetchSubmission(submissionId)

  const task: CompilingTask = {
    submissionId: submission.id,
    type: JudgerTaskType.Compiling,
    source: submission.source,
    language: submission.language,
    constraints: languageConfigs[submission.language].constraints
  }
  const batch = await messageSender.createMessageBatch()
  if (!batch.tryAddMessage({ body: task })) {
    throw new DataError('Task too big to fit in the queue.', task)
  }
  await messageSender.sendMessages(batch)
}

export async function markSubmissionAsCompiling (submissionId: string): Promise<void> {
  await submissionCollection.updateOne({ _id: new ObjectId(submissionId) }, {
    $set: {
      status: SubmissionStatus.Compiling
    }
  })
}

export async function handleCompileResult (compileResult: CompilingResult, submissionId: string): Promise<void> {
  const submission = await fetchSubmission(submissionId)

  if (submission.status === SubmissionStatus.Compiling) {
    if (compileResult.status === CompilingStatus.Succeeded) {
      const batch = await messageSender.createMessageBatch()
      let problem: Problem
      if (submission.type === SubmissionType.Testing) {
        problem = await fetchFromProblemBank(submission.problemId, submission.domainId)
      } else {
        // Fetch Contest Problem
        // TODO
      }
      const submissionTestcases: Array<{ points: number, input: string, output: string }> = []
      // @ts-expect-error: TODO
      problem.testcases.forEach((testcase, index) => {
        const task: GradingTask = {
          constraints: problem.constraints,
          type: JudgerTaskType.Grading,
          submissionId,
          testcase: {
            input: testcase.input,
            output: testcase.output
          },
          testcaseIndex: index,
          language: submission.language
        }
        if (!batch.tryAddMessage({ body: task })) {
          throw new DataError('Task too big to fit in the queue.', task)
        }
        submissionTestcases.push({ points: testcase.points, input: testcase.input, output: testcase.output })
      })

      await submissionCollection.updateOne({ _id: new ObjectId(submissionId) }, {
        $set: {
          status: SubmissionStatus.Grading,
          gradedCases: 0,
          testcases: submissionTestcases
        }
      })
      await messageSender.sendMessages(batch)
    } else {
      await submissionCollection.updateOne({ _id: new ObjectId(submissionId) }, {
        $set: {
          status: SubmissionStatus.CompileFailed,
          log: compileResult.log
        }
      })
    }
  }
}

export async function completeGrading (submissionId: string, log?: string): Promise<void> {
  const submission = await fetchSubmission(submissionId)

  if (submission.status === SubmissionStatus.Compiling || submission.status === SubmissionStatus.Pending) {
    await submissionCollection.updateOne({ _id: new ObjectId(submissionId) }, { $set: { status: SubmissionStatus.Terminated, log } })
  } else if (submission.status === SubmissionStatus.Grading) {
    if (submission.gradedCases !== submission.testcases.length) {
      await submissionCollection.updateOne({ _id: new ObjectId(submissionId) }, { $set: { status: SubmissionStatus.Terminated, log } })
    } else {
      // eslint-disable-next-line @typescript-eslint/restrict-plus-operands
      const score = submission.testcases.reduce((accumulator: number, testcase) => accumulator + (testcase.score ?? 0), 0)
      await submissionCollection.updateOne({ _id: new ObjectId(submissionId) }, {
        $set: {
          score,
          status: SubmissionStatus.Graded
        },
        $unset: {
          gradedCases: ''
        }
      })
    }
  }
}

export async function handleGradingResult (gradingResult: GradingResult, submissionId: string, testcaseIndex: number): Promise<void> {
  const submission = await fetchSubmission(submissionId)

  if (submission.status === SubmissionStatus.Grading) {
    if (submission.testcases[testcaseIndex] == null) {
      throw new NotFoundError('Testcase not found by index.', { testcaseIndex, submissionId })
    }
    const score = gradingResult.status === GradingStatus.Accepted ? submission.testcases[testcaseIndex].score : 0
    submission.testcases[testcaseIndex].result = gradingResult
    await submissionCollection.updateOne({ _id: new ObjectId(submissionId) }, {
      $set: {
        'testcases.$[index].result': gradingResult,
        'testcases.$[index].score': score
      }
    },
    { arrayFilters: [{ index: testcaseIndex }] })

    if (submission.gradedCases === submission.testcases.length) {
      await completeGrading(submissionId)
    }
  }
}

export async function fetchSubmission (submissionId: string): Promise<TestingSubmission | ContestSubmission> {
  const submission = await submissionCollection.findOne({ _id: new ObjectId(submissionId) })
  if (submission == null) {
    throw new NotFoundError('Submission does not exist.', { submissionId })
  }
  if (submission.type === SubmissionType.Testing) {
    const { _id, domains_id, problemBank_id, ...submissionContent } = submission
    return { ...submissionContent, id: _id.toString(), domainId: domains_id.toString(), problemId: problemBank_id.toString() }
  } else {
    const { _id, contests_id, contestProblems_id, ...submissionContent } = submission
    return { ...submissionContent, id: _id.toString(), contestId: contests_id.toString(), problemId: contestProblems_id.toString() }
  }
}
