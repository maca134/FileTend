import { File } from "lucide-react";

export const FileIcon = ({
	type,
}: {
	path: string;
	type: "file" | "directory";
}) => {
	const isDirectory = type === "directory";

	if (isDirectory) {
		return null;
	}

	return <File className="size-3.5 shrink-0 text-muted-foreground" />;
};
