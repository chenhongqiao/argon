import { ContestSubmission, Domain, EmailVerification, Problem, TestingSubmission, User, UserSession } from '@argoncs/types'
import { MongoClient, IndexSpecification, CreateIndexesOptions, Db, Collection } from 'mongodb'

interface Index {
  keys: IndexSpecification
  options?: CreateIndexesOptions
}

interface CollectionIndex {
  name: string
  indexes?: Index[]
}

const collections: CollectionIndex[] = [
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
    name: 'emailVerifications',
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
  },
  {
    name: 'testcaseUploads',
    indexes: [
      { keys: { id: 1 }, options: { unique: true } },
      { keys: { createdAt: 1 }, options: { expireAfterSeconds: 900 } }
    ]
  }
]

export let mongoClient: MongoClient
export let mongoDB: Db
export let domainCollection: Collection<Domain>
export let userCollection: Collection<User>
export let problemBankCollection: Collection<Problem>
export let submissionCollection: Collection<ContestSubmission | TestingSubmission>
export let sessionCollection: Collection<UserSession>
export let emailVerificationCollection: Collection<EmailVerification>

export async function connectMongoDB (url: string): Promise<void> {
  mongoClient = new MongoClient(url)
  mongoDB = mongoClient.db()
  await mongoClient.connect()

  const indexPromises: Array<Promise<string>> = []
  collections.forEach(collection => {
    if (collection.indexes != null) {
      indexPromises.push(...collection.indexes.map(async index => await mongoDB.collection(collection.name).createIndex(index.keys, index.options ?? {})))
    }
  })
  await Promise.all(indexPromises)

  domainCollection = mongoDB.collection('domains')
  userCollection = mongoDB.collection('users')
  problemBankCollection = mongoDB.collection('problemBank')
  submissionCollection = mongoDB.collection('submissions')
  sessionCollection = mongoDB.collection('sessions')
  emailVerificationCollection = mongoDB.collection('emailVerifications')
}
export { MongoServerError } from 'mongodb'
