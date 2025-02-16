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

  async getReservationDetails(message: string): Promise<{ name: string, startDate: string }> {
    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: `Sos un asistente de reservas automatizado para Bethania Fútbol Club.
            📍 Ubicación: Humahuaca 4556, C1192 Cdad. Autónoma de Buenos Aires.
            🕒 Horario de reservas: Lunes a Domingo de 08:00 a 23:00.

            🔹 **Tu tarea**:
            - Extraer información de reservas en **formato JSON**.
            - **Responde SOLO con JSON**, sin texto adicional.
            - Si falta información, usa **"pendiente"** en el campo correspondiente.

            📌 **Formato esperado (Ejemplo)**:
            {
              "name": "Juan Pérez",
              "startDate": "2025/02/20 17:30:00"
            }`
          },
          { role: 'user', content: message }
        ],
        temperature: 0.3,
      });

      console.log('🤖 Respuesta de IA:', response.choices[0]?.message?.content);

      // Intentamos parsear la respuesta, y en caso de error, retornamos datos predeterminados.
      try {
        const parsedResponse = JSON.parse(response.choices[0]?.message?.content || '{}');

        return {
          name: parsedResponse.name || 'pendiente',
          startDate: parsedResponse.startDate || 'pendiente',
        };
      } catch (error) {
        console.error('❌ Error parseando la respuesta de la IA:', error);
        return { name: 'pendiente', startDate: 'pendiente' };
      }

    } catch (error) {
      console.error('❌ Error con la IA:', error);
      return { name: 'pendiente', startDate: 'pendiente' };
    }
  }
}
