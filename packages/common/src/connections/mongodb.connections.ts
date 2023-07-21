import { type ConetstProblemList, type Contest, type ContestProblem, type Submission, type Domain, type EmailVerification, type Problem, type Team, type TeamInvitation, type TestcaseUpload, type User, type UserSession, type TeamScore } from '@argoncs/types'
import { MongoClient, type IndexSpecification, type CreateIndexesOptions, type Db, type Collection } from 'mongodb'

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
      { keys: { id: 1 }, options: { unique: true } },
      { keys: { userId: 1, createdAt: -1 } },
      { keys: { contestId: 1, teamId: 1, problemId: 1, createdAt: -1 } },
      { keys: { contestId: 1, teamId: 1, createdAt: -1 } },
      { keys: { domainId: 1, problemId: 1, contestId: 1, createdAt: -1 } }
    ]
  },
  {
    name: 'users',
    indexes: [
      { keys: { id: 1 }, options: { unique: true } },
      { keys: { username: 1 }, options: { unique: true } },
      { keys: { email: 1, newEmail: 1 }, options: { unique: true } }
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
    name: 'domainProblems',
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
      { keys: { problemId: 1 } },
      { keys: { createdAt: 1 }, options: { expireAfterSeconds: 900 } }
    ]
  },
  {
    name: 'contests',
    indexes: [
      { keys: { id: 1 }, options: { unique: true } },
      { keys: { domainId: 1, _id: -1 }, options: { unique: true } }
    ]
  },
  {
    name: 'contestProblems',
    indexes: [
      { keys: { id: 1 }, options: { unique: true } },
      { keys: { contestId: 1, id: 1 }, options: { unique: true } }
    ]
  },
  {
    name: 'contestProblemLists',
    indexes: [
      { keys: { id: 1 }, options: { unique: true } }
    ]
  },
  {
    name: 'teamScores',
    indexes: [
      { keys: { contestId: 1, id: 1 }, options: { unique: true } },
      { keys: { contestId: 1, totalScore: -1, lastSubmission: 1 } }
    ]
  },
  {
    name: 'teams',
    indexes: [
      { keys: { contestId: 1, id: 1 }, options: { unique: true } }
    ]
  },
  {
    name: 'teamInvitations',
    indexes: [
      { keys: { userId: 1, id: 1 }, options: { unique: true } },
      { keys: { contestId: 1, teamId: 1, id: 1 }, options: { unique: true } },
      { keys: { createdAt: 1 }, options: { expireAfterSeconds: 604800 } }
    ]
  }
]

export let mongoClient: MongoClient
export let mongoDB: Db
export let domainCollection: Collection<Domain>
export let userCollection: Collection<User>
export let domainProblemCollection: Collection<Problem>
export let submissionCollection: Collection<Submission>
export let sessionCollection: Collection<UserSession>
export let emailVerificationCollection: Collection<EmailVerification>
export let testcaseUploadCollection: Collection<TestcaseUpload>
export let contestCollection: Collection<Contest>
export let teamCollection: Collection<Team>
export let teamInvitationCollection: Collection<TeamInvitation>
export let teamScoreCollection: Collection<TeamScore>
export let contestProblemCollection: Collection<ContestProblem>
export let contestProblemListCollection: Collection<ConetstProblemList>

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
  domainProblemCollection = mongoDB.collection('domainProblems')

  userCollection = mongoDB.collection('users')
  sessionCollection = mongoDB.collection('sessions')
  emailVerificationCollection = mongoDB.collection('emailVerifications')

  submissionCollection = mongoDB.collection('submissions')

  testcaseUploadCollection = mongoDB.collection('testcaseUploads')

  contestCollection = mongoDB.collection('contests')
  contestProblemCollection = mongoDB.collection('contestProblems')
  contestProblemListCollection = mongoDB.collection('contestProblemList')

  teamCollection = mongoDB.collection('teams')
  teamInvitationCollection = mongoDB.collection('teamInvitations')
  teamScoreCollection = mongoDB.collection('teamScores')
}
export { MongoServerError, ClientSession } from 'mongodb'
