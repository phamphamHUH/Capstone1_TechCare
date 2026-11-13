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
  JWT_EXPIRES_IN: (process.env.JWT_EXPIRES_IN ||
    "1d") as SignOptions["expiresIn"],

  JWT_REFRESH_TOKEN: process.env.JWT_REFRESH_TOKEN || "",
  JWT_REFRESH_EXPIRES_IN: (process.env.JWT_REFRESH_EXPIRES_IN ||
    "7d") as SignOptions["expiresIn"],

  // Image uploads (Amazon S3). AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY
  // are read by the AWS SDK directly from the environment.
  AWS_REGION: process.env.AWS_REGION || "ap-southeast-2",
  AWS_S3_BUCKET: process.env.AWS_S3_BUCKET || "",

  // Replaced by S3 above.
  // CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME,
  // CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY,
  // CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET,
  DEV_DOCTOR_LOGIN: process.env.DEV_DOCTOR_LOGIN === "true",

  // Email (Brevo). Without BREVO_API_KEY, emails are printed to the console.
  BREVO_API_KEY: process.env.BREVO_API_KEY || "",
  EMAIL_FROM: process.env.EMAIL_FROM || "", // sender verified in Brevo
  EMAIL_FROM_NAME: process.env.EMAIL_FROM_NAME || "Reyna G Diagnostic Clinic",
  APP_URL: process.env.APP_URL || "http://localhost:5173", // frontend, used in email links

  IS_PRODUCTION: process.env.IS_PRODUCTION === "true",
  CORS_ORIGIN:
    process.env.CORS_ORIGIN ||
    "http://localhost:5173,https://techcare-1.onrender.com",
};
