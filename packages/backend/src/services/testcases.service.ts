import { randomUUID } from 'crypto';
import { Worker } from 'node:worker_threads';

import { MultipartFile } from '@fastify/multipart';

export async function upload(file: MultipartFile) {
  const testcaseID = randomUUID();
  console.log('begin');
  const data = (await file.toBuffer()).toString();
  console.log('fork');
  const result: { id: string } = await new Promise((resolve, reject) => {
    const worker = new Worker('./workers/uploadTestcase.worker.js', {
      workerData: { data, id: testcaseID },
    });
    worker.on('message', resolve);
    worker.on('error', reject);
    worker.on('exit', code => {
      if (code !== 0) {
        reject(new Error(`Worker stopped with exit code ${code}`));
      }
    });
  });
  console.log('done');
  return result;
}
