import mongoose, { Schema } from 'mongoose';
import { EventType } from '../enums/eventType.enum';
import { UserRole } from '../enums/userRole.enum';

const eventLogSchema = new mongoose.Schema({
  roomId: { type: String, required: true },
  participant: { type: Schema.Types.ObjectId, ref: 'Participant' },
  type: {
    type: String,
    enum: Object.values(EventType),
    required: true,
  },
  role: { type: String, enum: Object.values(UserRole), required: true, default: UserRole.STUDENT },
  timestamp: { type: Date, default: Date.now },
});

const EventLog = mongoose.model('EventLog', eventLogSchema);
export default EventLog;
