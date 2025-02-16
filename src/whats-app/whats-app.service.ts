import { Injectable } from '@nestjs/common';
import { AiService } from 'src/ai/ai.service';
import { Twilio } from 'twilio';

@Injectable()
export class WhatsAppService {
  private twilioClient: Twilio;

  constructor(
    private readonly aiService: AiService,
  ) {
    this.twilioClient = new Twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    );
  }

  async sendMessage(to: string, message: string): Promise<void> {
    try {
      await this.twilioClient.messages.create({
        from: process.env.TWILIO_PHONE_NUMBER_FROM,
        to: process.env.TWILIO_PHONE_NUMBER_TO || '',
        body: message,
      });
      console.log(`Mensaje enviado a ${to}: ${message}`);
    } catch (error) {
      console.error('Error enviando mensaje de WhatsApp:', error);
    }
  }

  async processMessage(from: string, message: string): Promise<string> {
    console.log(`🤖 Procesando mensaje de ${from}: "${message}"`);

    // Consultamos la IA para obtener una respuesta
    const aiResponse = await this.aiService.getResponse(message);

    // Enviar respuesta al usuario
    await this.sendMessage(from, aiResponse);

    return aiResponse;
  }
}
