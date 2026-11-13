import { randomUUID } from "node:crypto";
import { readFile, unlink } from "node:fs/promises";
import path from "node:path";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { ENV } from "./env.js";

// Image uploads go to Amazon S3 (this replaced Cloudinary).
// Like Cloudinary, each file gets a public link that is saved in the database
// and used directly in <img src>. The bucket allows reading a file by its
// link only; listing or uploading needs the app's AWS access key.
// AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY are read by the AWS SDK itself.
const s3 = new S3Client({ region: ENV.AWS_REGION });

export type UploadFolder =
  | "techcare/user_photos"
  | "techcare/patient_photos"
  | "techcare/patients"
  | "techcare";

// Upload a multer file (saved on disk) to S3 and return its public URL.
export async function uploadImage(
  file: Express.Multer.File,
  folder: UploadFolder,
): Promise<string> {
  if (!ENV.AWS_S3_BUCKET) {
    throw new Error("AWS_S3_BUCKET is not set; cannot upload images.");
  }

  const extension = path.extname(file.originalname).toLowerCase();
  const key = `${folder}/${randomUUID()}${extension}`;

  try {
    await s3.send(
      new PutObjectCommand({
        Bucket: ENV.AWS_S3_BUCKET,
        Key: key,
        Body: await readFile(file.path),
        ContentType: file.mimetype,
      }),
    );
  } finally {
    // multer wrote a temporary copy to disk; it is no longer needed.
    await unlink(file.path).catch(() => {});
  }

  return `https://${ENV.AWS_S3_BUCKET}.s3.${ENV.AWS_REGION}.amazonaws.com/${key}`;
}
