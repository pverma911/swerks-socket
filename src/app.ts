import express, { Express } from 'express';
import http, { Server } from 'http';
import morgan from 'morgan';
import errorHandler from './middlewares/error.middleware';
import { connectToDb } from './config/db.config';
import logger from './utils/logger';
import { IRoutes } from './interfaces/route.interface';
import { routes } from './routes';
import { Server as SocketIOServer } from 'socket.io';
import { SocketService } from './services/sockets.service';
import cors from "cors"

export class App {
  private app: Express;
  private server: Server;
  private io: SocketIOServer;
  constructor() {
    this.app = express();
    this.server = http.createServer(this.app);
    this.io = new SocketIOServer(this.server, {
      cors: {
        origin: '*', // Update this for production
        methods: ['GET', 'POST'],
      },
    });
    this.setupMiddlewares();
    this.initializeRoutes(routes);
    this.initializeErrorHandler();
    this.initializeSockets();
  }

  initializeSockets() {
    new SocketService(this.io);
  }

  setupMiddlewares() {
    this.app.use(cors())
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));
    this.app.use(errorHandler);
    morgan.token('date', () => new Date().toISOString());

    const format = ':date :method :url :status - :response-time ms';

    // Use 'combined' or custom format for production
    this.app.use(
      morgan(format, {
        skip: (req, res) => process.env.NODE_ENV === 'test',
      })
    );
  }

  async startDb() {
    await connectToDb();
  }

  async start(port: number) {
    try {
      await this.startDb();
      this.server.listen(port, () => {
        logger.info(`Server running on port ${port}`);
      });
    } catch (error) {
      logger.error('Error while trying to start the server', JSON.stringify(error));
    }
  }

  private initializeRoutes(routes: IRoutes[]) {
    routes.forEach((route) => {
      this.app.use('/', route.router);
    });
  }

  private initializeErrorHandler() {
    this.app.use(errorHandler);
  }
}
