import { sql } from "../../config/db.js";
import bcrypt from "bcryptjs";
import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import { ENV } from "../../config/env.js";

export async function login(req: Request, res: Response) {
  try {
    const { username, password } = req.body;

    // =========================
    // REQUIRED CREDENTIALS
    // =========================
    if (!username || !password) {
      return res
        .status(400)
        .json({ message: "Username and password are required" });
    }

    // =========================
    // FIND USER
    // =========================
    const validUser = await sql`
      SELECT *
      FROM users
      WHERE username = ${username} OR email = ${username}
    `;

    const user = validUser[0];

    if (!user) {
      return res.status(200).json({
        message: "Invalid username or email",
      });
    }

    // =========================
    // VERIFY PASSWORD
    // =========================
    const isMatch = await bcrypt.compare(
      password,
      user.password_hash
    );

    if (!isMatch) {
      return res.status(200).json({
        message: "Invalid password",
      });
    }

    if (user.account_status === false) {
      return res.status(403).json({
       message:"Your account has been deactivated. Please contact the administrator.",
     });
    }

    const response = await sql`
            UPDATE users
            SET active = TRUE
            WHERE user_id = ${user.user_id}
        `;

    // =========================
    // GENERATE ACCESS TOKEN
    // =========================
    // Creates a short-lived JWT containing the authenticated user's ID.
    // The token is used to authenticate requests to protected endpoints.
    const token = jwt.sign(
      {
        user_id: user.user_id,
      },
      ENV.JWT_SECRET,
      {
        expiresIn: ENV.JWT_EXPIRES_IN,
      }
    );

    // =========================
    // GENERATE REFRESH TOKEN
    // =========================
    // Creates a longer-lived JWT containing the authenticated user's ID.
    // The refresh token can be used to obtain a new access token
    // after the access token expires.
    const refreshToken = jwt.sign(
      {
        user_id: user.user_id,
      },
      ENV.JWT_REFRESH_TOKEN,
      {
        expiresIn: ENV.JWT_REFRESH_EXPIRES_IN,
      }
    );

    // =========================
    // REMOVE SENSITIVE DATA
    // =========================
    // Prevents the password hash from being sent to the client.
    const { password_hash, ...safeUser } = user;
    
    // "user": {
    //     "user_id": 123,
    //     "username": "jiano",
    //     "first_name": "Jiano",
    //     "middle_name": "Freo",
    //     "last_name": "Magtangob",
    //     "suffix": null,
    //     "sex": "Male",
    //     "email": "jiano@example.com",
    //     "contact_number": "09123456789",
    //     "emergency_contact_name": "Juan Magtangob",
    //     "emergency_contact": "09987654321",
    //     "address": "Manila, Philippines",
    //     "birthdate": "2002-05-15",
    //     "role": "admin",
    //     "department": "IT",
    //     "employment_status": "Full-time",
    //     "date_hired": "2026-08-21",
    //     "shift_start": "08:00:00",
    //     "shift_end": "17:00:00",
    //     "profile_photo": null
    //   }

    // =========================
    // RESPONSE
    // =========================
    return res.status(200).json({
      message: "Login successful",
      user: safeUser,
      token,
      refreshToken,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      error: "Internal Server Error",
    });
  }
}