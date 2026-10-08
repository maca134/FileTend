import { beforeEach, describe, expect, test } from "bun:test";

import { useEditorStore } from "../../src/frontend/store/editor-store";

const store = () => useEditorStore.getState();
const paths = () => store().openTabs.map((t) => t.path);

beforeEach(() => {
	useEditorStore.setState({ openTabs: [], activeTabPath: null });
	for (const path of ["/a", "/b", "/c", "/d"]) {
		store().openFile({ path, name: path });
	}
});

describe("closeTabs", () => {
	test("closing the active tab activates its left neighbour", () => {
		store().setActiveTab("/c");
		store().closeTabs(["/c"]);
		expect(paths()).toEqual(["/a", "/b", "/d"]);
		expect(store().activeTabPath).toBe("/b");
	});

	test("closing the first active tab activates the next one", () => {
		store().setActiveTab("/a");
		store().closeTabs(["/a"]);
		expect(store().activeTabPath).toBe("/b");
	});

	test("close others / to the right fall back to the kept tab", () => {
		store().setActiveTab("/d");
		store().closeTabs(["/c", "/d"]);
		expect(store().activeTabPath).toBe("/b");

		store().closeTabs(["/a"]);
		expect(store().activeTabPath).toBe("/b");
	});

	test("closing an inactive tab keeps the active one", () => {
		store().setActiveTab("/b");
		store().closeTabs(["/d"]);
		expect(store().activeTabPath).toBe("/b");
	});

	test("closing all clears the active tab", () => {
		store().closeTabs(paths());
		expect(paths()).toEqual([]);
		expect(store().activeTabPath).toBeNull();
	});

	test("closeTabsUnder closes a folder's descendants only", () => {
		useEditorStore.setState({ openTabs: [], activeTabPath: null });
		for (const path of ["/dir/x", "/dir2/y", "/dir/sub/z"]) {
			store().openFile({ path, name: path });
		}
		store().closeTabsUnder("/dir");
		expect(paths()).toEqual(["/dir2/y"]);
		expect(store().activeTabPath).toBe("/dir2/y");
	});
});
