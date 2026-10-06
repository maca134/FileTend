import { env } from "./env";

const LEVELS = ["DEBUG", "INFO", "WARN", "ERROR"] as const;
const COLORS = ["\x1b[36m", "\x1b[32m", "\x1b[33m", "\x1b[31m"];
const minLevel = LEVELS.indexOf(env.LOG_LEVEL);

const log = (level: number, ...args: unknown[]) => {
	if (level < minLevel) return;
	const timestamp = new Date().toISOString();
	console.log(
		`[${timestamp}] ${COLORS[level]}[${LEVELS[level]}]\x1b[0m`,
		...args
	);
};

export default {
	info: (...args: unknown[]) => log(1, ...args),
	error: (...args: unknown[]) => log(3, ...args),
};
