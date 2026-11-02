import type { ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';
export class AppError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public fields: Record<string, unknown> = {},
  ) {
    super(message);
  }
}
export function assert(
  condition: unknown,
  status: number,
  code: string,
  message: string,
  fields: Record<string, unknown> = {},
): asserts condition {
  if (!condition) throw new AppError(status, code, message, fields);
}
export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof ZodError) {
    res
      .status(400)
      .json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Sprawdź dane formularza.',
          fields: Object.fromEntries(
            err.issues.map((i) => [i.path.join('.') || 'body', i.message]),
          ),
        },
      });
  } else if (err instanceof AppError) {
    res
      .status(err.status)
      .json({ error: { code: err.code, message: err.message, fields: err.fields } });
  } else if (err?.type === 'entity.parse.failed') {
    res
      .status(400)
      .json({ error: { code: 'INVALID_JSON', message: 'Niepoprawny JSON.', fields: {} } });
  } else if (String(err?.message).includes('UNIQUE constraint failed')) {
    res
      .status(409)
      .json({
        error: {
          code: 'ALREADY_EXISTS',
          message: 'Wpis o takim identyfikatorze już istnieje.',
          fields: {},
        },
      });
  } else if (String(err?.message).includes('database is locked')) {
    res
      .status(503)
      .json({
        error: {
          code: 'DATABASE_BUSY',
          message: 'Baza jest chwilowo zajęta. Spróbuj ponownie.',
          fields: {},
        },
      });
  } else {
    console.error('Błąd serwera:', err instanceof Error ? err.name : 'UnknownError');
    res
      .status(500)
      .json({
        error: { code: 'INTERNAL_ERROR', message: 'Nie udało się wykonać operacji.', fields: {} },
      });
  }
};
