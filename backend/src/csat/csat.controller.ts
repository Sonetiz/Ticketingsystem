import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { CsatService } from './csat.service';
import { SubmitCsatDto } from './dto/csat.dto';

@ApiTags('csat')
@Controller('csat')
@UseGuards(ThrottlerGuard)
@Throttle({ default: { limit: 30, ttl: 60000 } })
export class CsatController {
  constructor(private readonly csat: CsatService) {}

  @Get(':token')
  getSurvey(@Param('token') token: string) {
    return this.csat.getByToken(token);
  }

  @Post(':token')
  submit(@Param('token') token: string, @Body() dto: SubmitCsatDto) {
    return this.csat.submitByToken(token, dto);
  }
}
