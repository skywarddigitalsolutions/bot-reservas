import { Controller, Post, Body } from '@nestjs/common';
import { WhatsAppService } from './whats-app.service';

@Controller('whats-app')  
export class WhatsAppController {
  constructor(private readonly whatsappService: WhatsAppService) {}

  @Post('send')
  async sendMessage(@Body() body: { phone: string; message: string }) {
    const { phone, message } = body;
    await this.whatsappService.sendMessage(phone, message);
    return { success: true, message: `Mensaje enviado a ${phone}` };
  }

  @Post('webhook')
  async handleIncomingMessage(@Body() body: any) {
    console.log('📩 Mensaje recibido:', body);

    const from = body.From;
    const message = body.Body; // Mensaje enviado

    const responseMessage = await this.whatsappService.processMessage(from, message);

    return { success: true, response: responseMessage };
  }
}
