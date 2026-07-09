import { env } from "./env";

export enum LogLevel {
	DEBUG = 0,
	INFO = 1,
	WARN = 2,
	ERROR = 3,
}

export const logLevelNames = ["DEBUG", "INFO", "WARN", "ERROR"];

const logLevelColors = {
	[LogLevel.DEBUG]: "\x1b[36m", // Cyan
	[LogLevel.INFO]: "\x1b[32m", // Green
	[LogLevel.WARN]: "\x1b[33m", // Yellow
	[LogLevel.ERROR]: "\x1b[31m", // Red
};

let currentLogLevel: LogLevel = LogLevel.DEBUG;

if (env.LOG_LEVEL) {
	const level = env.LOG_LEVEL.toUpperCase();
	const index = logLevelNames.indexOf(level);
	if (index !== -1) {
		currentLogLevel = index as LogLevel;
	}
}

const log = (level: LogLevel, ...args: unknown[]) => {
	if (level < currentLogLevel) return;
	const levelStr = LogLevel[level];
	const color = logLevelColors[level];
	const timestamp = new Date().toISOString();
	console.log(`[${timestamp}] ${color}[${levelStr}]\x1b[0m`, ...args);
};

export const debug = (...args: unknown[]) => log(LogLevel.DEBUG, ...args);

export const info = (...args: unknown[]) => log(LogLevel.INFO, ...args);

export const warn = (...args: unknown[]) => log(LogLevel.WARN, ...args);

export const error = (...args: unknown[]) => log(LogLevel.ERROR, ...args);

export default {
	debug,
	info,
	warn,
	error,
};
