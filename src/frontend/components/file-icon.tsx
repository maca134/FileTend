import { getSetiIcon } from "../lib/seti-icons";
import { cn } from "../lib/utils";

export const FileIcon = ({
	path,
	type,
}: {
	path: string;
	type: "file" | "directory";
}) => {
	const { viewBox, markup } = getSetiIcon(path, type);

	return (
		<svg
			viewBox={viewBox}
			className={cn("shrink-0 size-5")}
			dangerouslySetInnerHTML={{ __html: markup }}
		/>
	);
};
