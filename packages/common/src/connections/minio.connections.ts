import { Client, type MinIOTypeHack } from 'minio'

import { ConnectionStringParser } from 'connection-string-parser'
import { type ReadableStream } from 'stream/web'

declare module 'minio' {
  export interface BucketItemStat {
    size: number
    etag: string
    versionId: string
    lastModified: Date
    metaData: ItemBucketMetadata
  }

  export class MinIOTypeHack {
    statObject (bucketName: string, objectName: string, options: VersionIdentificator): Promise<BucketItemStat>

    getObject (bucketName: string, objectName: string, options: VersionIdentificator): Promise<ReadableStream>
    fGetObject (bucketName: string, objectName: string, filePath: string, options: VersionIdentificator): Promise<void>
  }
}

let minio: Client & MinIOTypeHack

export async function connectMinIO (url: string): Promise<void> {
  const minioConnectionString = new ConnectionStringParser({
    scheme: 'minio',
    hosts: []
  })

  if (url == null) {
    throw new Error('Missing MinIO URL')
  }

  const minioConfig = minioConnectionString.parse(url)

  if (minioConfig.hosts[0].host == null || minioConfig.username == null || minioConfig.password == null) {
    throw new Error('MinIO URL missing required information')
  }

  minio = new Client({
    endPoint: minioConfig.hosts[0].host,
    accessKey: minioConfig.username,
    secretKey: minioConfig.password,
    useSSL: false,
    port: minioConfig.hosts[0].port
  }) as Client & MinIOTypeHack

  if (!await minio.bucketExists('testcases')) {
    await minio.makeBucket('testcases')
  }
  if (!await minio.bucketExists('binaries')) {
    await minio.makeBucket('binaries')
  }
  await minio.setBucketVersioning('testcases', { Status: 'Enabled' })
}

export { minio }
