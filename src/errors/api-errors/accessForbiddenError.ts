import { IErrorOptions } from '../../interfaces/errors.interface'
import { CustomApiError } from './customApiError'

class AccessForbiddenError extends CustomApiError {
  statusCode = 403
  options?: IErrorOptions

  constructor(message: string, options?: IErrorOptions) {
    super(message)
    this.options = options
  }
}
export { AccessForbiddenError }
