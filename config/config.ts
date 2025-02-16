export const config = () => ({
    openaiApikey: process.env.OPENAI_API_KEY || '',
    twilioAccountSid: process.env.TWILIO_ACCOUNT_SID || '',
    twilioAuthToken: process.env.TWILIO_AUTH_TOKEN || '',
    twilioPhoneNumberFrom: process.env.TWILIO_PHONE_NUMBER_FROM || '',
    twilioPhoneNumberTo: process.env.TWILIO_PHONE_NUMBER_TO || '',
  })