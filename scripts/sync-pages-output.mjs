import { cp, rm } from "node:fs/promises";
import { resolve } from "node:path";

const source = resolve("frontend/dist");
const target = resolve("dist");

await rm(target, { force: true, recursive: true });
await cp(source, target, { recursive: true });
