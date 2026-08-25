import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { sampleInbox } from "./data.js";
import { triage } from "./scoring.js";

const here = dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT ?? 3000);

const server = createServer(async (req, res) => {
  try {
    if (req.url === "/api/triage") {
      const now = new Date();
      const body = JSON.stringify(triage(sampleInbox(now), now), null, 2);
      res.writeHead(200, { "content-type": "application/json" });
      res.end(body);
      return;
    }

    if (req.url === "/" || req.url === "/index.html") {
      const html = await readFile(join(here, "public", "index.html"), "utf8");
      res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
      res.end(html);
      return;
    }

    res.writeHead(404, { "content-type": "text/plain" });
    res.end("not found");
  } catch (error) {
    res.writeHead(500, { "content-type": "text/plain" });
    res.end(`server error: ${(error as Error).message}`);
  }
});

server.listen(PORT, () => {
  console.log(`SignalSort running on http://localhost:${PORT}`);
});
