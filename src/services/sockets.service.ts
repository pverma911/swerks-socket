import { Server, Socket } from 'socket.io';
// import { validateJoinRequest, validateClassAction } from '../utils/validation';
import { ClassRoomService } from './classRoom.service';
import logger from '../utils/logger';
import { IJoinClassRoom } from '../interfaces/classRoom.interface';
import { UserRole } from '../enums/userRole.enum';

// Types for better type safety
interface JoinClassroomData {
  roomId: string;
  participant: {
    userId: string;
    name: string;
    role: 'teacher' | 'student';
  };
}

interface ClassroomSocket extends Socket {
  userId: string;
  roomId: string;
  sessionId: string;
  role: UserRole;
}

interface ClassroomState {
  id: string;
  participants: any[];
  status: 'waiting' | 'active' | 'ended';
  // Add other classroom state properties as needed
}

export class SocketService {
  private io: Server;
  private readonly classroomService = ClassRoomService.getInstance();

  constructor(io: Server) {
    this.io = io;
    this.setupSocketHandlers();
  }

  /**
   * Sets up all socket event handlers
   */
  private setupSocketHandlers(): void {
    this.io.on('connection', (socket: Socket) => {
      logger.info(`Socket connected: ${socket.id}`);

      socket.on('join-classroom', (data: IJoinClassRoom) =>
        this.handleJoinSessionViaList(socket, data)
      );

      socket.on('leave-classroom', () => this.handleLeaveClassroom(socket));

      socket.on('start-class', () => this.handleStartClass(socket));

      socket.on('start-class-room', (data) => this.handleStartClassRoom(socket, data));

      socket.on('end-class', () => this.handleEndClass(socket));

      socket.on('get-active-sessions', () => this.handlActiveSessionList(socket));
      socket.on('get-active-sessions-room', (data: { roomId: string }) =>
        this.handlActiveSessionListWithRoomId(socket, data)
      );

      socket.on('get-user', (data) => this.getUser(socket, data));

      // IMP
      socket.on('join-session', (data) => this.handleJoinSessionViaList(socket, data));

      socket.on('disconnect', () => this.handleDisconnect(socket));
    });

    logger.info('Sockets has been initialized');
  }

  /**
   * Handles participant joining a classroom
   */
  async handleJoinClassroom(socket: Socket, data: IJoinClassRoom): Promise<void> {
    try {
      // const { error } = validateJoinRequest(data);
      // if (error) {
      //   this.emitError(socket, error.details[0].message);
      //   return;
      // }

      const { roomId, participant } = data;
      const classParticipant = await this.classroomService.joinClassroom(data);

      // Set socket properties
      socket.join(roomId);
      socket.data.userId = String(classParticipant._id);
      socket.data.roomId = roomId;
      socket.data.role = classParticipant.role;

      const classroomState = await this.classroomService.findByClassRoomId(roomId);

      // Emit to all participants in the room
      this.io.to(roomId).emit('classroom-updated', classroomState);

      // Send success response to the joining participant
      socket.emit('join-success', {
        message: 'Successfully joined classroom',
        classroom: classroomState,
      });

      logger.info(`${participant.name} joined classroom ${roomId}`);
    } catch (error) {
      console.log(error);
      this.emitError(socket, (error as Error).message);
      logger.error('Join classroom error:', error);
    }
  }

  async handleJoinSessionViaList(socket: Socket, data: IJoinClassRoom): Promise<void> {
    try {
      // const { error } = validateJoinRequest(data);
      // if (error) {
      //   this.emitError(socket, error.details[0].message);
      //   return;
      // }

      const { sessionId, participant } = data;
      const classParticipant = await this.classroomService.joinSessionViaSessionList(
        sessionId,
        participant
      );

      // Set socket properties
      socket.join(sessionId);
      socket.data.userId = classParticipant.getParticipant.id;
      socket.data.roomId = classParticipant.classRoomId;
      socket.data.role = classParticipant.getParticipant.role;
      socket.data.sessionId = sessionId;

      const classroomState = await this.classroomService.findByClassSession(sessionId);

      // Emit to all participants in the room
      this.io.to(sessionId).emit('classroom-updated', classroomState);

      // Send success response to the joining participant
      socket.emit('join-success', {
        message: 'Successfully joined classroom',
        classroom: classroomState,
      });

      logger.info(`${participant.name} joined classroom with sessionId ${sessionId}`);
    } catch (error) {
      console.log(error);
      this.emitError(socket, (error as Error).message);
      logger.error('Join classroom error:', error);
    }
  }

  async getUser(socket: Socket, data: IJoinClassRoom): Promise<void> {
    try {
      logger.info('Get User info triggered:');

      const { participant } = data;

      const getParticipant = await this.classroomService.findParticipantByEmail(participant);

      socket.emit('set-user', getParticipant);
    } catch (error) {
      console.log(error);
      this.emitError(socket, (error as Error).message);
      logger.error('Get User error:', error);
    }
  }

  /**
   * Handles participant leaving a classroom
   */
  public async handleLeaveClassroom(socket: Socket): Promise<void> {
    try {
      if (!socket.data.roomId || !socket.data.userId) {
        this.emitError(socket, 'Not in a classroom');
        return;
      }

      await this.classroomService.leaveClassSession(
        socket.data.sessionId,
        socket.data.userId,
        socket.data.role
      );

      socket.leave(socket.data.sessionId);

      const classroomState = await this.classroomService.findByClassSession(socket.data.sessionId);

      // Emit to remaining participants
      // socket.to(socket.data.sessionId).emit('classroom-session-updated', session);
      this.io.to(socket.data.sessionId).emit('classroom-updated', classroomState);

      socket.emit('leave-success', { message: 'Left classroom successfully' });

      logger.info(`${socket.data.userId} left classroom session ${socket.data.sessionId}`);

      // Clean up socket data
      this.clearSocketData(socket);
    } catch (error) {
      this.emitError(socket, (error as Error).message);
      logger.error('Leave classroom error:', error);
    }
  }

  /**
   * Handles starting a class (teacher only)
   */
  public async handleStartClass(socket: Socket): Promise<void> {
    try {
      if (!this.validateTeacherPermission(socket)) {
        this.emitError(socket, 'Only teachers can start the class');
        return;
      }

      const session = await this.classroomService.startClass(
        socket.data.roomId,
        socket.data.userId
      );
      socket.data.sessionId = session._id;

      this.io.to(socket.data.sessionId).emit('class-session-updated', session);
      this.io.to(socket.data.sessionId).emit('class-room-created', {
        message: 'Class Room has started',
        startedBy: socket.data.userId,
      });

      logger.info(`Class Room created with id ${socket.data.roomId} by ${socket.data.userId}`);
    } catch (error) {
      this.emitError(socket, (error as Error).message);
      logger.error('Start class error:', error);
    }
  }

  public async handleStartClassRoom(socket: Socket, data: any): Promise<void> {
    try {
      if (data.participant.role === UserRole.STUDENT) {
        this.emitError(socket, 'Only teachers can start the class');
        return;
      }

      const session = await this.classroomService.startClass(data.roomId, data.participant._id);
      socket.data.sessionId = session.id;
      socket.data.userId = data.participant._id;
      socket.data.roomId = data.roomId;
      socket.data.role = data.participant.role;

      // this.io.to(socket.data.sessionId).emit('class-session-updated', session);
      // this.io.to(socket.data.sessionId).emit('class-room-created', {
      //   message: 'Class Room has started',
      //   startedBy: socket.data.userId,
      // });

      const classroomState = await this.classroomService.findByClassSession(socket.data.sessionId);
      socket.join(socket.data.sessionId);
      this.io.to(socket.data.sessionId).emit('classroom-updated', classroomState);

      // Send success response to the joining participant
      socket.emit('join-success', {
        message: 'Successfully joined classroom',
        classroom: classroomState,
      });

      logger.info(`Class Room created with id ${socket.data.roomId} by ${socket.data.userId}`);
    } catch (error) {
      this.emitError(socket, (error as Error).message);
      logger.error('Start class error:', error);
    }
  }

  public async handlActiveSessionList(socket: Socket): Promise<void> {
    try {
      const sessions = await this.classroomService.activeSessionsList();

      socket.emit('active-sessions-list', sessions);

      logger.info(`Class Room created with id ${socket.data.roomId} by ${socket.data.userId}`);
    } catch (error) {
      this.emitError(socket, (error as Error).message);
      logger.error('Start class error:', error);
    }
  }

  public async handlActiveSessionListWithRoomId(
    socket: Socket,
    data: { roomId: string }
  ): Promise<void> {
    try {
      const { roomId } = data;
      const sessions = await this.classroomService.activeSessionsListWithRoomId(roomId);

      socket.emit('active-sessions-list', sessions);

      logger.info('active-sessions-list');
    } catch (error) {
      this.emitError(socket, (error as Error).message);
      logger.error('Start class error:', error);
    }
  }

  /**
   * Handles ending a class (teacher only)
   */
  public async handleEndClass(socket: Socket): Promise<void> {
    try {
      if (!this.validateTeacherPermission(socket)) {
        this.emitError(socket, 'Only teachers can end the class');
        return;
      }

      const session = await this.classroomService.endClass(socket.data.sessionId);

      this.io.to(socket.data.sessionId).emit('class-session-updated', session);
      this.io.to(socket.data.sessionId).emit('class-session-ended', {
        message: 'Class session has ended',
        endedBy: socket.data.userId,
      });

      socket.leave(socket.data.sessionId);
      const socketsInRoom = await this.io.in(socket.data.sessionId).fetchSockets();

      socketsInRoom.forEach((s) => {
        s.leave(socket.data.sessionId);
      });

      logger.info(`Class session ended in ${socket.data.roomId} by ${socket.data.userId}`);
    } catch (error) {
      this.emitError(socket, (error as Error).message);
      logger.error('End class error:', error);
    }
  }

  /**
   * Handles socket disconnection
   */
  public async handleDisconnect(socket: Socket): Promise<void> {
    logger.info(`Socket disconnected: ${socket.id}`);

    // Auto-leave classroom on disconnect
    if (socket.data.roomId && socket.data.userId && socket.data.sessionId) {
      try {
       await this.handleLeaveClassroom(socket)
        logger.info(
          `${socket.data.userId} auto-left classroom ${socket.data.roomId} due to disconnect`
        );
      } catch (error) {
        logger.error('Auto-leave error:', error);
      }
    }
  }

  /**
   * Broadcasts a message to all participants in a classroom
   */
  public broadcastToClassroom(roomId: string, event: string, data: any): void {
    this.io.to(roomId).emit(event, data);
  }

  /**
   * Sends a message to a specific socket
   */
  public sendToSocket(socketId: string, event: string, data: any): void {
    this.io.to(socketId).emit(event, data);
  }

  /**
   * Gets all sockets in a specific room
   */
  public async getSocketsInRoom(roomId: string): Promise<Set<string>> {
    const sockets = await this.io.in(roomId).allSockets();
    return sockets;
  }

  /**
   * Validates if socket has teacher permission
   */
  private validateTeacherPermission(socket: Socket): boolean {
    return !!(socket.data.roomId && socket.data.userId && socket.data.role === UserRole.TEACHER);
  }

  /**
   * Emits error to socket
   */
  private emitError(socket: Socket, message: string): void {
    socket.emit('error', { message });
  }

  /**
   * Clears socket data
   */
  private clearSocketData(socket: Socket): void {
    delete socket.data.userId;
    delete socket.data.roomId;
    delete socket.data.role;
  }

  /**
   * Gets classroom state for a specific room
   */
  //   public async getClassroomState(roomId: string): Promise<ClassroomState | null> {
  //     try {
  //       const classroom = await this.classroomService.getClassroom(roomId);
  //       return this.classroomService.getClassroomState(classroom);
  //     } catch (error) {
  //       logger.error('Get classroom state error:', error);
  //       return null;
  //     }
  //   }

  /**
   * Forcefully removes a participant from classroom (admin function)
   */
  //   public async removeParticipant(roomId: string, userId: string): Promise<void> {
  //     try {
  //       const classroom = await this.classroomService.leaveClassroom(roomId, userId);
  //       const classroomState = this.classroomService.getClassroomState(classroom);

  //       // Find and disconnect the socket
  //       const sockets = await this.io.in(roomId).fetchSockets();
  //       const targetSocket = sockets.find((s) => (s as ClassroomSocket).userId === userId);

  //       if (targetSocket) {
  //         targetSocket.leave(roomId);
  //         targetSocket.emit('removed-from-classroom', {
  //           message: 'You have been removed from the classroom',
  //           roomId,
  //         });
  //         this.clearSocketData(targetSocket as ClassroomSocket);
  //       }

  //       // Notify remaining participants
  //       this.io.to(roomId).emit('classroom-updated', classroomState);
  //       this.io.to(roomId).emit('participant-removed', {
  //         message: 'A participant has been removed',
  //         userId,
  //       });

  //       logger.info(`${userId} was removed from classroom ${roomId}`);
  //     } catch (error) {
  //       logger.error('Remove participant error:', error);
  //       throw error;
  //     }
  //   }
}
