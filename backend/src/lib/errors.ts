/** Müştəri tərəfə kod qaytarılır — tərcümə mobil tətbiqdə (az/ru/en) edilir */
export class AppError extends Error {
  constructor(public code: string, public status = 400, public extra?: Record<string, unknown>) {
    super(code);
  }
}

export const err = {
  badRequest: (code = 'BAD_REQUEST', extra?: Record<string, unknown>) => new AppError(code, 400, extra),
  unauthorized: (code = 'UNAUTHORIZED') => new AppError(code, 401),
  forbidden: (code = 'FORBIDDEN') => new AppError(code, 403),
  notFound: (code = 'NOT_FOUND') => new AppError(code, 404),
  insufficient: (need: number) => new AppError('INSUFFICIENT_COINS', 402, { need }),
};
