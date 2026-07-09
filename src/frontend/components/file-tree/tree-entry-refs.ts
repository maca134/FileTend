const refs = new Map<string, HTMLElement>();

export function registerTreeEntryRef(path: string, el: HTMLElement | null) {
	if (el) {
		refs.set(path, el);
	} else {
		refs.delete(path);
	}
}

export function getTreeEntryRef(path: string) {
	return refs.get(path);
}
