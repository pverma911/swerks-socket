import { Router } from 'express';
import { IRoutes } from '../interfaces/route.interface';
import { ClassRoomController } from '../controllers/classRoom.controller';
import validatePayload from '../middlewares/validation.middleware';
import { createClassRoomValidator } from '../validators/classRoom.validator';

export class ClassRoomRoute implements IRoutes {
  path = '/classroom';
  router = Router();
  controller = ClassRoomController.getInstance();

  constructor() {
    this.initializeRoutes();
  }

  initializeRoutes() {
    this.router.route(`${this.path}/create`)
    .post(
        validatePayload({body:createClassRoomValidator}),
        this.controller.createClassRoom.bind(this.controller)
    );
  }
}
