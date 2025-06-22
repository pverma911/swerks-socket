import { IErrorOptions } from '../../interfaces/errors.interface'
import { CustomApiError } from "./customApiError";


class PreconditionError extends CustomApiError {
  statusCode = 412;
  options?: IErrorOptions

  constructor(message: string,options?:IErrorOptions) {
    super(message);
    this.options = options;
  }
}

export { PreconditionError };
