import {userCollection} from "@argoncs/common"
import { FastifyTypeBox } from "./app.js"


/* Convenience function for user creation in setting up testing dataset
 */
export async function createUser (test, app: FastifyTypeBox, username: string, password: string): Promise<string> {

  const user = {
    name: 'John Doe',
    email: username + "@gmail.com",
    password: password,
    username: username, 
    year: "2025",
    school: "Rock High School",
    country: "USA",
    region: "Pacific"
  }

  let response = await app.inject()
    .post('/v1/users')
    .body(user)

  test.equal(response.statusCode, 201, "user creation")
  const { userId } = response.json()


  // Verify Email -- IMPLEMENTATION DEPENDENT
  await userCollection.updateOne({ id: userId }, { $set: { email: user.email }, $unset: { newEmail: '' } });

  return userId
}
