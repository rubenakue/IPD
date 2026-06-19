import type { RequestHandler } from 'express';
import { ApiError } from '../errors/api-error.ts';

export const requireAuth: RequestHandler = (req, _res, next) => {
  if (typeof req.session.userId !== 'string') {
    next(ApiError.unauthenticated());
    return;
  }

  next();
};