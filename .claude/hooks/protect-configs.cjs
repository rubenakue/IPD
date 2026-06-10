// PreToolUse(Edit|Write): editar configs de lint/format/types o la constitución SDD exige confirmación humana.
const PROTECTED = [
  /eslint\.config\.(js|mjs|cjs|ts)$/i, /\.eslintrc(\.\w+)?$/i,
  /prettier\.config\.\w+$/i, /\.prettierrc(\.\w+)?$/i,
  /tsconfig(\.\w+)?\.json$/i, /\.editorconfig$/i,
  /\.specify\/memory\/constitution\.md$/i
];
let input = "";
process.stdin.on("data", (d) => (input += d));
process.stdin.on("end", () => {
  try {
    const file = (JSON.parse(input).tool_input?.file_path || "").replace(/\\/g, "/");
    if (PROTECTED.some((r) => r.test(file))) {
      console.log(JSON.stringify({
        hookSpecificOutput: {
          hookEventName: "PreToolUse",
          permissionDecision: "ask",
          permissionDecisionReason:
            "Edición de configuración protegida (lint/format/types o constitución SDD). Confirma que es intencional: lo habitual es que haya que arreglar el código, no la config."
        }
      }));
    }
  } catch (_) {}
  process.exit(0);
});
