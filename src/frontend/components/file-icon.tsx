import {
	File,
	FileArchive,
	FileCode,
	FileCog,
	FileImage,
	FileJson,
	FileKey,
	FileLock,
	FileSpreadsheet,
	FileTerminal,
	FileText,
	Folder,
	FolderOpen,
	type LucideIcon,
} from "lucide-react";

const EXTENSION_ICON_MAP: Record<string, LucideIcon> = {
	json: FileJson,
	md: FileText,
	markdown: FileText,
	txt: FileText,
	log: FileText,
	ts: FileCode,
	tsx: FileCode,
	js: FileCode,
	jsx: FileCode,
	mjs: FileCode,
	cjs: FileCode,
	html: FileCode,
	htm: FileCode,
	css: FileCode,
	scss: FileCode,
	less: FileCode,
	xml: FileCode,
	yml: FileCode,
	yaml: FileCode,
	sql: FileCode,
	toml: FileCode,
	py: FileCode,
	go: FileCode,
	rs: FileCode,
	rb: FileCode,
	php: FileCode,
	java: FileCode,
	c: FileCode,
	cpp: FileCode,
	h: FileCode,
	sh: FileTerminal,
	bash: FileTerminal,
	zsh: FileTerminal,
	ini: FileCog,
	conf: FileCog,
	cfg: FileCog,
	env: FileCog,
	png: FileImage,
	jpg: FileImage,
	jpeg: FileImage,
	gif: FileImage,
	svg: FileImage,
	webp: FileImage,
	ico: FileImage,
	bmp: FileImage,
	zip: FileArchive,
	tar: FileArchive,
	gz: FileArchive,
	rar: FileArchive,
	"7z": FileArchive,
	pem: FileKey,
	key: FileKey,
	crt: FileKey,
	cer: FileKey,
	csv: FileSpreadsheet,
	xlsx: FileSpreadsheet,
	xls: FileSpreadsheet,
};

const NAME_ICON_MAP: Record<string, LucideIcon> = {
	dockerfile: FileCog,
	"docker-compose.yml": FileCog,
	"docker-compose.yaml": FileCog,
	makefile: FileCog,
	"package-lock.json": FileLock,
	"bun.lock": FileLock,
	"bun.lockb": FileLock,
	"yarn.lock": FileLock,
	"pnpm-lock.yaml": FileLock,
};

function getFileIconComponent(path: string): LucideIcon {
	const name = path.split(/[/\\]/).pop() ?? path;
	const lowerName = name.toLowerCase();

	if (lowerName in NAME_ICON_MAP) {
		return NAME_ICON_MAP[lowerName] ?? File;
	}

	const ext = lowerName.includes(".")
		? (lowerName.split(".").pop() ?? "")
		: "";

	return EXTENSION_ICON_MAP[ext] ?? File;
}

export const FileIcon = ({
	path,
	type,
	expanded,
}: {
	path: string;
	type: "file" | "directory";
	expanded?: boolean;
}) => {
	if (type === "directory") {
		const Icon = expanded ? FolderOpen : Folder;
		return <Icon className="size-3.5 shrink-0 text-muted-foreground" />;
	}

	/* eslint-disable react-hooks/static-components -- getFileIconComponent
	   only ever selects one of the stable, module-level icon components
	   from the maps above; it never creates a new one. */
	const Icon = getFileIconComponent(path);
	return <Icon className="size-3.5 shrink-0 text-muted-foreground" />;
	/* eslint-enable react-hooks/static-components */
};
