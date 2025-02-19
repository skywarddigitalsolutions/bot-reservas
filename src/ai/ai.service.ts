import { Injectable } from '@nestjs/common';
import OpenAI from 'openai';

@Injectable()
export class AiService {
  private openai: OpenAI;
  private assistantId: string;

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    this.assistantId = process.env.OPENAI_ASSISTANT_ID || '';
  }

  async getReservationDetails(
    message: string, 
    userName: string, 
    threadId: string | null = null
  ): Promise<{ response: string; name: string; startDate: string; threadId: string }> {
    try {
      console.log(`📩 Enviando mensaje al Assistant: ${message}`);

      // 1️⃣ Si no hay un thread, crear uno nuevo
      if (!threadId) {
        const thread = await this.openai.beta.threads.create();
        threadId = thread.id;
      }

      // 2️⃣ Agregar el mensaje al thread
      await this.openai.beta.threads.messages.create(threadId, {
        role: 'user',
        content: message,
      });

      // 3️⃣ Ejecutar la corrida del asistente con la instrucción corregida
      const run = await this.openai.beta.threads.runs.createAndPoll(threadId, {
        assistant_id: this.assistantId,
        instructions: `RESPONDE SOLO EN JSON. NO AGREGUES SALUDOS NI TEXTO FUERA DEL JSON.`
      });

      console.log("------------ run ------------", run)

      // 4️⃣ Si la respuesta no se completó, devolver un mensaje genérico
      if (run.status !== 'completed') {
        console.error('❌ El Assistant tardó demasiado en responder.');
        return {
          response: `Hola ${userName}, no pude obtener una respuesta en este momento. Inténtalo nuevamente.`,
          name: userName || 'pendiente',
          startDate: 'pendiente',
          threadId,
        };
      }

      // 5️⃣ Obtener la respuesta del Assistant
      const messages = await this.openai.beta.threads.messages.list(threadId);

      console.log("------------ messages ------------", messages)

      // Filtrar solo los mensajes de texto
      const assistantMessage = messages.data
        .filter(msg => msg.role === 'assistant')
        .map(msg => {
          const textContent = msg.content.find(c => c.type === 'text');
          return textContent ? textContent.text.value : null;
        })
        .filter(msg => msg !== null)
        .reverse()[0] || '{}';

      console.log('🤖 Respuesta del Assistant:', assistantMessage);

      // 🚨 Validar antes de parsear
      if (!assistantMessage.startsWith('{') || !assistantMessage.endsWith('}')) {
        console.error('❌ La respuesta del Assistant NO es un JSON válido.');
        return {
          response: assistantMessage,
          name: userName || 'pendiente',
          startDate: 'pendiente',
          threadId,
        };
      }

      // 6️⃣ Intentar parsear la respuesta como JSON
      try {
        const parsedResponse = JSON.parse(assistantMessage);
        return { ...parsedResponse, threadId };
      } catch (error) {
        console.error('❌ Error parseando la respuesta de la IA:', error);
        return {
          response: `Hola ${userName}, ¿para qué fecha y hora quieres reservar?`,
          name: userName || 'pendiente',
          startDate: 'pendiente',
          threadId,
        };
      }

    } catch (error) {
      console.error('❌ Error con la IA:', error);
      return {
        response: `Hola ${userName}, ¿para qué fecha y hora quieres reservar?`,
        name: userName || 'pendiente',
        startDate: 'pendiente',
        threadId: threadId || '',
      };
    }
  }
}
