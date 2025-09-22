import { spawn } from "child_process";
import fs from "fs";
import path from "path";

// Formatter un timestamp pour la France
function getTimestamp() {
  return new Date().toLocaleString("sv-SE", {
    timeZone: "Europe/Paris",
    hour12: false,
  }).replace(/[ :]/g, "-"); 
  // format: 2025-09-17-20-05-33
}

const logDir = path.resolve("logs");
fs.mkdirSync(logDir, { recursive: true });

const logFile = path.join(logDir, `dev-${getTimestamp()}.log`);
const out = fs.createWriteStream(logFile, { flags: "a" });

console.log(`📜 Logging started. Output is being written to ${logFile}`);

const proc = spawn("npm", ["run", "dev"], {
  stdio: ["ignore", "pipe", "pipe"],
  shell: true,
});

// Stream vers console + fichier
proc.stdout.pipe(process.stdout);
proc.stdout.pipe(out);

proc.stderr.pipe(process.stderr);
proc.stderr.pipe(out);

proc.on("close", (code) => {
  console.log(`\n❌ Process exited with code ${code}`);
  out.end();
});
