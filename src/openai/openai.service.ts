// src/openai/openai.service.ts

import { Injectable } from '@nestjs/common';
import OpenAI from 'openai';

@Injectable()
export class OpenaiService {
  private assistantId: string;

  constructor(private readonly openai: OpenAI) {
    this.assistantId = process.env.OPENAI_ASSISTANT_ID || '';
  }

  async getAssistantResponse(message: string): Promise<any> {
    if (!this.assistantId) {
      throw new Error('OPENAI_ASSISTANT_ID no está definido en las variables de entorno');
    }

    // Crear un thread para la conversación
    const thread = await this.openai.beta.threads.create();

    // Agregar el mensaje del usuario al thread
    await this.openai.beta.threads.messages.create(thread.id, {
      role: 'user',
      content: message
    });

    // Ejecutar el asistente
    const run = await this.openai.beta.threads.runs.create(thread.id, {
      assistant_id: this.assistantId
    });

    // Esperar hasta que la ejecución finalice
    let runStatus = await this.openai.beta.threads.runs.retrieve(thread.id, run.id);

    while (runStatus.status !== 'completed') {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      runStatus = await this.openai.beta.threads.runs.retrieve(thread.id, run.id);
    }

    // Obtener los mensajes del thread
    const messages = await this.openai.beta.threads.messages.list(thread.id);

    // Extraer la última respuesta del asistente
    const lastMessage = messages.data.find((msg) => msg.role === 'assistant');

    if (!lastMessage) {
      throw new Error('No se recibió respuesta del asistente');
    }

    // Devolver el contenido como JSON
    const responseText = lastMessage.content[0].type === 'text' ? lastMessage.content[0].text.value : '';
    return JSON.parse(responseText);
  }
}
