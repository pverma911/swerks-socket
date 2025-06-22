import { Types } from 'mongoose';

export interface IEventLog {
  _id: Types.ObjectId;
  roomId: string;
  participant: Types.ObjectId;
  type: string;
  timestamp?: Date;
  role: string;
}
