import { IErrorOptions } from '../../interfaces/errors.interface'
import { CustomApiError } from './customApiError'

class NotAuthorizedError extends CustomApiError {
  statusCode = 401
  options?: IErrorOptions

  constructor(message: string, options?: IErrorOptions) {
    super(message)
    this.options = options
  }
}

export { NotAuthorizedError }
