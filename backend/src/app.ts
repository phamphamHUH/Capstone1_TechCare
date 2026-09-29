import express from "express";
import path from "path";
import multer from "multer";
import cors from "cors";
import { fileURLToPath } from "url";
import { ENV } from "./config/env.js";
import adminRoutes from "./routes/admin.route.js";
import authRoutes from "./routes/auth.route.js";
import testRoutes from "./routes/test.routes.js";
import fdstaffRoutes from "./routes/fdstaff.route.js";
import labstaffRoutes from "./routes/labstaff.route.js";
import doctorRoutes from "./routes/doctor.route.js";
import patientRoutes from "./routes/patient.route.js";

const upload = multer({
  dest: "uploads/",
});

// FIX __dirname for ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const cors_origins = ENV.CORS_ORIGIN.split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);
app.use(
  cors({
    // ← added
    origin: cors_origins,
    credentials: true,
  }),
);

app.use(express.json());

// API routes
app.use("/api/test", testRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/fdstaff", fdstaffRoutes);
app.use("/api/labstaff", labstaffRoutes);
app.use("/api/doctor", doctorRoutes);
app.use("/api/patient", patientRoutes);

// Serve frontend build
const frontendPath = path.resolve(__dirname, "../../frontend/dist");
app.use(express.static(frontendPath));

app.use((req, res) => {
  res.sendFile(path.join(frontendPath, "index.html"));
});

export default app;
