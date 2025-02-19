// src/openai/openai.service.ts

import { Injectable, Logger } from '@nestjs/common';
import OpenAI from 'openai';

@Injectable()
export class OpenaiService {
  private readonly logger = new Logger(OpenaiService.name);
  private assistantId: string;

  constructor(private readonly openai: OpenAI) {
    this.assistantId = process.env.OPENAI_ASSISTANT_ID || '';
    this.logger.log('Inicializando OpenaiService...');
  }

  async createThread(): Promise<string> {
    this.logger.log(`Creando un nuevo thread para el asistente ${this.assistantId}`);
    const thread = await this.openai.beta.threads.create();
    this.logger.debug(`Thread creado con ID: ${thread.id}`);
    return thread.id;
  }

  async getAssistantResponse(message: string, threadId: string): Promise<any> {
    this.logger.log(`Obteniendo respuesta del asistente para el mensaje: ${message}`);
    if (!this.assistantId) {
      const errorMsg = 'OPENAI_ASSISTANT_ID no está definido en las variables de entorno';
      this.logger.error(errorMsg);
      throw new Error(errorMsg);
    }

    try {
      await this.openai.beta.threads.messages.create(threadId, {
        role: 'user',
        content: message
      });
      this.logger.debug(`Mensaje agregado al thread con ID: ${threadId}`);

      const run = await this.openai.beta.threads.runs.create(threadId, {
        assistant_id: this.assistantId
      });
      this.logger.debug(`Ejecución del asistente iniciada con ID: ${run.id}`);

      let runStatus = await this.openai.beta.threads.runs.retrieve(threadId, run.id);
      while (runStatus.status !== 'completed') {
        this.logger.debug(`Estado de la ejecución: ${runStatus.status}`);
        await new Promise((resolve) => setTimeout(resolve, 1000));
        runStatus = await this.openai.beta.threads.runs.retrieve(threadId, run.id);
      }

      const messages = await this.openai.beta.threads.messages.list(threadId);
      this.logger.debug(`Mensajes recibidos: ${JSON.stringify(messages.data)}`);

      const lastMessage = messages.data.find((msg) => msg.role === 'assistant');
      if (!lastMessage) {
        const errorMsg = 'No se recibió respuesta del asistente';
        this.logger.error(errorMsg);
        throw new Error(errorMsg);
      }

      const responseText = lastMessage.content[0].type === 'text' ? lastMessage.content[0].text.value : '';
      this.logger.debug(`Respuesta del asistente: ${responseText}`);

      return JSON.parse(responseText);
    } catch (error) {
      this.logger.error('Error al obtener la respuesta del asistente:', error);
      throw error;
    }
  }
}
