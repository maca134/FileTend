import { getSignedCookie } from "hono/cookie";

import { env } from "../lib/env";
import { createHandler } from "../lib/handler";
import { SESSION_COOKIE_NAME } from "../lib/session";

const handler = createHandler(async (c) => {
	const authed = env.AUTH_ENABLED
		? (await getSignedCookie(c, env.SECRET_KEY, SESSION_COOKIE_NAME)) ===
			"authenticated"
		: true;

	return c.json({
		authEnabled: env.AUTH_ENABLED,
		authed,
		permissions: {
			readOnly: env.READ_ONLY,
			canCreate: !env.READ_ONLY && env.ALLOW_CREATE,
			canDelete: !env.READ_ONLY && env.ALLOW_DELETE,
			canRename: !env.READ_ONLY && env.ALLOW_RENAME,
			canUpload: !env.READ_ONLY && env.ALLOW_UPLOAD,
			canDownload: env.ALLOW_DOWNLOAD,
			canChmod: !env.READ_ONLY && env.ALLOW_CHMOD,
			canChown: !env.READ_ONLY && env.ALLOW_CHOWN,
		},
	});
});

export default handler;
