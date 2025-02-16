import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AiService } from './ai/ai.service';
import { AiModule } from './ai/ai.module';
import { WhatsAppService } from './whats-app/whats-app.service';
import { WhatsAppController } from './whats-app/whats-app.controller';
import { WhatsAppModule } from './whats-app/whats-app.module';
import { config } from '../config/config';

@Module({
  imports: [
    ConfigModule.forRoot({ 
      isGlobal: true,
      load: [config]
     }), 
    AiModule,
    WhatsAppModule, 
  ],
  controllers: [
    AppController, 
    WhatsAppController
  ],
  providers: [
    AppService,
    AiService,
    WhatsAppService
  ],
})
export class AppModule { }
