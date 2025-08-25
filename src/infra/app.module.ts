import { Module } from '@nestjs/common';

import { ConfigurationModule } from '@/sharedModules/configuration/configuration.module';
import { LoggerModule } from '@/sharedModules/logger/logger.module';

@Module({
  imports: [LoggerModule, ConfigurationModule.forRoot()],
})
export class AppModule {}
