import amqplib, { type Channel, Connection} from 'amqplib'

let connection: Connection
let rabbitMQ: Channel

export const judgerExchange = 'judger'
export const judgerTasksQueue = 'judger-tasks'
export const judgerResultsQueue = 'judger-results'
export const judgerTasksKey = 'tasks'
export const judgerResultsKey = 'results'

export const deadLetterExchange = 'dead-letter'
export const deadTasksQueue = 'dead-tasks'
export const deadResultsQueue = 'dead-results'

export async function connectRabbitMQ (url: string): Promise<void> {
  connection = await amqplib.connect(url)
  rabbitMQ = await connection.createChannel()

  await rabbitMQ.assertExchange(judgerExchange, 'direct')
  await rabbitMQ.assertExchange(deadLetterExchange, 'direct')

  await rabbitMQ.assertQueue(deadTasksQueue)
  await rabbitMQ.assertQueue(deadResultsQueue)
  await rabbitMQ.bindQueue(deadTasksQueue, deadLetterExchange, judgerTasksKey)
  await rabbitMQ.bindQueue(deadResultsQueue, deadLetterExchange, judgerResultsKey)

  await rabbitMQ.assertQueue(judgerTasksQueue, { deadLetterExchange })
  await rabbitMQ.assertQueue(judgerResultsQueue, { deadLetterExchange })
  await rabbitMQ.bindQueue(judgerTasksQueue, judgerExchange, judgerTasksKey)
  await rabbitMQ.bindQueue(judgerResultsQueue, judgerExchange, judgerResultsKey)
}

export function closeRabbitMQ () {
  rabbitMQ.close()
  connection.close()
}

export { rabbitMQ }
