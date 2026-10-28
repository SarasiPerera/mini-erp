// Deletes the local database so it is re-created with demo data on next start.
import fs from "node:fs";
import path from "node:path";

const dir = path.join(process.cwd(), "data");
for (const f of ["erp.db", "erp.db-wal", "erp.db-shm"]) {
  fs.rmSync(path.join(dir, f), { force: true });
}
console.log("Database removed. Demo data will be re-created on the next start.");
