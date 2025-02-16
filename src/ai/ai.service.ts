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

  async getReservationDetails(message: string, userName: string): Promise<{ response: string; name: string; startDate: string }> {
    try {
      const today = new Date();
      const todayFormatted = today.toISOString().split('T')[0]; // Formato YYYY-MM-DD

      const response = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: `Sos un asistente de reservas automatizado para Bethania Fútbol Club.
            📍 Ubicación: Humahuaca 4556, C1192 Cdad. Autónoma de Buenos Aires.
            🕒 Horario de reservas: Lunes a Domingo de 08:00 a 23:00.

            🔹 **Tu objetivo**: Guiar a los clientes a completar una reserva de manera natural y conversacional.
            🔹 **Mantén la conversación** y haz preguntas cuando falte información.
            🔹 **Entiende fechas relativas** como "mañana" (mañana es ${todayFormatted}), "el viernes", "el próximo martes" y conviértelas a **YYYY/MM/DD HH:MM:SS**.
            🔹 **Ejemplo de flujo de conversación:**
              - Usuario: "Hola"
              - Asistente: "Hola ${userName}, ¿cómo estás? ¿Quieres reservar una cancha hoy o en otra fecha?"
              - Usuario: "Para mañana a las 19:00"
              - Asistente: "¡Perfecto! Entonces reservaré una cancha para ti el ${todayFormatted} a las 19:00. ¿Es correcto?"
            
            🔹 **Formato de respuesta (debes responder solo en JSON sin texto adicional):**
            {
              "response": "Texto de la respuesta del bot",
              "name": "Juan Pérez",
              "startDate": "2025/02/20 17:30:00"
            }
            
            ⚠️ **Reglas importantes**:
            - NO agregues texto fuera del JSON.
            - Si el usuario no menciona su nombre, usa "${userName}".
            - Si el usuario no menciona la fecha, devuelve "pendiente" en "startDate".
            - Si el usuario no menciona la hora, devuelve "pendiente" en "startDate".
            - NO uses respuestas robóticas, mantén un tono conversacional y amable.`
          },
          { role: 'user', content: message }
        ],
        temperature: 0.7, // Mayor creatividad para respuestas más naturales
      });

      console.log('🤖 Respuesta de IA:', response.choices[0]?.message?.content);

      // Intentamos parsear la respuesta como JSON válido
      try {
        return JSON.parse(response.choices[0]?.message?.content || '{}');
      } catch (error) {
        console.error('❌ Error parseando la respuesta de la IA:', error);
        return {
          response: `Hola ${userName}, ¿para qué fecha y hora quieres reservar?`,
          name: userName || 'pendiente',
          startDate: 'pendiente',
        };
      }

    } catch (error) {
      console.error('❌ Error con la IA:', error);
      return {
        response: `Hola ${userName}, ¿para qué fecha y hora quieres reservar?`,
        name: userName || 'pendiente',
        startDate: 'pendiente',
      };
    }
  }
}
