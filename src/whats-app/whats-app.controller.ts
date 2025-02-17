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
    const from = body.From;

    const responseMessage = await this.whatsappService.processMessage(from, body);

    return { success: true, response: responseMessage };
  }
}
