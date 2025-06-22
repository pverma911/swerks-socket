import { IErrorOptions } from '../../interfaces/errors.interface'
import { CustomApiError } from './customApiError'

class BadRequestError extends CustomApiError {
  statusCode = 400
  options?: IErrorOptions
  constructor(message: string, options?: IErrorOptions) {
    super(message)
    this.options = options
  }
}

export { BadRequestError }
