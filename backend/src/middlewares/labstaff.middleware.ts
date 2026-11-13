import { Request, Response, NextFunction } from "express";

function labstaffMiddleware(req: Request, res: Response, next: NextFunction) {
  try {
    
    if (!req.user) { // redundant but for safety fpurposes because TS doesnt alawayys know that this middlwware comes first
      return res.status(401).json({ message: "Unauthorized" });
    }
    if (req.user.role !== "laboratory-staff") {
      return res.status(401).json({ message: "Invalid role" });
    }

    next();
  } catch {
    res.status(401).json("invalid role");
  }
}

export default labstaffMiddleware
