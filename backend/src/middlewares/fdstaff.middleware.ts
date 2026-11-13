import { Request, Response, NextFunction } from "express";
import adminMiddleware from "./admin.middleware.js";

function fdstaffMiddleware(req: Request, res: Response, next: NextFunction) {
  try {
    
    if (!req.user) { // redundant but for safety fpurposes because TS doesnt alawayys know that this middlwware comes first
      return res.status(401).json({ message: "Unauthorized" });
    }
    if (req.user.role !== "frontdesk-staff") {
      return res.status(401).json({ message: "Invalid role" });
    }

    next();
  } catch {
    res.status(401).json("invalid role");
  }
}

export default fdstaffMiddleware
