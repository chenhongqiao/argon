import { loadFastify } from '../../src/start.js'
import { FastifyTypeBox } from '../../src/types.js';

import { MongoClient } from 'mongodb'
import assert from 'assert'



export async function dropTestingDb () {

  // Drop Database
  const mongoUrl = process.env.MONGO_URL
  assert(mongoUrl != undefined)
  
  // Try to make sure it is the testing db
  assert(
    mongoUrl.indexOf("test") != -1, 
    'could not find \'test\' in MongoDB URL. Aborting to prevent dropping non-testing database. Check environment variables'
  )

  const mongoClient = new MongoClient(mongoUrl)
  const mongoDb = mongoClient.db()

  await mongoClient.connect()
  await mongoDb.dropDatabase()
  await mongoClient.close()
}

export async function loadTestingApp (): Promise<FastifyTypeBox> {
  await dropTestingDb()

  // Load & Return Fastify app
  return await loadFastify(true)
}

export { FastifyTypeBox }
