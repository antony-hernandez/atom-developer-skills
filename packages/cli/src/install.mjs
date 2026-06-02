#!/usr/bin/env node
/**
 * Atomic installer — copia skills, CLAUDE.md y configura MCPs
 * Uso: npx @atomchat/atomic
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync, copyFileSync } from "fs";
import { resolve, dirname, join } from "path";
import { fileURLToPath } from "url";

const __dir = dirname(fileURLToPath(import.meta.url));
const ROOT = process.cwd();
const TEMPLATES = resolve(__dir, "../templates");

const green = (s) => `\x1b[32m${s}\x1b[0m`;
const yellow = (s) => `\x1b[33m${s}\x1b[0m`;
const bold = (s) => `\x1b[1m${s}\x1b[0m`;

console.log(bold("\n⚡ Atomic — Asistente de desarrollo de Atom\n"));

// 1. Crear directorios necesarios
const dirs = [
  ".claude/skills/task",
];
for (const dir of dirs) {
  mkdirSync(join(ROOT, dir), { recursive: true });
}

// 2. Copiar skills
const skills = [
  ["skills/task/SKILL.md", ".claude/skills/task/SKILL.md"],
];
for (const [src, dest] of skills) {
  copyFileSync(join(TEMPLATES, src), join(ROOT, dest));
  console.log(green(`  ✓ skill /task`), `→ ${dest}`);
}

// 3. Crear o actualizar CLAUDE.md
const claudeMdPath = join(ROOT, "CLAUDE.md");
const claudeMdTemplate = readFileSync(join(TEMPLATES, "CLAUDE.md"), "utf8");
if (!existsSync(claudeMdPath)) {
  writeFileSync(claudeMdPath, claudeMdTemplate);
  console.log(green("  ✓ CLAUDE.md creado"));
} else {
  console.log(yellow("  ~ CLAUDE.md ya existe — no sobreescrito"));
  console.log(`    Revisa ${join(TEMPLATES, "CLAUDE.md")} para ver qué agregar.`);
}

// 4. Configurar MCPs en .claude/settings.json
const settingsPath = join(ROOT, ".claude/settings.json");
let settings = {};
if (existsSync(settingsPath)) {
  try {
    settings = JSON.parse(readFileSync(settingsPath, "utf8"));
  } catch {
    // si está malformado, empezar limpio
  }
}

settings.mcpServers = settings.mcpServers ?? {};

// CodeGraph — navegación del codebase sin leer archivos
if (!settings.mcpServers.codegraph) {
  settings.mcpServers.codegraph = {
    command: "npx",
    args: ["-y", "@colbymchenry/codegraph@latest", "serve"],
    env: {}
  };
  console.log(green("  ✓ MCP CodeGraph configurado"));
} else {
  console.log(yellow("  ~ MCP CodeGraph ya configurado"));
}

// Atlassian (Jira + Confluence) — si no está configurado, avisar
if (!settings.mcpServers["plugin:atlassian:atlassian"]) {
  console.log(yellow("  ! MCP Atlassian no detectado"));
  console.log("    Instálalo desde: claude.ai/settings → Integrations → Atlassian");
}

// Figma — si no está configurado, avisar
if (!settings.mcpServers["plugin:figma:figma"]) {
  console.log(yellow("  ! MCP Figma no detectado"));
  console.log("    Instálalo desde: claude.ai/settings → Integrations → Figma");
}

writeFileSync(settingsPath, JSON.stringify(settings, null, 2));

console.log(bold("\n¡Listo! Atomic instalado.\n"));
console.log("  Uso:");
console.log("    /task CV-123    ← carga el brief completo de una tarea\n");
console.log("  MCPs requeridos:");
console.log("    ✓ CodeGraph (configurado)");
console.log("    → Atlassian: claude.ai/settings → Integrations");
console.log("    → Figma:     claude.ai/settings → Integrations\n");
