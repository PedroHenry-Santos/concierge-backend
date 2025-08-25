import { z } from 'zod';

import {
  configurationSchema,
  environmentSchema,
} from '@/sharedModules/configuration/schemas';

export type Environment = z.infer<typeof environmentSchema>;

export type Config = z.infer<typeof configurationSchema>;
