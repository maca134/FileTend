const EXTENSION_LANGUAGE_MAP: Record<string, string> = {
	json: "json",
	yml: "yaml",
	yaml: "yaml",
	md: "markdown",
	markdown: "markdown",
	ts: "typescript",
	tsx: "typescript",
	js: "javascript",
	jsx: "javascript",
	mjs: "javascript",
	cjs: "javascript",
	html: "html",
	htm: "html",
	css: "css",
	scss: "scss",
	less: "less",
	xml: "xml",
	sh: "shell",
	bash: "shell",
	py: "python",
	go: "go",
	rs: "rust",
	rb: "ruby",
	php: "php",
	sql: "sql",
	toml: "toml",
	ini: "ini",
	env: "ini",
	conf: "ini",
};

const NAME_LANGUAGE_MAP: Record<string, string> = {
	dockerfile: "dockerfile",
	"docker-compose.yml": "yaml",
	"docker-compose.yaml": "yaml",
	makefile: "makefile",
};

export function getLanguageForPath(path: string): string {
	const name = path.split(/[/\\]/).pop() ?? path;
	const lowerName = name.toLowerCase();

	if (lowerName in NAME_LANGUAGE_MAP) {
		return NAME_LANGUAGE_MAP[lowerName] ?? "plaintext";
	}

	const ext = lowerName.includes(".") ? (lowerName.split(".").pop() ?? "") : "";

	return EXTENSION_LANGUAGE_MAP[ext] ?? "plaintext";
}
