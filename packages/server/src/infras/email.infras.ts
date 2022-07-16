import emailClient = require('@sendgrid/mail')
emailClient.setApiKey(process.env.SENDGRID_API_KEY ?? '')

export { emailClient }
