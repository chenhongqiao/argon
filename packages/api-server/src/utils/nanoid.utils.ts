import { customAlphabet } from 'nanoid/async'
const alphabet = '123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'
export const nanoid = customAlphabet(alphabet, 21)
