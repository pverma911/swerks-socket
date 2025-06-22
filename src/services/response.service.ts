import { Response } from 'express'

abstract class ResponseService {
  constructor() {}

  protected isSuccess = (statusCode: number) => {
    const errorStatusCodes = [400, 401, 404, 403, 500, 469, 412, 422]
    return errorStatusCodes.every((status) => status !== statusCode)
  }

  protected sendResponse = (
    res: Response,
    statusCode: number,
    data?: object,
    message?: string,
  ) => {
    return res.status(statusCode).json({
      success: this.isSuccess(statusCode) ? true : false,
      statusCode: Number(statusCode),
      message: message,
      data,
    })
  }

  protected serviceResponse = (
    statusCode: number,
    data: Record<string,any>,
    message: string,
  ) => {
    return { statusCode, data, message }
  }
}

export default ResponseService
