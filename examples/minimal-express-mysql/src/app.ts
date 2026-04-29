import express from "express";
import { errorHandler } from "./errors.js";
import usersRouter from "./routes/users.js";

export function createApp() {
  const app = express();
  app.use(express.json());
  app.use("/users", usersRouter);
  app.use(errorHandler);
  return app;
}
