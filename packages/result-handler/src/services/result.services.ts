import { fetchContestProblem, fetchDomainProblem, fetchSubmission, judgerExchange, judgerTasksKey, rabbitMQ, submissionCollection } from '@argoncs/common'
import { CompilingResult, CompilingStatus, GradingResult, GradingStatus, GradingTask, JudgerTaskType, Problem, SubmissionStatus } from '@argoncs/types'
import { NotFoundError } from 'http-errors-enhanced'
import path from 'path'

export async function handleCompileResult (compileResult: CompilingResult, submissionId: string): Promise<void> {
  const submission = await fetchSubmission(submissionId)

  if (submission.status === SubmissionStatus.Compiling) {
    if (compileResult.status === CompilingStatus.Succeeded) {
      let problem: Problem
      if (submission.contestId == null) {
        problem = await fetchDomainProblem(submission.problemId, submission.domainId)
      } else {
        problem = await fetchContestProblem(submission.problemId, submission.contestId)
      }
      const submissionTestcases: Array<{ points: number, input: { name: string, versionId: string }, output: { name: string, versionId: string } }> = []
      if (problem.testcases == null) {
        return await completeGrading(submissionId, 'Problem does not have testcases')
      }
      problem.testcases.forEach((testcase, index) => {
        const task: GradingTask = {
          constraints: problem.constraints,
          type: JudgerTaskType.Grading,
          submissionId,
          testcase: {
            input: {
              objectName: path.join(problem.domainId, problem.id, testcase.input.name),
              versionId: testcase.input.versionId
            },
            output: {
              objectName: path.join(problem.domainId, problem.id, testcase.output.name),
              versionId: testcase.output.versionId
            }
          },
          testcaseIndex: index,
          language: submission.language
        }
        rabbitMQ.publish(judgerExchange, judgerTasksKey, Buffer.from(JSON.stringify(task)))
        submissionTestcases.push({ points: testcase.points, input: testcase.input, output: testcase.output })
      })

      await submissionCollection.updateOne({ id: submissionId }, {
        // @ts-expect-error
        $set: {
          status: SubmissionStatus.Grading,
          gradedCases: 0,
          testcases: submissionTestcases
        }
      })
    } else {
      await submissionCollection.updateOne({ id: submissionId }, {
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

  if (submission.status === SubmissionStatus.Compiling) {
    await submissionCollection.updateOne({ id: submissionId }, { $set: { status: SubmissionStatus.Terminated, log } })
  } else if (submission.status === SubmissionStatus.Grading) {
    if (submission.gradedCases !== submission.testcases.length) {
      await submissionCollection.updateOne({ id: submissionId }, { $set: { status: SubmissionStatus.Terminated, log } })
    } else {
      // eslint-disable-next-line @typescript-eslint/restrict-plus-operands
      const score = submission.testcases.reduce((accumulator: number, testcase) => accumulator + (testcase.score ?? 0), 0)
      await submissionCollection.updateOne({ id: submissionId }, {
        $set: {
          score,
          status: SubmissionStatus.Graded
        },
        $unset: {
          // @ts-expect-error
          gradedCases: ''
        }
      })

      // TODO: update contest ranklist
    }
  }
}

export async function handleGradingResult (gradingResult: GradingResult, submissionId: string, testcaseIndex: number): Promise<void> {
  const submission = await fetchSubmission(submissionId)

  if (submission.status === SubmissionStatus.Grading) {
    if (submission.testcases[testcaseIndex] == null) {
      throw new NotFoundError('No testcase found at the given index')
    }
    const score = gradingResult.status === GradingStatus.Accepted ? submission.testcases[testcaseIndex].points : 0
    submission.testcases[testcaseIndex].result = gradingResult
    await submissionCollection.updateOne({ id: submissionId }, {
      $set: {
        [`testcases.${testcaseIndex}.result`]: gradingResult,
        [`testcases.${testcaseIndex}.score`]: score
      },
      $inc: {
        gradedCases: 1,
        score
      }
    })

    const updatedSubmission = await fetchSubmission(submissionId)
    if (updatedSubmission.status === SubmissionStatus.Grading) {
      if (updatedSubmission.gradedCases === updatedSubmission.testcases.length) {
        await completeGrading(submissionId)
      }
    }
  }
}
