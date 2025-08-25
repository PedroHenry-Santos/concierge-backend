import { randomUUID } from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';

export function customRequestId(
  request: IncomingMessage,
  response: ServerResponse,
) {
  const existingID = request.id ?? request.headers['x-request-id'];
  if (existingID) return existingID;
  const id = randomUUID();
  response.setHeader('X-Request-Id', id);
  return id;
}
