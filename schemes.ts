import { Router } from "express";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import path from "path";

const router = Router();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const schemesPath = process.env.SCHEMES_PATH || path.resolve(__dirname, "schemes.json");

router.get("/", (_req, res) => {
  try {
    const data = readFileSync(schemesPath, "utf-8");
    const schemes = JSON.parse(data);
    res.json(schemes);
  } catch {
    res.status(500).json({ error: "Failed to load schemes" });
  }
});

export default router;
