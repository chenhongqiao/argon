import { BlobServiceClient } from '@azure/storage-blob'

import { FileInfo } from './fileSystem.connections'

import { NotFoundError } from '@aocs/types'

const client = BlobServiceClient.fromConnectionString(process.env.BLOB_STORAGE_STRING ?? '')

export interface BlobInfo {
  containerName: string
  blobName: string
}

export async function uploadFromDisk (
  path: string,
  blobInfo: BlobInfo
): Promise<BlobInfo> {
  const { containerName, blobName } = blobInfo
  const container = client.getContainerClient(containerName)
  const blob = container.getBlockBlobClient(blobName)
  await blob.uploadFile(path)
  return { blobName, containerName }
}

export async function uploadBuffer (
  data: Buffer,
  blobInfo: BlobInfo,
  contentType?: string,
  metaData?: Record<string, string>
): Promise<BlobInfo> {
  const { containerName, blobName } = blobInfo
  const container = client.getContainerClient(containerName)
  const blob = container.getBlockBlobClient(blobName)
  if (contentType != null) {
    await blob.uploadData(data, { blobHTTPHeaders: { blobContentType: contentType } })
  } else {
    await blob.uploadData(data)
  }
  if (metaData != null) {
    await blob.setMetadata(metaData)
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
  try {
    await blob.downloadToFile(path)
    return { path }
  } catch (err) {
    if (err.statusCode === 404) {
      throw new NotFoundError('Blob not found.', { url: err.request.url })
    } else {
      throw err
    }
  }
}

export async function downloadBuffer (blobInfo: BlobInfo): Promise<{ data: Buffer, metaData: Record<string, string> | undefined }> {
  const { containerName, blobName } = blobInfo
  const container = client.getContainerClient(containerName)
  const blob = container.getBlockBlobClient(blobName)

  try {
    const data = await blob.downloadToBuffer()
    return { data, metaData: (await blob.getProperties()).metadata }
  } catch (err) {
    if (err.statusCode === 404) {
      throw new NotFoundError('Blob not found.', { url: err.request.url })
    } else {
      throw err
    }
  }
}

export async function blobExists (blobInfo: BlobInfo): Promise<boolean> {
  const { containerName, blobName } = blobInfo
  const container = client.getContainerClient(containerName)
  const blob = container.getBlockBlobClient(blobName)
  return await blob.exists()
}

export async function getMetaData (blobInfo: BlobInfo): Promise<Record<string, string>> {
  const { containerName, blobName } = blobInfo
  const container = client.getContainerClient(containerName)
  const blob = container.getBlockBlobClient(blobName)

  try {
    const properties = await blob.getProperties()
    return properties.metadata ?? {}
  } catch (err) {
    if (err.statusCode === 404) {
      throw new NotFoundError('Blob not found.', { url: err.request.url })
    } else {
      throw err
    }
  }
}

export async function deleteBlob (blobInfo: BlobInfo): Promise<void> {
  const { containerName, blobName } = blobInfo
  const container = client.getContainerClient(containerName)
  const blob = container.getBlockBlobClient(blobName)
  try {
    await blob.delete()
  } catch (err) {
    if (err.statusCode === 404) {
      throw new NotFoundError('Blob not found.', { url: err.request.url })
    } else {
      throw err
    }
  }
}

export async function deleteBlobIfExists (blobInfo: BlobInfo): Promise<void> {
  const { containerName, blobName } = blobInfo
  const container = client.getContainerClient(containerName)
  const blob = container.getBlockBlobClient(blobName)
  try {
    await blob.deleteIfExists()
  } catch (err) {
    if (err.statusCode === 404) {
      throw new NotFoundError('Blob not found.', { url: err.request.url })
    } else {
      throw err
    }
  }
}

export async function getBlobHash (blobInfo: BlobInfo): Promise<{ md5: string }> {
  const { containerName, blobName } = blobInfo
  const container = client.getContainerClient(containerName)
  const blob = container.getBlockBlobClient(blobName)
  try {
    const meta = await blob.getProperties()
    if (meta.contentMD5 != null) {
      return { md5: Buffer.from(meta.contentMD5).toString('base64') }
    } else {
      return { md5: '!' }
    }
  } catch (err) {
    if (err.statusCode === 404) {
      throw new NotFoundError('Blob not found.', { url: err.request.url })
    } else {
      throw err
    }
  }
}
