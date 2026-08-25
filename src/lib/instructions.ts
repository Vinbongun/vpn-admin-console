import fs from "node:fs";
import path from "node:path";

const INSTRUCTIONS_DIR = path.join(process.cwd(), "content", "instructions");
const SLUG_PATTERN = /^[a-z0-9-]+$/i;

export type InstructionSummary = { slug: string; title: string };
export type Instruction = { slug: string; title: string; content: string };

function extractTitle(markdown: string, fallback: string): string {
  const match = markdown.match(/^#\s+(.+)$/m);
  return match ? match[1].trim() : fallback;
}

export function listInstructions(): InstructionSummary[] {
  const files = fs.existsSync(INSTRUCTIONS_DIR) ? fs.readdirSync(INSTRUCTIONS_DIR).filter((file) => file.endsWith(".md")) : [];
  return files
    .map((file) => {
      const slug = file.replace(/\.md$/, "");
      const content = fs.readFileSync(path.join(INSTRUCTIONS_DIR, file), "utf-8");
      return { slug, title: extractTitle(content, slug) };
    })
    .sort((a, b) => a.title.localeCompare(b.title, "ru"));
}

export function readInstruction(slug: string): Instruction | null {
  if (!SLUG_PATTERN.test(slug)) return null;
  const filePath = path.join(INSTRUCTIONS_DIR, `${slug}.md`);
  if (!fs.existsSync(filePath)) return null;
  const content = fs.readFileSync(filePath, "utf-8");
  return { slug, title: extractTitle(content, slug), content };
}
