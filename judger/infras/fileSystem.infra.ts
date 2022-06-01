import {promises as fs} from 'fs';
import {NotFoundError} from '../classes/error.class';

interface ReadFileResult {
  data: Buffer;
}

interface WriteFileResult {
  path: string;
}

export class FileSystem {
  static async read(path: string): Promise<ReadFileResult> {
    try {
      const data = await fs.readFile(path);
      return {data};
    } catch (err: any) {
      const {code} = err;
      if (code === 'ENONET') {
        throw new NotFoundError(`${code} File not found`, path);
      } else {
        throw err;
      }
    }
  }

  static async write(path: string, data: Buffer): Promise<WriteFileResult> {
    try {
      await fs.writeFile(path, data);
      return {path};
    } catch (err: any) {
      const {code} = err;
      if (code === 'ENONET') {
        throw new NotFoundError(
          `${code} Parent directory does not exist`,
          path
        );
      } else {
        throw err;
      }
    }
  }
}
