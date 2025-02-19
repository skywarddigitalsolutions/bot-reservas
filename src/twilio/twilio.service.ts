// src/twilio/twilio.service.ts

import { Injectable, Logger } from '@nestjs/common';
import { OpenaiService } from '../openai/openai.service';
import axios from 'axios';
import * as Twilio from 'twilio';

@Injectable()
export class TwilioService {
  private readonly logger = new Logger(TwilioService.name); // ✅ Logger de NestJS
  private conversations = new Map<string, { name: string; startDate: string }>();
  private client: Twilio.Twilio; 
  private fromNumber: string;
  private toNumber: string;

  constructor(private readonly openaiService: OpenaiService) {
    this.logger.log('Inicializando TwilioService...');
    this.client = Twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    this.fromNumber = process.env.TWILIO_PHONE_NUMBER_FROM || '';
    this.toNumber = process.env.TWILIO_PHONE_NUMBER_TO || '';
    this.logger.debug(`Twilio configurado con fromNumber: ${this.fromNumber}, toNumber: ${this.toNumber}`);
  }

  async processUserMessage(message: string, from: string): Promise<void> {
    this.logger.log(`Procesando mensaje de ${from}: ${message}`);
    const conversation = this.conversations.get(from) || { name: 'pendiente', startDate: 'pendiente' };

    try {
      const responseJson = await this.openaiService.getAssistantResponse(message);
      this.logger.debug(`Respuesta del asistente: ${JSON.stringify(responseJson)}`);

      conversation.name = responseJson.name || conversation.name;
      conversation.startDate = responseJson.startDate || conversation.startDate;

      this.conversations.set(from, conversation);
      this.logger.debug(`Estado de la conversación actual: ${JSON.stringify(conversation)}`);

      let reply: string;

      if (conversation.name !== 'pendiente' && conversation.startDate !== 'pendiente') {
        this.logger.log(`Verificando disponibilidad para ${conversation.startDate}`);
        const isAvailable = await this.checkAvailability(conversation.startDate);

        if (isAvailable) {
          this.logger.log(`Disponibilidad confirmada. Creando reserva para ${conversation.name}`);
          await this.createReservation(conversation.name, conversation.startDate);
          this.conversations.delete(from);
          reply = `Reserva confirmada para ${conversation.startDate}.`;
        } else {
          this.logger.warn(`No hay disponibilidad para ${conversation.startDate}`);
          this.conversations.delete(from);
          reply = `Lo siento, no hay disponibilidad para ${conversation.startDate}.`;
        }
      } else {
        reply = responseJson.response;
      }

      await this.sendMessage(from, reply);
    } catch (error) {
      this.logger.error(`Error al procesar el mensaje: ${error.message}`, error.stack);
    }
  }

  private async checkAvailability(startDate: string): Promise<boolean> {
    this.logger.log(`Consultando disponibilidad para la fecha: ${startDate}`);
    try {
      const response = await axios.get('https://hook.us2.make.com/2humbq3b0fgdg5oy3c9drka89thrltat');
      const reservations = response.data;
      this.logger.debug(`Reservas existentes: ${JSON.stringify(reservations)}`);

      const dateToCheck = new Date(startDate).toISOString().split('T')[0];
      this.logger.debug(`Fecha formateada para comparación: ${dateToCheck}`);

      const isAvailable = !reservations.some((r) => {
        const date = new Date((r.date - 25569) * 86400 * 1000).toISOString().split('T')[0];
        return date === dateToCheck;
      });

      this.logger.log(`Resultado de disponibilidad: ${isAvailable ? 'Disponible' : 'No disponible'}`);
      return isAvailable;
    } catch (error) {
      this.logger.error('Error al verificar la disponibilidad:', error);
      return false;
    }
  }

  private async createReservation(name: string, startDate: string): Promise<void> {
    this.logger.log(`Creando reserva para ${name} el ${startDate}`);
    try {
      await axios.post('https://hook.us2.make.com/mr7rjujqv4rnyly4j4o7m5p4mtkemnqg', {
        name,
        startDate
      });
      this.logger.log('Reserva creada exitosamente');
    } catch (error) {
      this.logger.error('Error al crear la reserva:', error);
    }
  }

  private async sendMessage(to: string, message: string): Promise<void> {
    this.logger.log(`Enviando mensaje a ${to}: ${message}`);
    try {
      await this.client.messages.create({
        body: message,
        from: this.fromNumber,
        to
      });
      this.logger.log(`Mensaje enviado exitosamente a ${to}`);
    } catch (error) {
      this.logger.error('Error al enviar mensaje via Twilio:', error);
    }
  }
}
