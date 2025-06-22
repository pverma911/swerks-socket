import { Document, Model } from 'mongoose';
import { IParticipants } from './participants.interface';
import { IClassRoom } from './classRoom.interface';

export interface IClassSessions extends Document {
  startedAt?: Date;
  endedAt?: Date;
  participantsHistory: Array<IParticipants>;
  currentParticipants: string[];
  classRoomId: IClassRoom;
}

export interface IClassSessionsModel extends Model<IClassSessions> {}
