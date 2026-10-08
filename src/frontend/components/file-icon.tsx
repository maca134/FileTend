import { getSetiIcon } from "../lib/seti-icons";

export const FileIcon = ({ path }: { path: string }) => {
	const { viewBox, markup } = getSetiIcon(path);

	return (
		<svg
			viewBox={viewBox}
			className="shrink-0 size-5"
			dangerouslySetInnerHTML={{ __html: markup }}
		/>
	);
};
