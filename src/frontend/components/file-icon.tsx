import { getSetiIcon } from "../lib/seti-icons";

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
			className="shrink-0 size-5"
			dangerouslySetInnerHTML={{ __html: markup }}
		/>
	);
};
