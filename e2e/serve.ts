import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const root = process.env.ROOT_DIR!;
rmSync(root, { recursive: true, force: true });
mkdirSync(root, { recursive: true });
writeFileSync(join(root, "hello.txt"), "hello world\n");

await import("../src/index");
