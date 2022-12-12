import { mongoDB, IndexSpecification, CreateIndexesOptions } from '@argoncs/libraries'

interface Index {
  keys: IndexSpecification
  options: CreateIndexesOptions
}

interface Collection {
  name: string
  indexes?: Index[]
}

const collections: Collection[] = [
  {
    name: 'domains'
  },
  {
    name: 'users',
    indexes: [
      { keys: { username: 1 }, options: { unique: true } },
      { keys: { email: 1 }, options: { unique: true } }
    ]
  },
  {
    name: 'emailVerifications',
    indexes: [
      { keys: { createdAt: 1 }, options: { expireAfterSeconds: 900 } }
    ]
  }
]

export async function createCollectionIndexes (): Promise<void> {
  const indexPromises: Array<Promise<string>> = []
  collections.forEach(collection => {
    if (collection.indexes != null) {
      indexPromises.push(...collection.indexes.map(async index => await mongoDB.collection(collection.name).createIndex(index.keys, index.options)))
    }
  })
  await Promise.all(indexPromises)
}
