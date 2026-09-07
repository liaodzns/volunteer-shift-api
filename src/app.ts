import express from "express";
import volunteerRoutes from "./routes/volunteer.routes";
import { errorHandler } from "./middleware/errorHandler";
import { notFound } from "./middleware/notFound";

const app = express();

app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/api/volunteers", volunteerRoutes);

app.use(notFound);
app.use(errorHandler);
export default app;