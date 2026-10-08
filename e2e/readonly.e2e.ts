import { expect, test } from "@playwright/test";

test("disables write actions in read-only mode", async ({ page }) => {
	await page.goto("/");
	await expect(page.getByText("hello.txt")).toBeVisible();

	await expect(page.getByTitle("New File (disabled)")).toBeDisabled();
	await expect(page.getByTitle("New Folder (disabled)")).toBeDisabled();
	await expect(page.getByTitle("Upload (disabled)")).toBeDisabled();
});
