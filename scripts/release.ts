/**
 * Interactive release helper: prompts for a release type, bumps
 * package.json and creates the matching commit + git tag via
 * `bun pm version`, then optionally pushes both to origin.
 *
 * Run with: bun run release
 */
const RELEASE_TYPES = ["patch", "minor", "major", "prerelease"] as const;
type ReleaseType = (typeof RELEASE_TYPES)[number];

function run(cmd: string[]): number {
	const proc = Bun.spawnSync(cmd, {
		stdio: ["inherit", "inherit", "inherit"],
	});
	return proc.exitCode ?? 1;
}

const pkg = (await Bun.file("package.json").json()) as { version: string };
console.log(`Current version: ${pkg.version}`);

const typeAnswer = prompt(`Release type (${RELEASE_TYPES.join("/")})`, "patch");
if (typeAnswer === null) {
	console.log("Aborted.");
	process.exit(1);
}

const releaseType = typeAnswer.trim().toLowerCase();
if (!RELEASE_TYPES.includes(releaseType as ReleaseType)) {
	console.error(
		`Invalid release type: "${releaseType}". Expected one of: ${RELEASE_TYPES.join(", ")}`
	);
	process.exit(1);
}

const versionExitCode = run(["bun", "pm", "version", releaseType]);
if (versionExitCode !== 0) {
	console.error("bun pm version failed -- aborting release.");
	process.exit(versionExitCode);
}

const pushAnswer = prompt(
	"Push the new commit and tag to origin now? (y/N)",
	"N"
);
if (pushAnswer === null || !/^y(es)?$/i.test(pushAnswer.trim())) {
	console.log(
		"Skipped push. Run `git push --follow-tags` when you're ready."
	);
	process.exit(0);
}

process.exit(run(["git", "push", "--follow-tags"]));
