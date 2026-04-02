import { promises as fs } from "node:fs";
import path from "node:path";

const LOGO_CANDIDATE_PATHS = [
  path.join(process.cwd(), "public", "gttc-logo.png"),
  path.resolve(process.cwd(), "..", "image-removebg-preview(3).png"),
  path.resolve(process.cwd(), "image-removebg-preview(3).png"),
];

export const runtime = "nodejs";

async function readLogoFile() {
  for (const candidate of LOGO_CANDIDATE_PATHS) {
    try {
      const file = await fs.readFile(candidate);
      return file;
    } catch {
      // Try next candidate path.
    }
  }
  return null;
}

export async function GET() {
  const file = await readLogoFile();

  if (!file) {
    return new Response("Logo file not found", { status: 404 });
  }

  return new Response(file, {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
