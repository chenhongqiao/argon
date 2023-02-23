import { ServiceBusClient } from '@azure/service-bus'

export const messageClient = new ServiceBusClient(process.env.SERVICE_BUS_STRING ?? '')
export const messageReceiver = messageClient.createReceiver('tasks', {
  receiveMode: 'receiveAndDelete'
})

export const messageSender = messageClient.createSender('tasks')
