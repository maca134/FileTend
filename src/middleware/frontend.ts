import tailwind from "bun-plugin-tailwind";
import { type MiddlewareHandler } from "hono";

type BundlerConfig = {
	entrypoint: Bun.HTMLBundle;
	build?: Partial<Bun.BuildConfig>;
	index?: string;
};

type BuiltFile = {
	artifact: Bun.BuildArtifact;
	etag: string;
};

export async function frontend(
	config: BundlerConfig
): Promise<MiddlewareHandler> {
	const files = new Map<string, BuiltFile>();
	const indexPath = config.index || "index.html";

	const builder = async () => {
		const build = await Bun.build({
			...config.build,
			entrypoints: [config.entrypoint.index],
			outdir: undefined,
			plugins: [tailwind],
			naming: "[dir]/[name]-[hash].[ext]",
		});
		files.clear();
		for (const file of build.outputs) {
			const path = file.path.slice(2);
			const etag = `"${Bun.hash(await file.arrayBuffer()).toString(16)}"`;
			files.set(path, { artifact: file, etag });
		}
	};

	await builder();

	return async (c, next) => {
		if (c.req.method !== "GET") {
			return await next();
		}

		let path = c.req.path;
		if (path === "/") {
			path = indexPath;
		} else {
			path = path.slice(1);
		}

		const file = files.get(path);
		if (!file) {
			return await next();
		}

		if (c.req.header("If-None-Match") === file.etag) {
			return new Response(null, {
				status: 304,
				headers: { ETag: file.etag },
			});
		}

		return new Response(file.artifact.stream(), {
			headers: {
				"Content-Type": file.artifact.type,
				"Cache-Control":
					path === indexPath
						? "no-cache"
						: "public, max-age=31536000, immutable",
				ETag: file.etag,
			},
		});
	};
}
