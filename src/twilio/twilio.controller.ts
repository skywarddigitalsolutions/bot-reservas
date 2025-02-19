// src/twilio/twilio.controller.ts

import { Controller, Post, Req, Res } from '@nestjs/common';
import { TwilioService } from './twilio.service';
import { Request, Response } from 'express';

@Controller('twilio')
export class TwilioController {
  constructor(private readonly twilioService: TwilioService) {}

  @Post('webhook')
  async handleIncomingMessage(@Req() req: Request, @Res() res: Response) {
    try {
      const message = req.body.Body;
      const from = req.body.From;

      await this.twilioService.processUserMessage(message, from);

      res.status(200).json({ success: true });
    } catch (error) {
      console.error('Error handling Twilio message:', error);
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }
}
