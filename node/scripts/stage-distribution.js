import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dist = path.join(root, "dist");
const platform = process.argv[2] || "mac";

fs.cpSync(path.join(root, "site"), path.join(dist, "site"), { recursive: true });
fs.mkdirSync(path.join(dist, "config"), { recursive: true });
fs.copyFileSync(path.join(root, "config", "server.example.json"), path.join(dist, "config", "server.example.json"));
for (const directory of ["data", "backups", "logs"]) fs.mkdirSync(path.join(dist, directory), { recursive: true });

if (platform === "win") {
  for (const file of ["iniciar.bat", "instalar-inicializacao.bat", "remover-inicializacao.bat"]) fs.copyFileSync(path.join(root, file), path.join(dist, file));
} else {
  fs.copyFileSync(path.join(root, "iniciar.command"), path.join(dist, "iniciar.command"));
  fs.chmodSync(path.join(dist, "iniciar.command"), 0o755);
}

console.log(`Distribuição preparada em ${dist}`);
