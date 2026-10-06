import { createFactory } from "hono/factory";

import { env } from "../lib/env";
import { isAuthed } from "../lib/session";

const handler = createFactory().createHandlers(async (c) => {
	return c.json({
		authEnabled: env.AUTH_ENABLED,
		authed: !env.AUTH_ENABLED || (await isAuthed(c)),
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
