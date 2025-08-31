import { z } from 'zod';

export const validationConfigurationSchema = z.object({
  NODE_ENV: z.string({ message: 'NODE_ENV variable is required.' }),
  PORT: z
    .string({ message: 'PORT variable is required.' })
    .transform((value) => Number.parseInt(value, 10))
    .refine((value) => !Number.isNaN(value), {
      message: 'PORT variable must be a number.',
    }),
  DATABASE_URL: z.url({
    message: 'DATABASE_URL variable must be a valid URL.',
  }),
});
