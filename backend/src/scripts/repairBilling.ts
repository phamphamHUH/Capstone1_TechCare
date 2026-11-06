import { repairBillingSchema } from "../config/billingSchema.js";

try {
  await repairBillingSchema();
  console.log("Billing schema repaired. Existing tables, legacy fields and saved amounts were preserved.");
} catch (error) {
  console.error("Billing schema repair failed:", error);
  process.exitCode = 1;
}
