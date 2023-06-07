import { MongoClient, IndexSpecification, CreateIndexesOptions } from 'mongodb'

const mongoURL = process.env.MONGO_URL ?? ''

export const mongoClient = new MongoClient(mongoURL)
export const mongoDB = mongoClient.db()

interface Index {
  keys: IndexSpecification
  options?: CreateIndexesOptions
}

interface Collection {
  name: string
  indexes?: Index[]
}

const collections: Collection[] = [
  {
    name: 'domains',
    indexes: [
      { keys: { id: 1 }, options: { unique: true } }
    ]
  },
  {
    name: 'submissions',
    indexes: [
      { keys: { id: 1 }, options: { unique: true } }
    ]
  },
  {
    name: 'users',
    indexes: [
      { keys: { id: 1 }, options: { unique: true } },
      { keys: { username: 1 }, options: { unique: true } },
      { keys: { email: 1 }, options: { unique: true } }
    ]
  },
  {
    name: 'verifications',
    indexes: [
      { keys: { id: 1 }, options: { unique: true } },
      { keys: { createdAt: 1 }, options: { expireAfterSeconds: 900 } }
    ]
  },
  {
    name: 'problemBank',
    indexes: [
      { keys: { id: 1 }, options: { unique: true } },
      { keys: { domainId: 1, id: 1 }, options: { unique: true } },
      { keys: { domainId: 1, _id: -1 }, options: { unique: true } }
    ]
  },
  {
    name: 'sessions',
    indexes: [
      { keys: { userId: 1, id: 1 }, options: { unique: true } }
    ]
  }
]

await mongoClient.connect()

const indexPromises: Array<Promise<string>> = []
collections.forEach(collection => {
  if (collection.indexes != null) {
    indexPromises.push(...collection.indexes.map(async index => await mongoDB.collection(collection.name).createIndex(index.keys, index.options ?? {})))
  }
})
await Promise.all(indexPromises)

export { MongoServerError } from 'mongodb'
