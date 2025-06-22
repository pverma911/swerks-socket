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
      participantsHistory: [teacherId],
      classRoomId: roomId,
      startedAt: new Date(),
    });

    await session.save();

    logger.info(`Session for class ${roomId} has been created`);

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

  async leaveClassSession(sessionId: string, userId: string, role: UserRole) {
    const session = await ClassSession.findById(sessionId);

    if (!session) throw new Error('Session does not exist');

    session.currentParticipants = session.currentParticipants.filter(
      (participant) => participant != userId
    );

    if (role === UserRole.TEACHER) {
      session.endedAt = new Date();
      session.currentParticipants = [];
    }

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

  async activeSessionsListWithRoomId(roomId: string) {
    // Create a session for the class
    const session = await ClassSession.find({
      endedAt: { $exists: false },
      classRoomId: roomId,
    })
      .populate('classRoomId')
      .lean();

    if (!session) throw new Error('Session does not exist');

    return session;
  }

  async joinSessionViaSessionList(sessionId: string, participant: IParticipants) {
    // Create a session for the class
    const session = await ClassSession.findById(sessionId).populate('classRoomId');
    if (!session) throw new Error('Session not found');

    const classRoom = session.classRoomId;
    if (!classRoom) throw new Error('Classroom not associated with session');

    let getParticipant = await Participant.findOne({ email: participant.email });

    if (!getParticipant) {
      // If not exists, create and add directly to both
      getParticipant = await Participant.create(participant);

      classRoom.studentParticipant.push(participant.id);
      classRoom.participantHistory.push(participant.id);
      session.currentParticipants.push(participant.id);
      session.participantsHistory.push(participant.id);

      await Promise.all([classRoom.save(), session.save()]);
      return { getParticipant, classRoomId: classRoom.id };
    }

    // 1. Check if already in session
    const alreadyInSession = session.currentParticipants.some(
      (p: any) => p?.toString() == participant._id
    );
    if (alreadyInSession) throw new Error('User is already in this session somewhere');

    // 2. Check if already in classroom
    const alreadyInClassroom = classRoom.studentParticipant.some(
      (s: any) => s?.toString() == participant._id
    );

    // 3. Add to classroom if not present
    if (!alreadyInClassroom) {
      classRoom.studentParticipant.push(participant.id);
      classRoom.participantHistory.push(participant.id);

      await classRoom.save();
    }

    // 4. Add to session
    session.currentParticipants.push(participant.id);
    session.participantsHistory.push(participant.id);

    await session.save();
    return { getParticipant, classRoomId: classRoom.id };
  }

  findByClassRoomId(roomId: string) {
    return ClassRoom.findById(roomId).populate('studentParticipant').populate('teacherParticipant');
  }

  async findByClassSession(sessionId: string) {
    const session = await ClassSession.findById(sessionId)
      .populate('currentParticipants')
      .populate('classRoomId')
      .lean();

    if (!session) return null;

    const studentParticipant: IParticipants[] = [];
    const teacherParticipant: IParticipants[] = [];

    (session.currentParticipants as unknown as IParticipants[]).map((participant) => {
      if (participant.role === UserRole.TEACHER) {
        teacherParticipant.push(participant);
      } else {
        studentParticipant.push(participant);
      }
    });

    (session as any).teacherParticipant = teacherParticipant;
    (session as any).studentParticipant = studentParticipant;
    (session as any).name = session.classRoomId.name;
    return session;
  }

  async findParticipantByEmail(participant: IParticipants) {
    const user = await Participant.findByEmail(participant.email);

    if (!user) {
      return await Participant.create(participant);
    }

    return user;
  }
}
