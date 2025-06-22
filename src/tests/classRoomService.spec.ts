import { ClassRoomService } from '../services/classRoom.service';
import { ClassRoom } from '../models/classRoom';
import { ClassSession } from '../models/classSession';
import { Participant } from '../models/user';
import EventLog from '../models/eventLog';
import { UserRole } from '../enums/userRole.enum';
import { EventType } from '../enums/eventType.enum';
import { HttpStatusCode } from '../enums/httpStatusCode.enum';
import { ICreateClassRoom, IJoinClassRoom } from '../interfaces/classRoom.interface';
import { IParticipants } from '../interfaces/participants.interface';

jest.mock('../../src/models/classRoom');
jest.mock('../../src/models/classSession');
jest.mock('../../src/models/user');
jest.mock('../../src/models/eventLog');

function createMockQuery<T>(result: T) {
  const chain = {
    populate: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    lean: jest.fn().mockReturnThis(),
    exec: jest.fn().mockResolvedValue(result),
    then: (resolve: (value: T) => void) => resolve(result),
    catch: () => {},
    [Symbol.toStringTag]: 'Promise',
  };
  return chain as any;
}

function createNullQueryMock() {
  const chain = {
    populate: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    lean: jest.fn().mockReturnThis(),
    exec: jest.fn().mockResolvedValue(null),
    then: (resolve: (value: null) => void) => resolve(null),
    catch: () => {},
    [Symbol.toStringTag]: 'Promise', 
  };
  return chain as any;
}

describe('ClassRoomService', () => {
  let service: ClassRoomService;
  beforeEach(() => {
    jest.clearAllMocks();
    service = ClassRoomService.getInstance();
  });

  describe('create', () => {
    it('creates a classroom and returns CREATED response', async () => {
      const saveMock = jest.fn().mockResolvedValue({ _id: '68584fd1a9bd876a387e8c2c' });
      (ClassRoom as unknown as jest.Mock).mockImplementation(() => ({ save: saveMock }));

      const payload: ICreateClassRoom = { name: 'Test Room' };
      const result = await service.create(payload);

      expect(saveMock).toHaveBeenCalled();
      expect(result.statusCode).toBe(HttpStatusCode.CREATED);
      expect(result.data.roomId).toBe('68584fd1a9bd876a387e8c2c');
      expect(result.message).toMatch('Class room created');
    });
  });

  describe('joinClassroom', () => {
    const payload: Omit<IJoinClassRoom, 'sessionId'> = {
      roomId: 'r1',
      participant: {
        name: 'Alice',
        email: 'a@example.com',
        role: UserRole.STUDENT,
      } as IParticipants,
    };

    it('throws if classroom not found', async () => {
      (ClassRoom.findById as jest.Mock).mockResolvedValue(null);
      await expect(service.joinClassroom(payload)).rejects.toThrow('Class Room does not exist');
    });

    it('throws if student and class inactive', async () => {
      (ClassRoom.findById as jest.Mock).mockResolvedValue({ isActive: false });
      await expect(service.joinClassroom(payload)).rejects.toThrow(
        'Class is not active. you cannot join.'
      );
    });

    it('creates and returns participant when new', async () => {
      const classroom = {
        isActive: true,
        studentParticipant: [],
        teacherParticipant: [],
        participantHistory: [],
        eventLog: [],
        save: jest.fn(),
      };
      (ClassRoom.findById as jest.Mock).mockResolvedValue(classroom);
      (Participant.findOne as jest.Mock).mockResolvedValue(null);
      const saveParticipant = jest.fn().mockResolvedValue({ id: 'p1' });
      (Participant as any).mockImplementation(() => ({ save: saveParticipant }));
      (service as any).createEventLog = jest.fn().mockResolvedValue({ id: 'e1' });

      const result = await service.joinClassroom(payload);

      expect(saveParticipant).toHaveBeenCalled();
      expect(classroom.studentParticipant).toContainEqual(expect.objectContaining({ id: 'p1' }));
      expect(classroom.eventLog).toContain('e1');
      expect(classroom.save).toHaveBeenCalled();
      expect(result).toEqual({ id: 'p1' });
    });
  });

  describe('startClass', () => {
    it('initializes session and logs event', async () => {
      const saveSession = jest.fn();
      (ClassSession as unknown as jest.Mock).mockImplementation(() => ({
        save: saveSession,
        eventLog: [],
      }));
      const classroom = { eventLog: [], save: jest.fn() };
      (ClassRoom.findById as jest.Mock).mockResolvedValue(classroom);
      (service as any).createEventLog = jest.fn().mockResolvedValue({ id: 'log1' });

      const session = await service.startClass('r1', 't1');

      expect(saveSession).toHaveBeenCalled();
      expect(classroom.eventLog).toContain('log1');
      expect(session.eventLog).toContain('log1');
    });
  });

  describe('leaveClassSession', () => {
    it('removes participant, logs leave and possibly end events', async () => {
      const session = {
        currentParticipants: ['u1', 'u2'],
        eventLog: [],
        classRoomId: { id: 'r1' },
        save: jest.fn(),
        endedAt: new Date(),
      };
      (ClassSession.findById as jest.Mock).mockReturnValue({
        populate: jest.fn().mockResolvedValue(session),
      });

      (service as any).createEventLog = jest
        .fn()
        .mockResolvedValueOnce({ id: 'leave1' })
        .mockResolvedValueOnce({ id: 'end1' });

      const res = await service.leaveClassSession('s1', 'u1', UserRole.TEACHER);

      expect(res.currentParticipants).toEqual([]);
      expect(res.eventLog).toEqual(['leave1', 'end1']);
      expect(session.endedAt).toBeInstanceOf(Date);
      expect(session.save).toHaveBeenCalled();
    });
  });

  describe('getClassRoomReportById', () => {
    it('returns formatted report when classroom exists', async () => {
      const event = {
        type: EventType.JOIN,
        participant: { name: 'Bob', role: UserRole.STUDENT },
        timestamp: new Date('2021-01-01T00:00:00Z'),
      };
      const classroom = {
        _id: 'r1',
        name: 'R',
        roomId: 'rid',
        eventLog: [event],
        save: jest.fn(),
        populate: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
      };
      const sessions = [
        {
          startedAt: new Date('2021-01-01T00:00:00Z'),
          endedAt: new Date('2021-01-01T01:00:00Z'),
          eventLog: [event],
        },
      ];

      (ClassRoom.findById as jest.Mock).mockReturnValue(createMockQuery(classroom));
      (ClassSession.find as jest.Mock).mockReturnValue(createMockQuery(sessions));

      const resp = await service.getClassRoomReportById('r1');
      expect(resp.statusCode).toBe(200);
      expect(resp.data.classRoom.eventLog[0]).toMatchObject({
        type: EventType.JOIN,
        name: 'Bob',
        role: UserRole.STUDENT,
      });
      expect(resp.data.classRoom.sessions[0]).toHaveProperty('startedAt');
    });

    it('returns NOT_FOUND when classroom missing', async () => {
      (ClassRoom.findById as jest.Mock).mockReturnValue(createNullQueryMock());
      const resp = await service.getClassRoomReportById('x');
      expect(resp.statusCode).toBe(404);
      expect(resp.message).toBe('Class room not found');
    });
  });
});
