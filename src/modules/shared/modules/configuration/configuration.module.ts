import { type DynamicModule } from '@nestjs/common';
import {
  ConfigModule as NestConfigModule,
  type ConfigModuleOptions as NestConfigModuleOptions,
} from '@nestjs/config';

import { ConfigurationService } from '@/sharedModules/configuration/services';
import { factory } from '@/sharedModules/configuration/utils';

export const ConfigurationModule = {
  forRoot(options?: NestConfigModuleOptions): DynamicModule {
    return {
      module: ConfigurationService,
      global: true,
      imports: [
        NestConfigModule.forRoot({
          ...options,
          load: options?.load ? [factory, ...options.load] : [factory],
        }),
      ],
      providers: [ConfigurationService],
      exports: [ConfigurationService],
    };
  },
};
