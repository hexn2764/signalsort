#!/usr/bin/env node
/**
 * One command for the demo: starts the app and all three agents, with prefixed,
 * colour-coded output so an audience can follow who did what.
 *
 *   npm run autopilot        # realistic pacing: a new issue every 1–5 minutes
 *   npm run autopilot:fast   # demo pacing: every 45–90 seconds
 */
import { spawn } from "node:child_process";

const COLORS = { server: 36, reporter: 35, triage: 33, solver: 32 };
const RESET = "[0m";

const procs = [
  ["server", ["tsx", "src/server.ts"]],
  ["reporter", ["tsx", "src/agents/reporter.ts"]],
  ["triage", ["tsx", "src/agents/triage.ts"]],
  ["solver", ["tsx", "src/agents/solver.ts"]],
];

const children = [];

for (const [name, [bin, ...args]] of procs) {
  const child = spawn("npx", [bin, ...args], {
    env: process.env,
    stdio: ["ignore", "pipe", "pipe"],
  });
  children.push(child);

  const tag = `[${COLORS[name]}m${name.padEnd(8)}${RESET} │`;
  const pipe = (stream) => {
    let buffer = "";
    stream.on("data", (chunk) => {
      buffer += chunk.toString();
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) if (line.trim()) console.log(`${tag} ${line}`);
    });
  };
  pipe(child.stdout);
  pipe(child.stderr);

  child.on("exit", (code) => console.log(`${tag} exited with code ${code}`));
}

const stop = () => {
  for (const c of children) c.kill("SIGTERM");
  process.exit(0);
};
process.on("SIGINT", stop);
process.on("SIGTERM", stop);

console.log("\nBacklog Autopilot running. App: http://localhost:3000 → Developer view tab.");
console.log("Ctrl-C stops every agent.\n");
