import { type Page, expect, test } from "@playwright/test";

// Tests share one server and fixture folder, so they run in order.
test.describe.configure({ mode: "serial" });

const tree = (page: Page) => page.locator("[data-panel]").first();
const treeItem = (page: Page, name: string) =>
	tree(page).getByRole("button", { name: new RegExp(`^${name}`) });

async function login(page: Page) {
	await page.goto("/");
	await page.getByPlaceholder("Password").fill("e2e-password");
	await page.getByRole("button", { name: "Log in" }).click();
	await expect(treeItem(page, "hello.txt")).toBeVisible();
}

async function typeInEditor(page: Page, text: string) {
	await page.locator(".monaco-editor .view-lines").click();
	await page.keyboard.press("ControlOrMeta+End");
	await page.keyboard.type(text);
}

test("rejects a wrong password, then logs in and out", async ({ page }) => {
	await page.goto("/");
	await page.getByPlaceholder("Password").fill("wrong");
	await page.getByRole("button", { name: "Log in" }).click();
	await expect(page.getByText("Invalid password")).toBeVisible();

	await login(page);
	await page.getByTitle("Log out").click();
	await expect(page.getByPlaceholder("Password")).toBeVisible();
});

test("edits and saves a file", async ({ page }) => {
	await login(page);
	await treeItem(page, "hello.txt").click();
	await typeInEditor(page, "EDITED");
	await page.keyboard.press("ControlOrMeta+s");
	await expect(page.getByText("Saved hello.txt")).toBeVisible();

	await page.reload();
	await treeItem(page, "hello.txt").click();
	await expect(page.locator(".monaco-editor .view-lines")).toContainText(
		"EDITED"
	);
});

test("asks before closing a tab with unsaved changes", async ({ page }) => {
	await login(page);
	await treeItem(page, "hello.txt").click();
	await typeInEditor(page, "UNSAVED");
	await page.getByRole("button", { name: "Close hello.txt" }).click();
	await page.getByRole("button", { name: "Close Without Saving" }).click();
	await expect(
		page.getByRole("button", { name: "Close hello.txt" })
	).toHaveCount(0);
});

test("uploads a file from the file picker", async ({ page }) => {
	await login(page);
	await page.locator("input[type=file]").setInputFiles({
		name: "uploaded.txt",
		mimeType: "text/plain",
		buffer: Buffer.from("uploaded"),
	});
	await expect(page.getByText("Uploaded uploaded.txt")).toBeVisible();
	await expect(treeItem(page, "uploaded.txt")).toBeVisible();
});

test("creates, renames and deletes a file", async ({ page }) => {
	await login(page);

	await page.getByTitle("New File").click();
	await page.keyboard.type("new.txt");
	await page.keyboard.press("Enter");
	await expect(treeItem(page, "new.txt")).toBeVisible();

	await treeItem(page, "new.txt").click({ button: "right" });
	await page.getByRole("menuitem", { name: "Rename..." }).click();
	await page.keyboard.type("renamed");
	await page.keyboard.press("Enter");
	await expect(treeItem(page, "renamed.txt")).toBeVisible();
	await expect(treeItem(page, "new.txt")).toHaveCount(0);

	await treeItem(page, "renamed.txt").click({ button: "right" });
	await page.getByRole("menuitem", { name: "Delete" }).click();
	await page.getByRole("button", { name: "Delete" }).click();
	await expect(treeItem(page, "renamed.txt")).toHaveCount(0);
});
