import Minio, { Client, MinIOTypeHack } from 'minio'

import { ConnectionStringParser } from 'connection-string-parser'

const minioConnectionString = new ConnectionStringParser({
  scheme: 'minio',
  hosts: []
})

if (process.env.MINIO_URL == null) {
  throw new Error('Missing MinIO URL.')
}

const minioConfig = minioConnectionString.parse(process.env.MINIO_URL)

if (minioConfig.hosts[0].host == null || minioConfig.username == null || minioConfig.password == null) {
  throw new Error('MinIO URL missing required information.')
}

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
  }
}

export const minio = new Minio.Client({
  endPoint: minioConfig.hosts[0].host,
  accessKey: minioConfig.username,
  secretKey: minioConfig.password,
  port: minioConfig.hosts[0].port
}) as Client & MinIOTypeHack
