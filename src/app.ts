import express from "express";
import volunteerRoutes from "./routes/volunteer.routes";
import { errorHandler } from "./middleware/errorHandler";
import { notFound } from "./middleware/notFound";
import shiftRoutes from "./routes/shift.routes";
import { shiftSignupRouter, signupRouter } from "./routes/signup.routes";


const app = express();

app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/api/volunteers", volunteerRoutes);
app.use("/api/shifts", shiftRoutes);
app.use("/api/shifts/:shiftId/signups", shiftSignupRouter);
app.use("/api/signups", signupRouter);


app.use(notFound);
app.use(errorHandler);
export default app;