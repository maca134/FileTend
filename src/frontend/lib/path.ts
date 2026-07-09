export function getAncestorPaths(path: string): string[] {
	const ancestors: string[] = [];
	for (let i = 0; i < path.length; i++) {
		if (path[i] === "/" || path[i] === "\\") {
			const prefix = path.slice(0, i);
			if (prefix) ancestors.push(prefix);
		}
	}
	return ancestors;
}
