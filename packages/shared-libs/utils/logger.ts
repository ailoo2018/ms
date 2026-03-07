import DailyRotateFile from "winston-daily-rotate-file";
import {createLogger, format, transports} from "winston";

// Create a logger instance
const logger = createLogger({
    level: 'info', // Set the logging level (e.g., 'info', 'debug', 'error')
    // defaultMeta: { service: 'user-service' },
    format: format.combine(
        format.timestamp(), // Add timestamps to log entries
        format.simple() // Use the default log format
    ),
    transports: [
        new transports.Console(), // Log to the console
        new DailyRotateFile({
            filename: 'logs/errors-%DATE%.log',
            datePattern: 'YYYY-MM-DD',
            zippedArchive: true,
            maxSize: '20m',
            maxFiles: '7d',
            level: 'error',
        }),
        new DailyRotateFile({
            filename: 'logs/all-%DATE%.log',
            datePattern: 'YYYY-MM-DD',
            zippedArchive: true,
            maxSize: '20m',
            maxFiles: '7d',
        }),
    ]
});

export default logger;



