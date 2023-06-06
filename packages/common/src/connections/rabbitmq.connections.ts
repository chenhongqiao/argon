import amqplib, { Channel } from 'amqplib'

let rabbitMQ: Channel

export const judgerExchange = 'judger'
export const judgerTasksQueue = 'judger-tasks'
export const judgerResultsQueue = 'judger-results'
export const judgerTasksKey = 'tasks'
export const judgerResultsKey = 'results'

export async function connectRabbitMQ (): Promise<void> {
  const connection = await amqplib.connect(process.env.RABBITMQ_URL ?? '')
  rabbitMQ = await connection.createChannel()

  await rabbitMQ.assertExchange(judgerExchange, 'direct')
  await rabbitMQ.assertQueue(judgerTasksQueue)
  await rabbitMQ.bindQueue(judgerTasksQueue, judgerExchange, judgerTasksKey)
  await rabbitMQ.assertQueue(judgerResultsQueue)
  await rabbitMQ.bindQueue(judgerResultsQueue, judgerExchange, judgerResultsKey)
}

export { rabbitMQ }
