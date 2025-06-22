import moment from 'moment';
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
import { EventType } from '../enums/eventType.enum';
import EventLog from '../models/eventLog';

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
      name,
    });

    const { _id } = await classroom.save();
    logger.info(`Classroom created with room ID: ${_id}`);
    return this.serviceResponse(HttpStatusCode.CREATED, { roomId: _id }, 'Class room created');
  }

  async joinClassroom(payload: Omit<IJoinClassRoom, 'sessionId'>) {
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

      // Create event log for joining classroom
      // ! LOG
      const eventLog = await this.createEventLog(roomId, getParticipant.id, EventType.JOIN, role);

      // Add event log to classroom
      classroom.eventLog.push(eventLog.id);
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

    // Create event log for starting class
    // ! lOG
    const eventLog = await this.createEventLog(
      roomId,
      teacherId,
      EventType.START_CLASS,
      UserRole.TEACHER
    );

    const classroom = await ClassRoom.findById(roomId);
    if (classroom) {
      classroom.eventLog.push(eventLog.id);
      await classroom.save();
    }

    logger.info(`Session for class ${roomId} has been created`);

    // ! lOG
    session.eventLog.push(eventLog.id);
    await session.save();

    return session;
  }

  async endClass(sessionId: string) {
    // Create a session for the class
    const session = await ClassSession.findById(sessionId).populate('classRoomId');

    if (!session) throw new Error('Session does not exist');
    const roomId = session.classRoomId.id;

    // Get teacher from current participants to log the end event
    const teacherParticipants = await Participant.find({
      _id: { $in: session.currentParticipants },
      role: UserRole.TEACHER,
    });

    // Create event logs for all current participants leaving
    // ! LOG
    const eventLogs = [];

    if (teacherParticipants.length > 0) {
      for (const participant of teacherParticipants) {
        const teacherEventLog = await this.createEventLog(
          roomId,
          participant.id,
          EventType.END_CLASS,
          UserRole.TEACHER
        );
        eventLogs.push(teacherEventLog.id);
      }
    }

    // Log all other participants leaving
    const otherParticipants = await Participant.find({
      _id: { $in: session.currentParticipants },
      role: { $ne: UserRole.TEACHER },
    });

    if (otherParticipants.length > 0) {
      for (const participant of otherParticipants) {
        const leaveEventLog = await this.createEventLog(
          roomId,
          participant.id,
          EventType.LEAVE,
          participant.role
        );
        eventLogs.push(leaveEventLog._id);
      }
    }

    session.currentParticipants = [];
    session.endedAt = new Date();
    session.eventLog.push(...eventLogs);

    await session.save();

    return session;
  }

  async leaveClassSession(sessionId: string, userId: string, role: UserRole) {
    const session = await ClassSession.findById(sessionId).populate('classRoomId');

    if (!session) throw new Error('Session does not exist');
    const classroom = session.classRoomId;
    //! LOG
    const eventLog = await this.createEventLog(classroom.id, userId, EventType.LEAVE, role);

    session.currentParticipants = session.currentParticipants.filter(
      (participant) => participant != userId
    );

    session.eventLog.push(eventLog.id);

    if (role === UserRole.TEACHER) {
      const endClassEventLog = await this.createEventLog(
        classroom.id,
        userId,
        EventType.END_CLASS,
        UserRole.TEACHER
      );
      session.endedAt = new Date();
      session.currentParticipants = [];
      session.eventLog.push(endClassEventLog.id);
    }

    await session.save();

    return session;
  }

  async leaveClassRoom(roomId: string, userId: string, role: UserRole) {
    const classroom = await ClassRoom.findById(roomId);

    if (!classroom) throw new Error('Session does not exist');

    const eventLog = await this.createEventLog(roomId, userId, EventType.LEAVE, role);

    if (role === UserRole.STUDENT) {
      classroom.studentParticipant = classroom.studentParticipant.filter(
        (participant: string) => participant === userId
      );
    } else {
      classroom.teacherParticipant = classroom.teacherParticipant.filter(
        (participant: string) => participant === userId
      );
    }

    classroom.eventLog.push(eventLog.id);
    await classroom.save();

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

      const eventLog = await this.createEventLog(
        classRoom.id,
        getParticipant.id,
        EventType.JOIN,
        participant.role
      );

      session.eventLog.push(eventLog.id);

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

    // Create event log for joining
    const eventLog = await this.createEventLog(
      classRoom.id,
      getParticipant.id,
      EventType.JOIN,
      getParticipant.role
    );

    // 3. Add to classroom if not present
    if (!alreadyInClassroom) {
      classRoom.studentParticipant.push(getParticipant.id);
      classRoom.participantHistory.push(getParticipant.id);
      classRoom.eventLog.push(eventLog.id);

      await classRoom.save();
    }

    // 4. Add to session
    session.currentParticipants.push(getParticipant.id);
    session.participantsHistory.push(getParticipant.id);
    session.eventLog.push(eventLog.id);

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

  async getClassRoomReportById(roomId: string) {
    const classroom = await ClassRoom.findById(roomId)
      .populate('studentParticipant')
      .populate('teacherParticipant')
      .populate({
        path: 'eventLog',
        populate: {
          path: 'participant',
          select: 'name role',
        },
        select: 'type participant timestamp',
      });

    if (!classroom) {
      return this.serviceResponse(HttpStatusCode.NOT_FOUND, {}, 'Class room not found');
    }

    const sessions = await ClassSession.find({ classRoomId: classroom._id })
      .select('startedAt endedAt eventLog')
      .populate({
        path: 'eventLog',
        populate: {
          path: 'participant',
          select: 'name role',
        },
        select: 'type participant timestamp',
      })
      .lean();

    return this.serviceResponse(
      HttpStatusCode.OK,
      {
        classRoom: {
          name: classroom.name,
          roomId: classroom.roomId,

          eventLog: classroom.eventLog.map((event: any) => {
            const participant = event.participant as { name?: string; role?: string } | null;
            return {
              type: event.type,
              name: participant?.name || null,
              role: participant?.role || event.role || null,
              timestamp: moment(event.timestamp).format('YYYY-MM-DD HH:mm:ss'),
            };
          }),

          sessions: sessions.map((session) => ({
            startedAt: moment(session.startedAt).format('YYYY-MM-DD HH:mm:ss'),
            endedAt: moment(session.endedAt).format('YYYY-MM-DD HH:mm:ss'),
            eventLog: session.eventLog.map((event: any) => {
              const participant = event.participant as { name?: string; role?: string } | null;
              return {
                type: event.type,
                name: participant?.name || null,
                role: participant?.role || event.role || null,
                timestamp: moment(event.timestamp).format('YYYY-MM-DD HH:mm:ss'),
              };
            }),
          })),
        },
      },
      'Class room report retrieved successfully'
    );
  }

  private async createEventLog(
    roomId: string,
    participantId: string,
    type: EventType,
    role: UserRole
  ) {
    try {
      const eventLog = new EventLog({
        roomId,
        participant: participantId,
        type,
        role,
        timestamp: new Date(),
      });

      const savedLog = await eventLog.save();
      logger.info(`Event logged: ${type} for participant ${participantId} in room ${roomId}`);
      return savedLog;
    } catch (error) {
      logger.error('Error creating event log:', error);
      throw error;
    }
  }
}
