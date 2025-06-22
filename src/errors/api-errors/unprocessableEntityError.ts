import { IErrorOptions } from '../../interfaces/errors.interface'
import { CustomApiError } from './customApiError'

class UnprocessableEntity extends CustomApiError {
  statusCode = 422
  options?: IErrorOptions

  constructor(message: string, options?: IErrorOptions) {
    super(message)
    this.options = options
  }
}

export { UnprocessableEntity }
