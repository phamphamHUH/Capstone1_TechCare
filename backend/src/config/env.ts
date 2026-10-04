import dotenv from "dotenv";
import type { SignOptions } from "jsonwebtoken";

dotenv.config({
  path: process.env.NODE_ENV === "test" ? ".env.test" : ".env",
});

export const ENV = {
  PORT: process.env.PORT || 5000,
  NODE_ENV: process.env.NODE_ENV || "development",

  DATABASE_URL: process.env.DATABASE_URL || "",

  JWT_SECRET: process.env.JWT_SECRET || "",
  JWT_EXPIRES_IN: (process.env.JWT_EXPIRES_IN || "1d") as SignOptions["expiresIn"],

  JWT_REFRESH_TOKEN: process.env.JWT_REFRESH_TOKEN || "",
  JWT_REFRESH_EXPIRES_IN:
    (process.env.JWT_REFRESH_EXPIRES_IN || "7d") as SignOptions["expiresIn"],

  CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME,
  CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY,
  CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET,

  CORS_ORIGIN:
    process.env.CORS_ORIGIN ||
    "http://localhost:5173,https://techcare-1.onrender.com",

    DEV_DOCTOR_LOGIN: process.env.DEV_DOCTOR_LOGIN === "true",


    IS_PRODUCTION: process.env.IS_PRODUCTION === "true",
};