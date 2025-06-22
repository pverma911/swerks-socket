import { HttpStatusCode } from '../enums/httpStatusCode.enum';
import { UserRole } from '../enums/userRole.enum';
import { ICreateClassRoom, IJoinClassRoom } from '../interfaces/classRoom.interface';
import { IParticipants } from '../interfaces/participants.interface';
import { ClassRoom } from '../models/classRoom';
import { ClassSession } from '../models/classSession';
import { Participant } from '../models/user';
import logger from '../utils/logger';
import ResponseService from './response.service';
import { v4 as uuid } from 'uuid';

export class ClassRoomService extends ResponseService {
  private static instance: ClassRoomService;

  static getInstance() {
    if (!this.instance) {
      this.instance = new ClassRoomService();
    }

    return this.instance;
  }

  async create(payload: ICreateClassRoom) {
    const { name } = payload;
    const classroom = new ClassRoom({
      roomId: uuid(),
      name,
    });

    const { _id } = await classroom.save();
    logger.info(`Classroom created with room ID: ${_id}`);
    return this.serviceResponse(HttpStatusCode.CREATED, { roomId: _id }, 'Class room created');
  }

  async joinClassroom(payload: IJoinClassRoom) {
    try {
      const {
        roomId,
        participant: { name, role, email },
      } = payload;
      const classroom = await ClassRoom.findById(roomId);

      if (!classroom) throw new Error('Class Room does not exist');

      // Check if class is active for students
      if (role === UserRole.STUDENT && !classroom.isActive) {
        throw new Error('Class is not active. you cannot join.');
      }

      // check if participant already exists in db

      let getParticipant = await Participant.findOne({ email });
      // Check if participant already exists in classroom
      if (getParticipant) {
        if (await ClassRoom.findParticipantByEmail(email)) {
          throw new Error('Participant already in classroom');
        }
      }

      // Create participant if not exist
      if (!getParticipant) {
        const newParticipant = new Participant({
          name,
          email,
          role,
        });

        getParticipant = await newParticipant.save();
      }
      // Add to appropriate current list
      if (role === UserRole.TEACHER) {
        (classroom.teacherParticipant as unknown as IParticipants[]).push(getParticipant);
      } else {
        (classroom.studentParticipant as unknown as IParticipants[]).push(getParticipant);
      }

      // Add to history
      (classroom.participantHistory as unknown as IParticipants[]).push(getParticipant);

      await classroom.save();
      logger.info(`Participant ${name} joined classroom ${roomId}`);
      return getParticipant;
    } catch (error) {
      logger.error('Error joining classroom:', error);
      throw error;
    }
  }

  async startClass(roomId: string, teacherId: string) {
    // Create a session for the class
    const session = new ClassSession({
      currentParticipants: [teacherId],
      classRoomId: roomId,
    });

    await session.save();

    logger.info(`Session for class ${roomId}has been created`);

    return session;
  }

  async endClass(sessionId: string) {
    // Create a session for the class
    const session = await ClassSession.findById(sessionId);

    if (!session) throw new Error('Session does not exist');

    session.currentParticipants = [];
    session.endedAt = new Date();

    await session.save();

    return session;
  }

  async leaveClassSession(sessionId: string, userId: string) {
    const session = await ClassSession.findById(sessionId);

    if (!session) throw new Error('Session does not exist');

    session.currentParticipants = session.currentParticipants.filter(
      (participant) => participant === userId
    );
    session.endedAt = new Date();

    await session.save();

    return session;
  }

  async leaveClassRoom(roomId: string, userId: string, role: UserRole) {
    const classroom = await ClassRoom.findById(roomId);

    if (!classroom) throw new Error('Session does not exist');

    if (role === UserRole.STUDENT) {
      classroom.studentParticipant = classroom.studentParticipant.filter(
        (participant: string) => participant === userId
      );
    } else {
      classroom.teacherParticipant = classroom.teacherParticipant.filter(
        (participant: string) => participant === userId
      );
    }

    return classroom;
  }

  async activeSessionsList() {
    // Create a session for the class
    const session = await ClassSession.find({
      endedAt: { $exists: false },
    })
      .populate('classRoomId')
      .lean();

    if (!session) throw new Error('Session does not exist');

    return session;
  }

  async activeSessionsList() {
    // Create a session for the class
    const session = await ClassSession.find({
      endedAt: { $exists: false },
    })
      .populate('classRoomId')
      .lean();

    if (!session) throw new Error('Session does not exist');

    return session;
  }

  findByClassRoomId(roomId: string) {
    return ClassRoom.findById(roomId).populate('studentParticipant').populate('teacherParticipant');
  }

  findByClassSession(roomId: string) {
    return ClassSession.findById(roomId)
      .populate('studentParticipant')
      .populate('teacherParticipant');
  }
}
