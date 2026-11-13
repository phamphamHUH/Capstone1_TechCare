// import jwt from "jsonwebtoken";
// import { NextFunction, Request, Response } from "express";

// export async function signIn(req: Request, res: Response) {

//   const user = req.body;
//   const accessToken = jwt.sign(user, process.env.JWT_SECRET!);
//   res.json(accessToken);
// }
// export const getUser = (req: Request, res: Response) => {
//     const users = [
//     {
//         "user": "jim",
//         "title": "i am jim"
//     },
//     {
//         "user": "tim",
//         "title": "i am tim"
//     }
// ]

//     res.json(users.filter((user) => user.user === req.user));
// }
import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { sql } from "../config/db.js";
import { uploadImage as uploadToS3 } from "../config/s3.js";

export async function signIn(req: Request, res: Response, next: NextFunction) {
  const user = req.body;
  const accessToken = jwt.sign(user.username, process.env.JWT_SECRET!);
  res.json(accessToken);
}

export async function getUser(
  req: Request,
  res: Response,
  next: NextFunction,
) {}

// export const getUser = (req: Request, res: Response) => {
//     const users = [
//     {
//         "username": "freo",
//         "title": "i am freo"
//     },
//     {
//         "username": "freo",
//         "title": "i am tim"
//     }
// ]

//     res.json(users.filter((user) => user.username === req.user?.username)); //“If req.user exists, get its username property. If it doesn’t exist, return undefined instead of crashing.”
// }

export async function getMyAccount(req: Request, res: Response) {
  try {
    const id = req.user.user_id;
    const response = await sql`
    SELECT created_at 
    FROM users
    WHERE user_id = ${id}
    `;
    const user_created = response[0];
    if (!user_created) {
      res.json({ message: "you dont have an account here" });
    }
    res.status(200).json({ user_created: user_created.created_at }); //this is an object
  } catch (error) {
    res.status(500).json({ error: "error im getiing your account" });
  }
}

export async function uploadImage(req: Request, res: Response) {
  try {
    if (!req.file) {
      return res.status(400).json({
        message: "No image uploaded",
      });
    }

    const url = await uploadToS3(req.file, "techcare");

    return res.status(200).json({ url });
  } catch (err) {
    return res.status(500).json(err);
  }
}
