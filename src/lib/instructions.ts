import fs from "node:fs";
import path from "node:path";

const INSTRUCTIONS_DIR = path.join(process.cwd(), "content", "instructions");

export type InstructionSummary = { slug: string; title: string };
export type Instruction = { slug: string; title: string; content: string };

function extractTitle(markdown: string, fallback: string): string {
  const match = markdown.match(/^#\s+(.+)$/m);
  return match ? match[1].trim() : fallback;
}

function listMarkdownFiles(): string[] {
  return fs.existsSync(INSTRUCTIONS_DIR) ? fs.readdirSync(INSTRUCTIONS_DIR).filter((file) => file.endsWith(".md")) : [];
}

export function listInstructions(): InstructionSummary[] {
  return listMarkdownFiles()
    .map((file) => {
      const slug = file.replace(/\.md$/, "");
      const content = fs.readFileSync(path.join(INSTRUCTIONS_DIR, file), "utf-8");
      return { slug, title: extractTitle(content, slug) };
    })
    .sort((a, b) => a.title.localeCompare(b.title, "ru"));
}

export function readInstruction(slug: string): Instruction | null {
  // Match against the real directory listing (not a hand-rolled character-class regex) so any
  // filename fs.readdirSync actually returns works, and the route param never gets concatenated
  // into a path - the resolved path always comes from a name the filesystem itself reported.
  const file = listMarkdownFiles().find((candidate) => candidate.replace(/\.md$/, "") === slug);
  if (!file) return null;
  const content = fs.readFileSync(path.join(INSTRUCTIONS_DIR, file), "utf-8");
  return { slug, title: extractTitle(content, slug), content };
}
