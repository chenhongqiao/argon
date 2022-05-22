import {promises as fs} from 'fs';
import {NotFoundError} from '../classes/error.class';

export class FileSystem {
  static async read(path: string): Promise<Buffer> {
    try {
      return fs.readFile(path);
    } catch (err: any) {
      const {code} = err;
      if (code === 'ENONET') {
        throw new NotFoundError(`${code} File not found`, path);
      } else {
        throw err;
      }
    }
  }

  static async write(path: string, data: Buffer): Promise<string> {
    try {
      await fs.writeFile(path, data);
      return path;
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
