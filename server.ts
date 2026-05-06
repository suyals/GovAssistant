import express from "express";
import path from "path";
import chatRouter from "./chat.js";
import schemesRouter from "./schemes.js";

const app = express();
const port = Number(process.env.PORT) || 3000;

app.use(express.json());
app.use(express.static(path.resolve(process.cwd())));
app.use("/api/chat", chatRouter);
app.use("/api/schemes", schemesRouter);

app.get("/", (_req, res) => {
  res.sendFile(path.resolve(process.cwd(), "index.html"));
});

app.listen(port, () => {
  console.log(`GovAssist AI server listening on http://localhost:${port}`);
});
