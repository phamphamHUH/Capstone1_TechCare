// =========================
// RESEND MY VERIFICATION EMAIL
// POST /api/patient/verification-email  (patientMiddleware)
// =========================
export namespace resendMyVerification {
  export interface response {
    message: string;
  }

  export interface error {
    message: string;
  }
}
