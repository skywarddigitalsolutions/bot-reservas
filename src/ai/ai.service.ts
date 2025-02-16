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

  async getResponse(message: string): Promise<string> {
    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: message }],
        temperature: 0.7,
      });

      return response.choices[0].message.content || 'No entendí tu consulta.';
    } catch (error) {
      console.error('Error con la IA:', error);
      return 'Hubo un problema procesando tu mensaje.';
    }
  }
}
