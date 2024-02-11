import { uploadFile } from './testcase.services.js'
import { nanoid } from 'nanoid'
import { type Constraints, type NewProblem } from '@argoncs/types'
import { type MultipartFile } from '@fastify/multipart'
import { exec as exec_sync } from 'node:child_process'
import { promisify } from 'node:util'
import fs from 'node:fs/promises'
import path from 'node:path'
import { BadRequestError } from 'http-errors-enhanced'
import { domainProblemCollection } from '@argoncs/common'

const exec = promisify(exec_sync)

/* Extracts content from polygon package archive, updates problem data, and uploads testcases */
export async function uploadPolygon (
  domainId: string,
  problemId: string,
  archive: MultipartFile
): Promise<void> {
  // Make working directory
  const work_path = path.join(process.cwd(), `temp-${await nanoid()}`)
  await fs.mkdir(work_path)

  // Copy archive into directory
  await fs.writeFile(path.join(work_path, 'archive'), archive.file)

  // Unzip Archive
  const archive_path = path.join(work_path, 'archive')
  const { stderr } = await exec(`unzip ${archive_path} -d ${work_path}`)

  if (stderr) {
    console.log(stderr)
    throw new BadRequestError('Couldnot unzip package archive')
  }
  console.log(`== Finished Unzipping. ${archive_path} => ${work_path}`)

  // Extract Statement
  const problem_props = await fs.readFile(path.join(work_path, 'statements/english/problem-properties.json'))
  const statement = JSON.parse(problem_props.toString())
  console.log('statement: ', statement)

  // Extract Constraints
  const constraints: Constraints = {
    memory: statement.memoryLimit / 1024,
    time: statement.timeLimit
  }

  // Extract context
  const context = statement.legend + '\n\n' + statement.notes

  // Create Problem
  const problem: NewProblem = {
    name: statement.name,
    context,
    inputFormat: statement.input,
    outputFormat: statement.output,
    samples: [],
    constraints
  }

  // Extract Testcases
  // Get testcase names
  const file_names = await fs.readdir(path.join(work_path, 'tests'))
  const test_names = file_names.filter(file => file !== 'archive' && !file.endsWith('.a'))
  const test_n = test_names.length
  problem.testcases = []
  console.log(test_names)

  // For each file, upload file and answer.
  for (const name of test_names) {
    const input_file = await fs.open(path.join(work_path, 'tests', name))
    const output_file = await fs.open(path.join(work_path, 'tests', name + '.a'))

    const input = await uploadFile(domainId, problemId, name, input_file.createReadStream())
    const output = await uploadFile(domainId, problemId, name + '-ans', output_file.createReadStream())

    problem.testcases.push({
      input,
      output,
      points: 100 / test_n
    })
  }

  console.log('problem: ', problem)

  // Update problem
  // Assuming the token is correct, the problem must exist.
  await domainProblemCollection.updateOne({ id: problemId, domainId }, { $set: problem })

  /* Cleanup working directory */
  await exec(`rm -rf ${work_path}`)
}
