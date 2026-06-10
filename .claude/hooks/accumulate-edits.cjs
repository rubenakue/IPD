// PostToolUse(Edit|Write): acumula los archivos editados para verificarlos en lote al Stop.
const fs = require("fs");
const path = require("path");
let input = "";
process.stdin.on("data", (d) => (input += d));
process.stdin.on("end", () => {
  try {
    const file = JSON.parse(input).tool_input?.file_path;
    if (file) {
      const dir = path.join(process.env.CLAUDE_PROJECT_DIR || ".", ".claude", "tmp");
      fs.mkdirSync(dir, { recursive: true });
      fs.appendFileSync(path.join(dir, "edited-files.txt"), file + "\n");
    }
  } catch (_) {}
  process.exit(0);
});
