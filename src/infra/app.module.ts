import { Module } from '@nestjs/common';

import { LoggerModule } from '@/sharedModules/logger/logger.module';

@Module({
  imports: [LoggerModule],
})
export class AppModule {}
