// PreToolUse(Bash git*): prohíbe saltarse los hooks de git.
let input = "";
process.stdin.on("data", (d) => (input += d));
process.stdin.on("end", () => {
  try {
    const cmd = JSON.parse(input).tool_input?.command || "";
    if (/git\s+(commit|push)\b[^&|;]*--no-verify/.test(cmd) || /git\s+commit\b[^&|;]*\s-n\b/.test(cmd)) {
      console.error("Prohibido --no-verify. Arregla lo que bloquea el hook en lugar de saltártelo.");
      process.exit(2);
    }
  } catch (_) {}
  process.exit(0);
});
