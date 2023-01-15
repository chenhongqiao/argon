import Minio from 'minio'

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

export const minio = new Minio.Client({
  endPoint: minioConfig.hosts[0].host,
  accessKey: minioConfig.username,
  secretKey: minioConfig.password,
  port: minioConfig.hosts[0].port
})
