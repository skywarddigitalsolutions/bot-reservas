import { Module } from '@nestjs/common';
import { WhatsAppService } from './whats-app.service';
import { WhatsAppController } from './whats-app.controller';

@Module({
  controllers: [WhatsAppController],
  providers: [WhatsAppService],
  exports: [WhatsAppService],
})
export class WhatsAppModule {}
