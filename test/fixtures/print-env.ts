import { env } from "../../src/lib/env";

console.log(JSON.stringify({ authEnabled: env.AUTH_ENABLED }));
