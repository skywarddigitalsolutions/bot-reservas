import { Injectable } from '@nestjs/common';
import { AiService } from 'src/ai/ai.service';
import { Twilio } from 'twilio';
import axios from 'axios';

@Injectable()
export class WhatsAppService {
  private twilioClient: Twilio;

  constructor(private readonly aiService: AiService) {
    this.twilioClient = new Twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    );
  }

  async sendMessage(to: string, message: string): Promise<void> {
    try {
      await this.twilioClient.messages.create({
        from: process.env.TWILIO_PHONE_NUMBER_FROM,
        to: to,
        body: message,
      });
      console.log(`📨 Mensaje enviado a ${to}: ${message}`);
    } catch (error) {
      console.error('❌ Error enviando mensaje de WhatsApp:', error);
    }
  }

  async processMessage(from: string, message: string): Promise<void> {
    console.log(`🤖 Procesando mensaje de ${from}: "${message}"`);

    const reserva = await this.aiService.getReservationDetails(message);

    if (reserva.startDate === "pendiente") {
      await this.sendMessage(from, 'Por favor, indícame la fecha y hora de la reserva.');
      return;
    }

    // Verificar disponibilidad en Google Sheets
    const disponible = await this.verificarDisponibilidad(reserva.startDate);

    if (!disponible) {
      await this.sendMessage(from, `Lo siento, pero no hay disponibilidad para ${reserva.startDate}. ¿Te gustaría probar otro horario?`);
      return;
    }

    // Confirmar la reserva en Google Sheets
    const confirmacion = await this.confirmarReserva(reserva.name, reserva.startDate);

    if (confirmacion) {
      await this.sendMessage(from, `✅ ¡Reserva confirmada!\n📌 Cliente: ${reserva.name}\n📅 Fecha: ${reserva.startDate}`);
    } else {
      await this.sendMessage(from, 'Hubo un problema al registrar tu reserva. Inténtalo nuevamente.');
    }
  }

  async verificarDisponibilidad(fecha: string): Promise<boolean> {
    try {
      const response = await axios.get('https://hook.us2.make.com/2humbq3b0fgdg5oy3c9drka89thrltat');
      const reservas = response.data;

      console.log('📅 Reservas actuales:', reservas);

      return !reservas.some((r: any) => r.date === fecha);
    } catch (error) {
      console.error('❌ Error verificando disponibilidad:', error);
      return false;
    }
  }

  async confirmarReserva(name: string, startDate: string): Promise<boolean> {
    try {
      const response = await axios.post('https://hook.us2.make.com/mr7rjujqv4rnyly4j4o7m5p4mtkemnqg', {
        name,
        startDate,
      });

      console.log('✅ Reserva registrada:', response.data);
      return true;
    } catch (error) {
      console.error('❌ Error confirmando reserva:', error);
      return false;
    }
  }
}
