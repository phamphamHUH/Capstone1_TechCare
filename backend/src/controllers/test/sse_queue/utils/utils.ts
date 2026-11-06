import type { Response } from "express";
type User = {
  id: number;
  user_id: string;
  username: string;
  password_hash: string;
  first_name: string;
  middle_name: string | null;
  last_name: string;
  suffix: string | null;
  sex: string;
  email: string;
  contact_number: string;
  emergency_contact_name: string | null;
  emergency_contact: string | null;
  address: string;
  birthdate: string;
  role: string;
  department: string | null;
  employment_status: string | null;
  date_hired: string;
  shift_start: string;
  shift_end: string;
  last_login: Date | null;
  account_status: boolean;
  profile_photo: string | null;
  active: boolean;
  created_at: Date;
  updated_at: Date;
};
const clients = new Map<Response, User>();

export async function addClient(res: Response, user: User) {
  clients.set(res, user);
  res.on("close", () => {
    // Remove the disconnected client so we don't try to send data to it.
    clients.delete(res);
  });
}

export async function sendData(data: any[]) {
  for (const [client, user] of clients) {
    if (user.role === "admin"){
    client.write(`data: ${JSON.stringify(data)}`);
    }
  }
  //expected payload
  // data: [{"id":4,"message":"New message"}]
}
