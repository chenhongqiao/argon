import { User, NewUser, UserRole, CosmosDB, ConflictError, AzureError } from '@chenhongqiao/carbon-common'
import { randomUUID, randomBytes, pbkdf2 } from 'node:crypto'

import { promisify } from 'node:util'

const randomBytesAsync = promisify(randomBytes)
const pbkdf2Async = promisify(pbkdf2)

const usersContainer = CosmosDB.container('users')
const mappingContainer = CosmosDB.container('userMappings')

enum MappingType {
  Username = 'Username',
  Email = 'Email'
}

interface UsernameMapping {
  id: string
  type: MappingType.Username
  userID: string
}

interface EmailMapping {
  id: string
  type: MappingType.Email
  userID: string
}

export async function registerUser (userInfo: NewUser): Promise<{userID: string}> {
  const salt = (await randomBytesAsync(32)).toString('base64')
  const hash = (await pbkdf2Async(userInfo.password, salt, 100000, 512, 'sha512')).toString('base64')
  const userID = randomUUID()
  const user: User = {
    name: userInfo.name,
    email: userInfo.email,
    password: {
      salt,
      hash
    },
    role: UserRole.User,
    emailVerified: false,
    id: userID,
    username: userInfo.username
  }
  const usernameMapping: UsernameMapping = {
    id: userInfo.username,
    type: MappingType.Username,
    userID: userID
  }
  const emailMapping: EmailMapping = {
    id: userInfo.email,
    type: MappingType.Email,
    userID: userID
  }

  try {
    await mappingContainer.items.create(usernameMapping)
  } catch (err) {
    if (err.code === 409) {
      throw new ConflictError('Username exists.', userInfo.username)
    } else {
      throw new AzureError('Error while creating username mapping.', err)
    }
  }

  try {
    await mappingContainer.items.create(emailMapping)
  } catch (err) {
    if (err.code === 409) {
      await mappingContainer.item(userInfo.username, 'Username').delete()
      throw new ConflictError('Email exists.', userInfo.email)
    } else {
      throw new AzureError('Error while creating Email mapping.', err)
    }
  }

  const createUserResult = await usersContainer.items.create(user)
  if (createUserResult.resource != null) {
    return { userID: createUserResult.resource.id }
  } else {
    await mappingContainer.item(userInfo.username, 'Username').delete()
    await mappingContainer.item(userInfo.email, 'Email').delete()
    throw new AzureError('No resource ID returned while creating user.', createUserResult)
  }
}
