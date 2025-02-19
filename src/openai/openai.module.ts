// src/openai/openai.module.ts

import { Module } from '@nestjs/common';
import { OpenaiService } from './openai.service';
import OpenAI from 'openai';

//env
require('dotenv').config();

@Module({
  providers: [
    OpenaiService,
    {
      provide: OpenAI,
      useValue: new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
    }
  ],
  exports: [OpenaiService]
})
export class OpenaiModule {}
