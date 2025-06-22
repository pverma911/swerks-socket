import { NextFunction, Request, Response } from 'express';
import ResponseService from '../services/response.service';
import { ClassRoomService } from '../services/classRoom.service';
import { ICreateClassRoom } from '../interfaces/classRoom.interface';

export class ClassRoomController extends ResponseService {
  private readonly classRoomService = ClassRoomService.getInstance();
  private static instance: ClassRoomController;
  constructor() {
    super();
  }

  static getInstance() {
    if (!this.instance) {
      this.instance = new ClassRoomController();
    }

    return this.instance;
  }

  async createClassRoom(req: Request, res: Response, next: NextFunction) {
    try {
      const payload = <ICreateClassRoom>req.validatedBody;

      const { data, message, statusCode } = await this.classRoomService.create(payload);

      this.sendResponse(res, statusCode, data, message);
    } catch (error) {
      next(error);
    }
  }

   async getClassRoomReportById(req: Request, res: Response, next: NextFunction) {
    try {
      const { roomId } = req.validatedParams;

      const { data, message, statusCode } = await this.classRoomService.getClassRoomReportById(roomId);

      this.sendResponse(res, statusCode, data, message);
    } catch (error) {
      next(error);
    }
  } 
}
