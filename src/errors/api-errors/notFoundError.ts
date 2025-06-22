import { IErrorOptions } from '../../interfaces/errors.interface'
import { CustomApiError } from './customApiError'

class NotFoundError extends CustomApiError {
  statusCode = 404
  options?: IErrorOptions
  constructor(message: string, options?: IErrorOptions) {
    super(message)
    this.options = options
  }
}

export { NotFoundError }
