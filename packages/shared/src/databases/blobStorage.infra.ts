import { BlobServiceClient } from '@azure/storage-blob'

import { FileInfo, readFile, writeFile } from './fileSystem.infra'

import { AzureError, NotFoundError } from '../classes/error.class'

const client = BlobServiceClient.fromConnectionString(process.env.BLOB_STORAGE_STRING ?? '')

export interface BlobInfo {
  containerName: string
  blobName: string
}

export async function uploadFromDisk (
  path: string,
  blobInfo: BlobInfo
): Promise<BlobInfo> {
  const data = (await readFile(path)).data
  const { containerName, blobName } = blobInfo
  const container = client.getContainerClient(containerName)
  const blob = container.getBlockBlobClient(blobName)
  const uploadResult = await blob.uploadData(data)
  if (uploadResult.errorCode != null) {
    throw new AzureError('Upload failed', uploadResult)
  }
  return { blobName, containerName }
}

export async function uploadBuffer (
  data: Buffer,
  blobInfo: BlobInfo
): Promise<BlobInfo> {
  const { containerName, blobName } = blobInfo
  const container = client.getContainerClient(containerName)
  const blob = container.getBlockBlobClient(blobName)
  const uploadResult = await blob.uploadData(data)
  if (uploadResult.errorCode != null) {
    throw new AzureError('Upload failed', uploadResult)
  }
  return { blobName, containerName }
}

export async function downloadToDisk (
  path: string,
  blobInfo: BlobInfo
): Promise<FileInfo> {
  const { containerName, blobName } = blobInfo
  const container = client.getContainerClient(containerName)
  const blob = container.getBlockBlobClient(blobName)
  let data: Buffer
  try {
    data = await blob.downloadToBuffer()
  } catch (err) {
    if (err.statusCode === 404) {
      throw new NotFoundError('Blob not found', err.request.url)
    } else {
      throw err
    }
  }
  await writeFile(path, data)
  return { path }
}

export async function getBlobHash (blobInfo: BlobInfo): Promise<{ md5: string }> {
  const { containerName, blobName } = blobInfo
  const container = client.getContainerClient(containerName)
  const blob = container.getBlockBlobClient(blobName)
  try {
    const meta = await blob.getProperties()
    if (meta.contentMD5 != null) {
      return { md5: meta.contentMD5.toString() }
    } else {
      return { md5: '!' }
    }
  } catch (err) {
    if (err.statusCode === 404) {
      throw new NotFoundError('Blob not found', err.request.url)
    } else {
      throw err
    }
  }
}

export async function downloadBuffer (blobInfo: BlobInfo): Promise<{ data: Buffer }> {
  const { containerName, blobName } = blobInfo
  const container = client.getContainerClient(containerName)
  const blob = container.getBlockBlobClient(blobName)
  let data: Buffer
  try {
    data = await blob.downloadToBuffer()
  } catch (err) {
    if (err.statusCode === 404) {
      throw new NotFoundError('Blob not found', err.request.url)
    } else {
      throw err
    }
  }
  return { data }
}

export async function deleteBlob (blobInfo: BlobInfo): Promise<BlobInfo> {
  const { containerName, blobName } = blobInfo
  const container = client.getContainerClient(containerName)
  let result
  try {
    result = await container.deleteBlob(blobName)
  } catch (err) {
    if (err.statusCode === 404) {
      throw new NotFoundError('Blob not found', err.request.url)
    } else {
      throw err
    }
  }
  return { containerName: result.containerName, blobName: result.blobName }
}
