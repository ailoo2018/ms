import { createLogger, format, transports } from "winston";
import DailyRotateFile from "winston-daily-rotate-file";

// Check if we are in production (Azure)
const isProduction = process.env.NODE_ENV === 'production';

const logger = createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: format.combine(
        format.timestamp(),
        format.errors({ stack: true }), // Automatically capture the stack trace
        isProduction ? format.json() : format.simple() // JSON for Azure, Simple for Local
    ),
    transports: [
        // 1. MAIN TRANSPORT: Everything goes to the console for Azure to capture
        new transports.Console({
            format: isProduction
                ? format.json()
                : format.combine(format.colorize(), format.simple())
        }),

        // 2. OPTIONAL: Local file logging (disabled in production to save resources)
        ...(!isProduction ? [
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
            })
        ] : [])
    ]
});

export default logger;