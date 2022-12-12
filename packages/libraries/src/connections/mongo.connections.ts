import { MongoClient } from 'mongodb'

const mongoURL = process.env.MONGO_URL ?? ''

export const mongoClient = new MongoClient(mongoURL)
export const mongoDB = mongoClient.db('argon')

export { IndexSpecification, CreateIndexesOptions, MongoServerError } from 'mongodb'
