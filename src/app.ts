import express from "express";
import volunteerRoutes from "./routes/volunteer.routes";

const app = express();

app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/api/volunteers", volunteerRoutes);

export default app;