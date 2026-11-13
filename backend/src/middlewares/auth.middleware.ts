import { sql } from "../config/db.js";
import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";

async function authMiddleware(req: Request, res: Response, next: NextFunction) {
  try {
    let token;
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer")
    ) {
      token = req.headers.authorization.split(" ")[1];
    }
    if (!token) {
      return res.status(401).json({ message: "No token provided" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!);

    const result = await sql`
      SELECT * from users
      WHERE user_id = ${(decoded as any).user_id}
      `;

    const user = result[0];
    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }
    req.user = user;

    next();
  } catch (error) {
    // An expired or bad token is normal (the client refreshes or logs out),
    // so it is answered with 401 and not logged.
    if (
      error instanceof jwt.TokenExpiredError ||
      error instanceof jwt.JsonWebTokenError
    ) {
      return res.status(401).json({ message: "Invalid or expired token" });
    }

    console.error("AUTH MIDDLEWARE ERROR:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}
export default authMiddleware;
// export async function authorize(
//   req: Request,
//   res: Response,
//   next: NextFunction,
// ) {
//   try {
//     let token;

//     if (
//       req.headers.authorization &&
//       req.headers.authorization.startsWith("Bearer ")
//     ) {
//       token = req.headers.authorization.split(" ")[1];
//     }

//     if (!token) {
//       return res.status(401).json({ message: "No token provided" });
//     }

//     const decoded = jwt.verify(token, process.env.JWT_SECRET!);

//     const result = await sql`
//       SELECT * FROM users
//       WHERE id = ${(decoded as any).id}
//     `;

//     const user = result[0];

//     if (!user) {
//       return res.status(401).json({ message: "User not found" });
//     }

//     (req as any).user = user;

//     next();
//   } catch {
//     return res.status(401).json({ message: "Unauthorized" });
//   }
// }
//mongo db

// import { Request, Response, NextFunction } from "express";
// import jwt from "jsonwebtoken";
// async function authorize(req: Request, res: Response, next: NextFunction) {
//     try {
//         let token
//         if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
//             token = req.headers.authorization.split(" ")[1];
//         }
//         if (!token) {
//             return res.status(401).json({ message: "No token provided" });
//         }
//         const decoded = jwt.verify(token, process.env.JWT_SECRET!);
//         const user = await User.findById((decoded as { id: string }).id);
//         if (!user) {
//             return res.status(401).json({ message: "User not found" });
//         }
//         req.user = user;

//         next();
//     } catch (error) {
//         res.status(401).json({ message: "Unauthorized" });
//     }
// }
