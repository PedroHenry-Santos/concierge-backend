import { Injectable } from '@nestjs/common';
import {
  ConfigService as NestConfigService,
  Path,
  PathValue,
} from '@nestjs/config';

import type { Config } from '@/sharedModules/configuration/schemas';

@Injectable()
export class ConfigurationService extends NestConfigService<Config, true> {
  override get<P extends Path<Config>>(propertyPath: P): PathValue<Config, P> {
    return super.get(propertyPath, { infer: true });
  }
}
