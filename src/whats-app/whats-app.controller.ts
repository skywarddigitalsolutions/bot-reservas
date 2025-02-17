import { Controller, Post, Body } from '@nestjs/common';
import { WhatsAppService } from './whats-app.service';

@Controller('whats-app')
export class WhatsAppController {
  constructor(private readonly whatsappService: WhatsAppService) {}

  @Post('webhook')
  async handleIncomingMessage(@Body() body: any): Promise<void> {
    try {
      console.log('📩 Mensaje recibido desde Twilio:', JSON.stringify(body, null, 2));

      const from = body.From;
      const messageBody = body.Body;

      if (!from || !messageBody) {
        console.error('⚠️ Mensaje inválido recibido:', body);
        return;
      }

      // Llamamos a processMessage para procesar la conversación
      await this.whatsappService.processMessage(from, body);

    } catch (error) {
      console.error('❌ Error procesando mensaje en el Controller:', error);
    }
  }
}
