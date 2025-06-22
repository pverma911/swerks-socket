import { createLogger, format, transports } from 'winston';
import path from 'path';

const { combine, timestamp, printf, colorize } = format;

function getCallerFile(): string {
    const stack = new Error().stack?.split('\n');
    if (!stack) return 'unknown';

    const callerLine = stack[3] || '';
    const match = callerLine.match(/\((.*):\d+:\d+\)/) || callerLine.match(/at (.*):\d+:\d+/);
    if (match && match[1]) {
        return path.basename(match[1]);
    }
    return 'unknown';
}

const logFormat = printf(({ level, message, timestamp }) => {
    const file = getCallerFile();
    return `${timestamp} [${level}] [${file}]: ${message}`;
});

const logger = createLogger({
    level: 'info',
    format: combine(
        timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        logFormat
    ),
    transports: [
        new transports.Console({
            format: combine(colorize(), logFormat)
        }),
        new transports.File({
            filename: path.join(__dirname, '../../logs/error.log'),
            level: 'error'
        }),
        new transports.File({
            filename: path.join(__dirname, '../../logs/combined.log')
        })
    ]
});

export default logger;
