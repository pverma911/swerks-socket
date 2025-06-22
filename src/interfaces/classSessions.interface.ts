import { Document, Model } from 'mongoose';
import { IParticipants } from './participants.interface';
import { IClassRoom } from './classRoom.interface';
import { IEventLog } from './eventLog.interface';

export interface IClassSessions extends Document {
  startedAt?: Date;
  endedAt?: Date;
  participantsHistory: Array<IParticipants>;
  currentParticipants: string[];
  classRoomId: IClassRoom;
  eventLog: Array<IEventLog>;
}

export interface IClassSessionsModel extends Model<IClassSessions> {}
