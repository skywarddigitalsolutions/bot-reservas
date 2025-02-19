import { Injectable } from '@nestjs/common';
import { AiService } from 'src/ai/ai.service';
import { Twilio } from 'twilio';
import axios from 'axios';

@Injectable()
export class WhatsAppService {
  private twilioClient: Twilio;
  private userThreads: Map<string, string>; // Almacenar el threadId de cada usuario

  constructor(private readonly aiService: AiService) {
    this.twilioClient = new Twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    );

    this.userThreads = new Map(); // Inicializar almacenamiento de threads
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

  async processMessage(from: string, message: any): Promise<void> {
    console.log(`🤖 Procesando mensaje de ${from}: "${JSON.stringify(message, null, 2)}"`);

    const userName = message.ProfileName || 'pendiente';

    // Obtener el threadId del usuario o crear uno nuevo
    let threadId = this.userThreads.get(from) || null;

    const reserva = await this.aiService.getReservationDetails(message.Body, userName, threadId);

    // Si se creó un nuevo thread, almacenarlo
    if (!threadId) {
        this.userThreads.set(from, reserva.threadId);
    }

    // Responder con el mensaje de la IA
    await this.sendMessage(from, reserva.response);

    // 👉 NUEVA VALIDACIÓN: No verificar disponibilidad si faltan datos
    if (!reserva.name || reserva.name === "pendiente" || !reserva.startDate || reserva.startDate === "pendiente") {
        console.log('⚠️ Datos incompletos, no se realiza la verificación de disponibilidad.');
        return;  // Salir de la función si faltan datos
    }

    // Verificar disponibilidad en Google Sheets
    const disponible = await this.verificarDisponibilidad(reserva.startDate);

    if (!disponible) {
        await this.sendMessage(from, `Lo siento, pero no hay disponibilidad para ${reserva.startDate}. ¿Te gustaría probar otro horario?`);
        return;
    }

    // Confirmar la reserva en Google Sheets
    const confirmacion = await this.confirmarReserva(userName, reserva.startDate);

    if (confirmacion) {
        await this.sendMessage(from, `✅ ¡Reserva confirmada!\n📌 Cliente: ${userName}\n📅 Fecha: ${reserva.startDate}`);
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
