// The signed-in account (staff user or patient) as returned by /api/auth/me
// and kept in sessionStorage "user". Patients use image_url, staff profile_photo.
export type AccountUser = {
  user_id?: string;
  patient_id?: string;
  role?: string;
  first_name?: string;
  middle_name?: string | null;
  last_name?: string;
  suffix?: string | null;
  email?: string;
  profile_photo?: string | null;
  image_url?: string | null;
  theme?: string;
  [key: string]: unknown;
};
