import { MongoClient } from 'mongodb'

const mongoURL = process.env.MONGO_URL ?? ''

export const mongoClient = new MongoClient(mongoURL)
export const mongoDB = mongoClient.db()

export { IndexSpecification, CreateIndexesOptions, MongoServerError, ObjectId } from 'mongodb'
