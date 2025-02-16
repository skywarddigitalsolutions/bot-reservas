import { Module } from '@nestjs/common';
import { WhatsAppService } from './whats-app.service';
import { WhatsAppController } from './whats-app.controller';
import { AiModule } from 'src/ai/ai.module';

@Module({
  imports: [AiModule],
  controllers: [WhatsAppController],
  providers: [WhatsAppService],
  exports: [WhatsAppService],
})
export class WhatsAppModule {}
