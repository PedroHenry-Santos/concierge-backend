import { z } from 'zod';

export const environmentSchema = z.enum(['test', 'development', 'production']);

const databaseSchema = z.object({
  url: z.string().startsWith('postgresql://'),
});

export const configurationSchema = z.object({
  env: environmentSchema,
  port: z.coerce.number().positive().int(),
  database: databaseSchema,
});
