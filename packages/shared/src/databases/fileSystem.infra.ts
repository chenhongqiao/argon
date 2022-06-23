import { promises as fs } from 'fs'
import { NotFoundError } from '../classes/error.class'

interface FileData {
  data: Buffer
}

export interface FileInfo {
  path: string
}

export async function readFile (path: string): Promise<FileData> {
  try {
    const data = await fs.readFile(path)
    return { data }
  } catch (err: any) {
    const code: string = err.code.toString()
    if (code === 'ENONET') {
      throw new NotFoundError(`${code} File not found`, path)
    } else {
      throw err
    }
  }
}

export async function writeFile (
  path: string,
  data: Buffer
): Promise<FileInfo> {
  try {
    await fs.writeFile(path, data)
    return { path }
  } catch (err: any) {
    const code: string = err.code.toString()
    if (code === 'ENONET') {
      throw new NotFoundError(`${code} Parent directory does not exist`, path)
    } else {
      throw err
    }
  }
}
