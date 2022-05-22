import {BlobServiceClient} from '@azure/storage-blob';

import {FileSystem} from './fileSystem';

import {AzureError} from '../classes/error.class';

const client = BlobServiceClient.fromConnectionString(
  'DefaultEndpointsProtocol=https;AccountName=tcprojectcarbondev;AccountKey=oDxdOJE/10uDti7ru//wQjQYIFku0vAAowHGM5itT9Q4EskCHuz5XYwvQw/JUw3R0Nr6YhbFETvjnPCP6o1dUw==;EndpointSuffix=core.windows.net'
);

interface UploadResult {
  containerName: string;
  blobName: string;
}

export class BlobStorage {
  static async uploadFromDisk(
    path: string,
    containerName: string,
    blobName: string
  ): Promise<UploadResult> {
    const data = await FileSystem.read(path);
    console.log(containerName);
    const container = client.getContainerClient(containerName);
    const blob = container.getBlockBlobClient(blobName);
    const uploadResult = await blob.uploadData(data);
    if (uploadResult.errorCode) {
      throw new AzureError('Uplaod failed', uploadResult);
    }
    return {blobName, containerName};
  }
}
