import { type StateCreator, create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import { basename } from "../lib/path";

export interface OpenTab {
	path: string;
	name: string;
	content?: string;
	// Last known content on disk (from load or save), used as the baseline
	// for isTabDirty. Distinct from `content`, which tracks the live
	// editor buffer so unsaved edits survive a page refresh.
	savedContent?: string;
}

export const isTabDirty = (t: OpenTab) =>
	t.content !== undefined && t.content !== t.savedContent;

const isUnder = (p: string, prefix: string) =>
	p === prefix || p.startsWith(prefix + "/") || p.startsWith(prefix + "\\");

export interface CreatingNode {
	parentPath: string | undefined;
	type: "file" | "directory";
}

interface EditorState {
	openTabs: OpenTab[];
	activeTabPath: string | null;
	expandedPaths: string[];
	creatingNode: CreatingNode | null;
	renamingPath: string | null;
	openFile: (tab: OpenTab) => void;
	closeTabs: (paths: string[]) => void;
	setActiveTab: (path: string) => void;
	toggleExpanded: (path: string) => void;
	expandMany: (paths: string[]) => void;
	collapseAll: () => void;
	startCreating: (
		parentPath: string | undefined,
		type: "file" | "directory"
	) => void;
	cancelCreating: () => void;
	startRenaming: (path: string) => void;
	cancelRenaming: () => void;
	renamePath: (oldPath: string, newPath: string) => void;
	closeTabsUnder: (prefix: string) => void;
	updateTabContent: (path: string, content: string) => void;
	markTabSaved: (path: string, content: string) => void;
}

// Open tabs can carry live file content (including for dirty, unsaved
// edits), which may contain secrets (.env, docker-compose.yml, etc.).
// BUN_PUBLIC_TAB_PERSISTENCE controls where/whether that's written to
// browser storage: "local" (survives browser restarts), "session"
// (cleared when the tab/browser closes -- the default), or "none" (never
// written to storage at all; unsaved edits are lost on refresh).
type TabPersistenceMode = "local" | "session" | "none";

function getTabPersistenceMode(): TabPersistenceMode {
	// Bun inlines `process.env.BUN_PUBLIC_*` at build time only when the
	// var is actually set; when it's unset, the raw `process.env.X`
	// expression is left in the bundle as-is, and since there's no
	// `process` polyfill in the browser, evaluating it throws. try/catch
	// is the only guard that's safe regardless of whether inlining ran.
	let value: string | undefined;
	try {
		value = process.env.BUN_PUBLIC_TAB_PERSISTENCE;
	} catch {
		value = undefined;
	}

	if (value === "local" || value === "session" || value === "none") {
		return value;
	}
	return "session";
}

const tabPersistenceMode = getTabPersistenceMode();

const createEditorStore: StateCreator<EditorState> = (set, get) => ({
	openTabs: [],
	activeTabPath: null,
	expandedPaths: [],
	creatingNode: null,
	renamingPath: null,

	openFile: (tab) => {
		const { openTabs } = get();
		set({
			openTabs: openTabs.some((t) => t.path === tab.path)
				? openTabs
				: [...openTabs, tab],
			activeTabPath: tab.path,
		});
	},

	// If the active tab is closed, activate the nearest remaining tab to its
	// left (or the first remaining tab if none is left of it).
	closeTabs: (paths) => {
		const { openTabs, activeTabPath } = get();
		const nextTabs = openTabs.filter((t) => !paths.includes(t.path));
		if (nextTabs.length === openTabs.length) return;

		let nextActive = activeTabPath;
		if (activeTabPath && paths.includes(activeTabPath)) {
			const index = openTabs.findIndex((t) => t.path === activeTabPath);
			const left = openTabs
				.slice(0, index)
				.findLast((t) => !paths.includes(t.path));
			nextActive = (left ?? nextTabs[0])?.path ?? null;
		}

		set({ openTabs: nextTabs, activeTabPath: nextActive });
	},

	setActiveTab: (path) => set({ activeTabPath: path }),

	toggleExpanded: (path) => {
		const { expandedPaths } = get();
		set({
			expandedPaths: expandedPaths.includes(path)
				? expandedPaths.filter((p) => p !== path)
				: [...expandedPaths, path],
		});
	},

	expandMany: (paths) => {
		const current = get().expandedPaths;
		const additions = paths.filter((p) => !current.includes(p));
		if (additions.length === 0) return;
		set({ expandedPaths: [...current, ...additions] });
	},

	collapseAll: () => set({ expandedPaths: [] }),

	startCreating: (parentPath, type) => {
		if (parentPath !== undefined) get().expandMany([parentPath]);
		set({ creatingNode: { parentPath, type }, renamingPath: null });
	},

	cancelCreating: () => set({ creatingNode: null }),

	startRenaming: (path) => set({ renamingPath: path, creatingNode: null }),

	cancelRenaming: () => set({ renamingPath: null }),

	renamePath: (oldPath, newPath) => {
		const remap = (p: string) =>
			isUnder(p, oldPath) ? newPath + p.slice(oldPath.length) : p;

		const { openTabs, activeTabPath, expandedPaths } = get();

		set({
			openTabs: openTabs.map((t) => {
				const remapped = remap(t.path);
				if (remapped === t.path) return t;
				return { ...t, path: remapped, name: basename(remapped) };
			}),
			activeTabPath: activeTabPath ? remap(activeTabPath) : activeTabPath,
			expandedPaths: expandedPaths.map(remap),
		});
	},

	closeTabsUnder: (prefix) => {
		get().closeTabs(
			get()
				.openTabs.map((t) => t.path)
				.filter((p) => isUnder(p, prefix))
		);
	},

	updateTabContent: (path, content) => {
		set({
			openTabs: get().openTabs.map((t) =>
				t.path === path && t.content !== content ? { ...t, content } : t
			),
		});
	},

	markTabSaved: (path, content) => {
		set({
			openTabs: get().openTabs.map((t) =>
				t.path === path ? { ...t, content, savedContent: content } : t
			),
		});
	},
});

const persistOptions = {
	name: "editor-store",
	storage: createJSONStorage(() =>
		tabPersistenceMode === "local" ? localStorage : sessionStorage
	),
	// Clean tabs are persisted lightweight (content is refetched on open);
	// dirty tabs keep their live content + baseline so unsaved edits
	// survive a page refresh (unless persistence is disabled entirely).
	partialize: (state: EditorState) => ({
		...state,
		openTabs: state.openTabs.map((t) =>
			isTabDirty(t)
				? {
						path: t.path,
						name: t.name,
						content: t.content,
						savedContent: t.savedContent,
					}
				: { path: t.path, name: t.name }
		),
	}),
};

export const useEditorStore =
	tabPersistenceMode === "none"
		? create<EditorState>()(createEditorStore)
		: create<EditorState>()(persist(createEditorStore, persistOptions));
