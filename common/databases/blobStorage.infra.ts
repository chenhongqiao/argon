import {BlobServiceClient} from '@azure/storage-blob';

import * as FileSystem from './fileSystem.infra';

import {AzureError, NotFoundError} from '../classes/error.class';

const client = BlobServiceClient.fromConnectionString(
  'DefaultEndpointsProtocol=https;AccountName=tcprojectcarbondev;AccountKey=oDxdOJE/10uDti7ru//wQjQYIFku0vAAowHGM5itT9Q4EskCHuz5XYwvQw/JUw3R0Nr6YhbFETvjnPCP6o1dUw==;EndpointSuffix=core.windows.net'
);

interface UploadResult {
  containerName: string;
  blobName: string;
}

export async function uploadFromDisk(
  path: string,
  containerName: string,
  blobName: string
): Promise<UploadResult> {
  const data = (await FileSystem.read(path)).data;
  console.log(containerName);
  const container = client.getContainerClient(containerName);
  const blob = container.getBlockBlobClient(blobName);
  const uploadResult = await blob.uploadData(data);
  if (uploadResult.errorCode) {
    throw new AzureError('Uplaod failed', uploadResult);
  }
  return {blobName, containerName};
}

interface DownloadToDiskResult {
  path: string;
}

export async function downloadToDisk(
  path: string,
  containerName: string,
  blobName: string
): Promise<DownloadToDiskResult> {
  const container = client.getContainerClient(containerName);
  const blob = container.getBlockBlobClient(blobName);
  let data: Buffer;
  try {
    data = await blob.downloadToBuffer();
  } catch (err: any) {
    if (err.statusCode === 404) {
      throw new NotFoundError('Blob not found', err.request.url);
    } else {
      throw err;
    }
  }
  await FileSystem.write(path, data);
  return {path};
}

interface BlobHash {
  md5: string;
}

export async function getBlobHash(
  containerName: string,
  blobName: string
): Promise<BlobHash> {
  const container = client.getContainerClient(containerName);
  const blob = container.getBlockBlobClient(blobName);
  try {
    const meta = await blob.getProperties();
    if (meta.contentMD5) {
      return {md5: meta.contentMD5.toString()};
    } else {
      return {md5: '!'};
    }
  } catch (err: any) {
    if (err.statusCode === 404) {
      throw new NotFoundError('Blob not found', err.request.url);
    } else {
      throw err;
    }
  }
}

export async function uploadBuffer(
  data: Buffer,
  containerName: string,
  blobName: string
): Promise<UploadResult> {
  const container = client.getContainerClient(containerName);
  const blob = container.getBlockBlobClient(blobName);
  const uploadResult = await blob.uploadData(data);
  if (uploadResult.errorCode) {
    throw new AzureError('Uplaod failed', uploadResult);
  }
  return {blobName, containerName};
}

interface DownloadBufferResult {
  data: Buffer;
}

export async function downloadBuffer(
  containerName: string,
  blobName: string
): Promise<DownloadBufferResult> {
  const container = client.getContainerClient(containerName);
  const blob = container.getBlockBlobClient(blobName);
  let data: Buffer;
  try {
    data = await blob.downloadToBuffer();
  } catch (err: any) {
    if (err.statusCode === 404) {
      throw new NotFoundError('Blob not found', err.request.url);
    } else {
      throw err;
    }
  }
  return {data};
}
