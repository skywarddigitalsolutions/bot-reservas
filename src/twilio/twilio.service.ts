import { Injectable } from '@nestjs/common';
import { OpenaiService } from '../openai/openai.service';
import axios from 'axios';
import * as Twilio from 'twilio';

@Injectable()
export class TwilioService {
  private conversations = new Map<string, { name: string; startDate: string }>();
  private client: Twilio.Twilio; 
  private fromNumber: string;
  private toNumber: string;

  constructor(private readonly openaiService: OpenaiService) {
    this.client = Twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    this.fromNumber = process.env.TWILIO_PHONE_NUMBER_FROM || '';
    this.toNumber = process.env.TWILIO_PHONE_NUMBER_TO || '';
  }

  async processUserMessage(message: string, from: string): Promise<void> {
    const conversation = this.conversations.get(from) || { name: 'pendiente', startDate: 'pendiente' };

    const responseJson = await this.openaiService.getAssistantResponse(message);

    conversation.name = responseJson.name || conversation.name;
    conversation.startDate = responseJson.startDate || conversation.startDate;

    this.conversations.set(from, conversation);

    let reply: string;

    if (conversation.name !== 'pendiente' && conversation.startDate !== 'pendiente') {
      const isAvailable = await this.checkAvailability(conversation.startDate);

      if (isAvailable) {
        await this.createReservation(conversation.name, conversation.startDate);
        this.conversations.delete(from);
        reply = `Reserva confirmada para ${conversation.startDate}.`;
      } else {
        this.conversations.delete(from);
        reply = `Lo siento, no hay disponibilidad para ${conversation.startDate}.`;
      }
    } else {
      reply = responseJson.response;
    }

    await this.sendMessage(from, reply);
  }

  private async checkAvailability(startDate: string): Promise<boolean> {
    try {
      const response = await axios.get('https://hook.us2.make.com/2humbq3b0fgdg5oy3c9drka89thrltat');
      const reservations = response.data;

      const dateToCheck = new Date(startDate).toISOString().split('T')[0];

      return !reservations.some((r) => {
        const date = new Date((r.date - 25569) * 86400 * 1000).toISOString().split('T')[0];
        return date === dateToCheck;
      });
    } catch (error) {
      console.error('Error checking availability:', error);
      return false;
    }
  }

  private async createReservation(name: string, startDate: string): Promise<void> {
    try {
      await axios.post('https://hook.us2.make.com/mr7rjujqv4rnyly4j4o7m5p4mtkemnqg', {
        name,
        startDate
      });
    } catch (error) {
      console.error('Error creating reservation:', error);
    }
  }

  private async sendMessage(to: string, message: string): Promise<void> {
    try {
      await this.client.messages.create({
        body: message,
        from: this.fromNumber,
        to
      });
    } catch (error) {
      console.error('Error sending message via Twilio:', error);
    }
  }
}
