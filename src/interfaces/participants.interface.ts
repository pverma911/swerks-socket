import { Model } from 'mongoose';
import { UserRole } from '../enums/userRole.enum';

export interface IParticipants extends Document {
  name: string;
  role: UserRole;
  email: string;
}

export interface IParticipantsModel extends Model<IParticipants> {
  findByEmail(email: string): Promise<IParticipants>;
}
