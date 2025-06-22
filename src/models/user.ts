import { model, Schema } from 'mongoose';
import { UserRole } from '../enums/userRole.enum';
import { IParticipants, IParticipantsModel } from '../interfaces/participants.interface';

export const participantSchema = new Schema<IParticipants>({
  name: { type: String, required: true },
  email: { type: String, required: true },
  role: { type: String, enum: Object.values(UserRole), required: true, default: UserRole.STUDENT },
});

participantSchema.static('findByEmail', function findByEmail(email: string) {
  return this.findOne({ email });
});

export const Participant = model<IParticipants, IParticipantsModel>(
  'Participant',
  participantSchema
);
