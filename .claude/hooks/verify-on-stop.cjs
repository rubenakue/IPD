// Stop: formatea en lote lo editado y verifica tipos. exit 2 = Claude debe seguir arreglando.
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");
const root = process.env.CLAUDE_PROJECT_DIR || process.cwd();
const listFile = path.join(root, ".claude", "tmp", "edited-files.txt");

let input = "";
process.stdin.on("data", (d) => (input += d));
process.stdin.on("end", () => {
  // Anti-bucle: si ya venimos de un Stop bloqueado, no re-bloquear.
  try { if (JSON.parse(input).stop_hook_active) process.exit(0); } catch (_) {}

  let files = [];
  try {
    files = [...new Set(fs.readFileSync(listFile, "utf8").split("\n").filter(Boolean))];
    fs.unlinkSync(listFile);
  } catch (_) {}
  if (files.length === 0) process.exit(0); // turno sin ediciones: no verificar

  const ts = files.filter((f) => /\.(ts|tsx)$/.test(f) && fs.existsSync(f));
  if (ts.length === 0) process.exit(0); // solo docs/config: no verificar

  // 1) Formateo en lote (best-effort, nunca bloquea; si prettier no está instalado, no pasa nada)
  try {
    if (fs.existsSync(path.join(root, "node_modules", "prettier")))
      execSync(`npx --no-install prettier --write ${ts.map((f) => `"${f}"`).join(" ")}`,
        { cwd: root, stdio: "ignore", timeout: 90000 });
  } catch (_) {}

  // 2) Verificación de tipos (bloquea con exit 2). Si typescript no está instalado aún, no bloquear.
  const errors = [];
  if (fs.existsSync(path.join(root, "node_modules", "typescript"))) {
    try { execSync("npx --no-install tsc --noEmit", { cwd: root, stdio: "pipe", timeout: 240000 }); }
    catch (e) { errors.push("== tsc --noEmit ==\n" + ((e.stdout || "") + (e.stderr || "")).toString().slice(0, 3000)); }
  }

  if (errors.length) {
    console.error("VERIFICACIÓN FALLIDA. No has terminado: arregla esto ahora.\n\n" + errors.join("\n\n"));
    process.exit(2);
  }
  process.exit(0);
});
