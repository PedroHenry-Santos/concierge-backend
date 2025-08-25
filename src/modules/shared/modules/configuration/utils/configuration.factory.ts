import { z } from 'zod';

import { type Config, configurationSchema } from '@/sharedModules/configuration/schemas';

export const factory = (): Config => {
  const validated = configurationSchema.safeParse({
    env: process.env.NODE_ENV,
    port: process.env.PORT,
    database: {
      url: process.env.DATABASE_URL,
    },
  });

  if (validated.success) {
    return validated.data;
  }

  const pretty = z.prettifyError(validated.error);
  throw new Error(`Environment validation failed:\n\n${pretty}`);
};
