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

        // Si no hay un thread, crear uno nuevo
        if (!threadId) {
            const thread = await this.openai.beta.threads.create();
            threadId = thread.id;
        }

        // Agregar el mensaje al thread
        await this.openai.beta.threads.messages.create(threadId, {
            role: 'user',
            content: message,
        });

        // Ejecutar la corrida del asistente
        const run = await this.openai.beta.threads.runs.createAndPoll(threadId, {
            assistant_id: this.assistantId,
            instructions: `Devuelve la respuesta en formato JSON. La estructura es: {"response":"texto","name":"nombre","startDate":"YYYY-MM-DDTHH:MM","threadId":"id"}. Si no se especifican nombre o fecha, deja esos campos como "pendiente".`
        });

        if (run.status !== 'completed') {
            console.error('❌ El Assistant tardó demasiado en responder.');
            return {
                response: `Hola ${userName}, no pude obtener una respuesta en este momento. Inténtalo nuevamente.`,
                name: "pendiente",
                startDate: "pendiente",
                threadId,
            };
        }

        // Obtener la respuesta del Assistant
        const messages = await this.openai.beta.threads.messages.list(threadId);

        const assistantMessages = messages.data
            .filter(msg => msg.role === 'assistant')
            .map(msg => msg.content.find(c => c.type === 'text')?.text?.value || null)
            .filter(Boolean);

        const assistantMessage = assistantMessages.pop() || '{}';

        console.log('🤖 Respuesta del Assistant:', assistantMessage);

        const isValidJson = (str: string) => {
            try {
                const json = JSON.parse(str);
                return typeof json === 'object' && json !== null;
            } catch {
                return false;
            }
        };

        if (!isValidJson(assistantMessage)) {
            console.error('❌ La respuesta del Assistant NO es un JSON válido.');
            return {
                response: `Hola ${userName}, ¿para qué fecha y hora quieres reservar?`,
                name: "pendiente",
                startDate: "pendiente",
                threadId,
            };
        }

        const parsedResponse = JSON.parse(assistantMessage);

        // ✅ Nueva validación: Si no hay fecha ni nombre, responder de forma más general
        if (!parsedResponse.name || parsedResponse.name === "pendiente" || !parsedResponse.startDate || parsedResponse.startDate === "pendiente") {
            parsedResponse.response = `Hola ${userName}, ¿para qué fecha y hora te gustaría reservar la cancha?`;
        }

        return { ...parsedResponse, threadId };

    } catch (error) {
        console.error('❌ Error con la IA:', error);
        return {
            response: `Hola ${userName}, ¿para qué fecha y hora quieres reservar?`,
            name: "pendiente",
            startDate: "pendiente",
            threadId: threadId || '',
        };
    }
}

  
}
