import { NextFunction, Request, Response } from 'express';
import { ObjectSchema } from 'joi';
import { PreconditionError } from '../errors';

interface IValidatePayloadObj {
  body?: ObjectSchema;
  query?: ObjectSchema;
  params?: ObjectSchema;
}

export default function validatePayload({ body, params, query }: IValidatePayloadObj) {
  return function (req: Request, _res: Response, next: NextFunction) {
    try {
      if (body) {
        const { error, value } = body.validate(req.body);

        if (error) {
          throw new PreconditionError(error.message.replace(/\"/g, ''));
        }
        req.validatedBody = value;
      }
      if (params) {
        const { error, value } = params.validate(req.params);

        if (error) {
          throw new PreconditionError(error.message.replace(/\"/g, ''));
        }
        req.validatedParams = value;
      }

      if (query) {
        const { error, value } = query.validate(req.query);

        if (error) {
          throw new PreconditionError(error.message.replace(/\"/g, ''));
        }
        req.validatedQuery = value;
      }
      next();
    } catch (error) {
      return next(error);
    }
  };
}
