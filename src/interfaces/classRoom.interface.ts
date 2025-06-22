import { Document, Model } from 'mongoose';
import { IClassSessions } from './classSessions.interface';
import { IParticipants } from './participants.interface';

export interface IClassRoom extends Document {
  roomId: string;
  name: string;
  classSessions: Array<IClassSessions>;
  teacherParticipant: string[];
  studentParticipant: string[];
  participantHistory: string[];
  isActive: boolean;
}

export interface IClassRoomModel extends Model<IClassRoom> {
  findByRoomId(roomId: string): Promise<IClassRoom>;
  findParticipantByEmail(email: string): Promise<IClassRoom>;
}

export interface ICreateClassRoom {
  name: string;
}

export interface IJoinClassRoom {
  sessionId: string;
  roomId: string;
  participant: IParticipants;
}
