import { User, NewUser, UserRole, CosmosDB, ConflictError, AzureError, NotFoundError, ItemResponse, AuthenicationError, AuthorizationError } from '@project-carbon/shared'
import { randomUUID, randomBytes, pbkdf2 } from 'node:crypto'

import { promisify } from 'node:util'

import { emailClient } from '../infras/email.infras'

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

export async function registerUser (newUser: NewUser): Promise<{userID: string, email: string}> {
  const salt = (await randomBytesAsync(32)).toString('base64')
  const hash = (await pbkdf2Async(newUser.password, salt, 100000, 512, 'sha512')).toString('base64')
  const userID = randomUUID()
  const user: User = {
    name: newUser.name,
    email: newUser.email,
    password: {
      salt,
      hash
    },
    role: UserRole.User,
    emailVerified: false,
    id: userID,
    username: newUser.username
  }
  const usernameMapping: UsernameMapping = {
    id: user.username,
    type: MappingType.Username,
    userID: userID
  }
  const emailMapping: EmailMapping = {
    id: user.email,
    type: MappingType.Email,
    userID: userID
  }

  try {
    await mappingContainer.items.create(usernameMapping)
  } catch (err) {
    if (err.code === 409) {
      throw new ConflictError('Username exists.', user.username)
    } else {
      throw new AzureError('Error while creating username mapping.', err)
    }
  }

  try {
    await mappingContainer.items.create(emailMapping)
  } catch (err) {
    if (err.code === 409) {
      await mappingContainer.item(user.username, 'Username').delete()
      throw new ConflictError('Email exists.', user.email)
    } else {
      throw new AzureError('Error while creating Email mapping.', err)
    }
  }

  const created = await usersContainer.items.create(user)
  if (created.resource == null) {
    await mappingContainer.item(user.username, 'Username').delete()
    await mappingContainer.item(user.email, 'Email').delete()
    throw new AzureError('No resource ID returned while creating user.', created)
  }
  return { userID: created.resource.id, email: user.email }
}

export async function fetchUser (userID: string): Promise<User> {
  const userItem = usersContainer.item(userID, userID)
  const fetched = await userItem.read<User>()
  if (fetched.resource != null) {
    return fetched.resource
  } if (fetched.statusCode === 404) {
    throw new NotFoundError('User not found.', userID)
  } else {
    throw new AzureError('Unexpected CosmosDB return.', fetched)
  }
}

export async function sendVerificationEmail (email: string, token: string): Promise<void> {
  const verificationEmail: emailClient.MailDataRequired = {
    to: email,
    from: { name: 'Carbon Contest Server', email: 'carbon@teamscode.org' },
    subject: 'Please verify your email',
    html: `This is your email verification token ${token}`
  }

  await emailClient.send(verificationEmail)
}

export async function verifyUser (userID: string): Promise<{userID: string}> {
  const userItem = usersContainer.item(userID, userID)
  const fetched = await userItem.read<User>()
  if (fetched.resource == null) {
    if (fetched.statusCode === 404) {
      throw new NotFoundError('User not found.', userID)
    } else {
      throw new AzureError('Unexpected CosmosDB return.', fetched)
    }
  }
  const user = fetched.resource
  user.emailVerified = true
  const replaced = await userItem.replace(user)
  if (replaced.resource == null) {
    throw new AzureError('Unexpected CosmosDB return.', replaced)
  }
  return { userID: replaced.resource.id }
}

export async function authenicateUser (usernameOrEmail: string, password: string): Promise<{userID: string, role: UserRole}> {
  let fetchedMapping: ItemResponse<UsernameMapping|EmailMapping> = await mappingContainer.item(usernameOrEmail, 'Username').read<UsernameMapping>()
  if (fetchedMapping.resource == null) {
    fetchedMapping = await mappingContainer.item(usernameOrEmail, 'Email').read<EmailMapping>()
  }

  if (fetchedMapping.resource == null) {
    if (fetchedMapping.statusCode === 404) {
      throw new AuthenicationError('Authenication failed.', { usernameOrEmail })
    } else {
      throw new AzureError('Unexpected CosmosDB return.', fetchedMapping)
    }
  }

  const { userID } = fetchedMapping.resource
  const fetchedUser = await usersContainer.item(userID, userID).read<User>()
  if (fetchedUser.resource == null) {
    throw new AzureError('User does not exist but mapping exists.', fetchedUser)
  }

  const user = fetchedUser.resource
  const hash = (await pbkdf2Async(password, user.password.salt, 100000, 512, 'sha512')).toString('base64')
  if (hash === user.password.hash) {
    if (!user.emailVerified) {
      throw new AuthorizationError('Please verify your email first.', userID)
    }
    return { userID: user.id, role: user.role }
  } else {
    throw new AuthenicationError('Authenication failed.', { usernameOrEmail })
  }
}
