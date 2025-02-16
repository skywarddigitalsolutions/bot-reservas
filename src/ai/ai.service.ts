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
            Ubicación: Humahuaca 4556, C1192 Cdad. Autónoma de Buenos Aires.
            Horario de reservas: Lunes a Domingo de 12:00 a 23:00.

            Reglas estrictas:
            Siempre responde solo con JSON válido, sin texto adicional.
            No uses signos de exclamación, emojis ni saludos fuera del JSON.
            Si falta información, usa "pendiente" en los campos correspondientes.
            Interpreta fechas como "mañana", "el viernes", "el próximo martes" y conviértelas a YYYY/MM/DD HH:MM:SS.
            
            Formato esperado (Ejemplo):
            {
              "response": "Hola! ¿Para qué fecha y hora quieres reservar?",
              "name": "Juan Pérez",
              "startDate": "2025/02/20 17:30:00"
            }
              
             No agregues texto fuera del JSON, responde solo con JSON puro.
             `
          },
          { role: 'user', content: message }
        ],
        temperature: 0.5,
      });

      console.log('🤖 Respuesta de IA:', response.choices[0]?.message?.content);

      try {
        return JSON.parse(response.choices[0]?.message?.content || '{}');
      } catch (error) {
        console.error('❌ Error parseando la respuesta de la IA:', error);
        return {
          response: `Hola, ¿Para qué fecha y hora quieres reservar?`,
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
