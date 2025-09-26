import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { JwtPayload } from "jsonwebtoken";
import bodyParser from "body-parser";
dotenv.config();
const app = express();
const port = process.env.PORT || 3001;

import authRoutes from "./src/routes/auth/user";
import userRoutes from "./src/routes/user/user";
import demoRoutes from "./src/routes/demo/demo"
import companyRoutes from "./src/routes/company/company";
import fileRoutes from "./src/routes/file/file";
import supportRoutes from "./src/routes/support/support"
import stripeRoutes from "./src/routes/stripe/stripe"
import { webhookHandler } from "./src/controllers/stripe/stripe";

app.use(
  cors({
    credentials: true,
    origin: "*",
  })
);

app.use(
  "/api/v1/stripe/webhook",
  bodyParser.raw({ type: "application/json" }),
  webhookHandler
);

app.use(express.json());
app.set("trust proxy", true);

declare global {
  namespace Express {
    interface Request {
      decoded?: JwtPayload & { userId?: string | string; email?: string };
    }
  }
}

app.get("/", (req, res) => {
  res.send("Welcome to Bluto.ai");
});

// Test route to return all environment variables
app.get("/test-env", (req, res) => {
  res.json(process.env);
});

app.use("/api/v1/auth", authRoutes);

app.use("/api/v1/user", userRoutes);

app.use("/api/v1/demo", demoRoutes);

app.use("/api/v1/companies", companyRoutes);

app.use("/api/v1/files", fileRoutes);

app.use("/api/v1/support", supportRoutes);

app.use("/api/v1/stripe", stripeRoutes);

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
