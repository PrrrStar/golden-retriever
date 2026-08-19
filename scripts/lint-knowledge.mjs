import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

const root = path.resolve("knowledge");
const required = [
  "id",
  "title",
  "domain",
  "topology",
  "tags",
  "status",
  "last_updated",
  "author",
  "schema_version",
  "summary",
  "describes",
];
const statuses = new Set([
  "stable",
  "in-progress",
  "draft",
  "resolved",
  "deprecated",
  "rejected",
  "confirmed",
  "hypothesis",
  "reverted",
]);
const folderTopology = new Map([
  ["event", "event"],
  ["playbook", "playbook"],
  ["project", "project"],
  ["standard", "standard"],
  ["entities", "entity"],
]);
const forbidden = new Set(["pepes", "topic", "related"]);

async function markdownFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map(async (entry) => {
      const target = path.join(directory, entry.name);
      if (entry.isDirectory()) return markdownFiles(target);
      return entry.isFile() && entry.name.endsWith(".md") ? [target] : [];
    }),
  );
  return nested.flat().sort();
}

function parseFrontmatter(content) {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/);
  if (!match) return null;

  const fields = new Map();
  for (const line of match[1].split(/\r?\n/)) {
    if (!line.trim() || line.trimStart().startsWith("#")) continue;
    const field = line.match(/^([a-z][a-z0-9_]*):\s*(.*)$/);
    if (field) fields.set(field[1], field[2].trim());
  }
  return { fields, body: content.slice(match[0].length) };
}

const files = await markdownFiles(root);
const errors = [];
const ids = new Map();

for (const file of files) {
  const relative = path.relative(process.cwd(), file);
  const content = await readFile(file, "utf8");
  const parsed = parseFrontmatter(content);

  if (!parsed) {
    errors.push(`${relative}: missing YAML frontmatter`);
    continue;
  }

  const { fields, body } = parsed;
  for (const key of required) {
    if (!fields.get(key)) errors.push(`${relative}: missing ${key}`);
  }
  for (const key of forbidden) {
    if (fields.has(key)) errors.push(`${relative}: forbidden generic field ${key}`);
  }

  const topology = fields.get("topology");
  const firstFolder = path.relative(root, file).split(path.sep)[0];
  const expectedTopology = folderTopology.get(firstFolder);
  if (!expectedTopology) errors.push(`${relative}: unknown topology folder ${firstFolder}`);
  if (expectedTopology && topology !== expectedTopology) {
    errors.push(`${relative}: topology ${topology} does not match folder ${firstFolder}`);
  }

  const status = fields.get("status");
  if (status && !statuses.has(status)) errors.push(`${relative}: invalid status ${status}`);
  const date = fields.get("last_updated");
  if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) errors.push(`${relative}: invalid last_updated ${date}`);
  if (fields.get("schema_version") !== "1") errors.push(`${relative}: schema_version must be 1`);
  if (!/^#\s+\S/m.test(body)) errors.push(`${relative}: missing level-one heading`);
  if (path.basename(file) === "_index.md") errors.push(`${relative}: manual index files are not used`);

  if (topology === "event") {
    for (const key of ["occurred_at", "actions"]) {
      if (!fields.get(key)) errors.push(`${relative}: event requires ${key}`);
    }
  }
  if (topology === "entity") {
    for (const key of ["entity_type", "entity_id", "live_state_query"]) {
      if (!fields.get(key)) errors.push(`${relative}: entity requires ${key}`);
    }
  }

  const id = fields.get("id");
  if (id) {
    const previous = ids.get(id);
    if (previous) errors.push(`${relative}: duplicate id ${id} also used by ${previous}`);
    else ids.set(id, relative);
  }
}

if (errors.length > 0) {
  console.error(`Knowledge lint failed with ${errors.length} error(s):`);
  for (const error of errors) console.error(`- ${error}`);
  process.exitCode = 1;
} else {
  console.log(`Knowledge lint passed: ${files.length} documents, ${ids.size} unique IDs.`);
}
