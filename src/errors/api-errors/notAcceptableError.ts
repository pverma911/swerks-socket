import { IErrorOptions } from '../../interfaces/errors.interface'
import { CustomApiError } from './customApiError'

class NotAcceptableError extends CustomApiError {
  statusCode = 406
  options?: IErrorOptions
  constructor(message: string, options?: IErrorOptions) {
    super(message)
    this.options = options
  }
}

export { NotAcceptableError }