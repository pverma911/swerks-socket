import { Schema, model } from 'mongoose';
import { BaseModel } from './baseModel';
import { IClassRoom, IClassRoomModel } from '../interfaces/classRoom.interface';

const classroomSchema = new Schema<IClassRoom, IClassRoomModel>(
  {
    name: { type: String, required: true },
    classSessions: [{ type: Schema.Types.ObjectId, ref: 'ClassSession' }],
    teacherParticipant: [{ type: Schema.Types.ObjectId, ref: 'Participant' }],
    studentParticipant: [{ type: Schema.Types.ObjectId, ref: 'Participant' }],
    participantHistory: [{ type: Schema.Types.ObjectId, ref: 'Participant' }],
    eventLog: [{ type: Schema.Types.ObjectId, ref: 'EventLog' }],
    ...BaseModel.getSchemaFields(),
  },
  BaseModel.getSchemaOptions()
);

classroomSchema.static('findByRoomId', async function findByRoomId(roomId: string) {
  return this.findOne({ roomId, isActive: true });
});

classroomSchema.static(
  'findParticipantByEmail',
  async function findByRoomId(roomId: string, email: string) {
    const classroom = await this.findOne({ roomId, isActive: true })
      .populate({
        path: 'studentParticipant',
        match: { email: email },
        select: 'email,_id',
      })
      .lean();

    // If participant array is not empty, the participant exists
    return classroom?.studentParticipant;
  }
);

export const ClassRoom = model<IClassRoom, IClassRoomModel>('Classroom', classroomSchema);
