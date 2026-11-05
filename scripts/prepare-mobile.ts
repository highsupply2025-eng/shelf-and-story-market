import { mkdir, copyFile } from "node:fs/promises";
// Native shells load the hosted site; this only creates the offline fallback page.
await mkdir("dist/mobile", { recursive: true });
await copyFile("mobile/index.html", "dist/mobile/index.html");
await copyFile("public/logo-icon.png", "dist/mobile/logo-icon.png");
