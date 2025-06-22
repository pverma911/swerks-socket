import Joi, { ObjectSchema } from 'joi';
import { ICreateClassRoom } from '../interfaces/classRoom.interface';

export const createClassRoomValidator: ObjectSchema<ICreateClassRoom> =
  Joi.object<ICreateClassRoom>({
    name: Joi.string().strict().required(),
  }).unknown(false);
