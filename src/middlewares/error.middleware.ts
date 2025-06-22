import { CustomApiError } from '../errors/api-errors/customApiError'
import { IErrorOptions } from '../interfaces/errors.interface'
import { ErrorRequestHandler } from 'express'
import logger from '../utils/logger'

const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  let message: string = err.message
  let statusCode: number = err.statusCode
  const errOptions: IErrorOptions = err.options

  console.error('Error middleware: ', err)

  if (err instanceof CustomApiError) {
    logger.error(JSON.stringify(err.message))
  } else if (!statusCode) {
    message = 'Something went wrong!'
    statusCode = 500
    logger.error(`Error triggered from errorHandler: ${err.message}`)
  } else {
    message = 'Something went wrong!'
    statusCode = 500
    logger.error(`Error triggered from errorHandler: ${err.message}`)
  }

  res.status(statusCode).json({
    success: false,
    statusCode,
    message,
    data: errOptions?.data || {},
  })
}

export default errorHandler
