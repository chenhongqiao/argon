import { ServiceBusClient } from '@azure/service-bus'

export const messageClient = new ServiceBusClient(
  'Endpoint=sb://carbondev.servicebus.windows.net/;SharedAccessKeyName=RootManageSharedAccessKey;SharedAccessKey=hX1nsR8WuiqrQEC2q2a/ce3PBMiT7MmvJ2AS02XQOc0='
)
export const receiver = messageClient.createReceiver('tasks', {
  receiveMode: 'receiveAndDelete'
})
