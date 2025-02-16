import { Injectable } from '@nestjs/common';
import OpenAI from 'openai';

@Injectable()
export class AiService {
  private openai: OpenAI;

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  async getReservationDetails(message: string): Promise<{ response: string; name: string; startDate: string }> {
    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: `Sos un asistente de reservas automatizado para Bethania Fútbol Club.
            📍 Ubicación: Humahuaca 4556, C1192 Cdad. Autónoma de Buenos Aires.
            🕒 Horario de reservas: Lunes a Domingo de 12:00 a 23:00.

            🔹 **Tu tarea**:
            - Mantén una conversación amigable con el cliente.
            - Si falta información, sigue la conversación y **pregunta lo necesario**.
            - Interpreta fechas como "mañana", "el viernes", "el próximo martes" y conviértelas en formato **YYYY/MM/DD HH:MM:SS**.
            - Si es la primera vez que el cliente habla, salúdalo de manera amigable antes de pedir detalles.
            
            📌 **Formato esperado (Ejemplo)**:
            {
              "response": "Hola! ¿Para qué fecha y hora quieres reservar?",
              "name": "Juan Pérez",
              "startDate": "2025/02/20 17:30:00"
            }`
          },
          { role: 'user', content: message }
        ],
        temperature: 0.5,
      });

      console.log('🤖 Respuesta de IA:', response.choices[0]?.message?.content);

      try {
        const parsedResponse = JSON.parse(response.choices[0]?.message?.content || '{}');

        return {
          response: parsedResponse.response || "Lo siento, no entendí. ¿Podrías darme más detalles?",
          name: parsedResponse.name || 'pendiente',
          startDate: parsedResponse.startDate || 'pendiente',
        };
      } catch (error) {
        console.error('❌ Error parseando la respuesta de la IA:', error);
        return {
          response: "Lo siento, no entendí. ¿Podrías darme más detalles?",
          name: 'pendiente',
          startDate: 'pendiente',
        };
      }

    } catch (error) {
      console.error('❌ Error con la IA:', error);
      return {
        response: "Hubo un problema procesando tu mensaje. Inténtalo nuevamente.",
        name: 'pendiente',
        startDate: 'pendiente',
      };
    }
  }
}
