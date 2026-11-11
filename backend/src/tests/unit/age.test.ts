import { describe, it, expect } from "vitest";
import { calculateAge } from "../../controllers/fdstaff/utils/calculateAge.js";

describe("calculateAge", () => {
  it("accepts birthday and calculates age", () => {
    const birthday = "2020-10-10";
    const result = calculateAge(birthday);

    expect(result).toBe(5);
    expect(typeof result).toBe("number");
    expect(result).toBeGreaterThanOrEqual(0);
  });

  it("accept empty string and fails to calculate age", () => {
    const birthday = "";
    const result = calculateAge(birthday);

    expect(result).toBeNaN();
  });

  it("accept invalid birthdate and return invalid message", () => {
    const birthday = "3030-10-19";
    const result = calculateAge(birthday);

    expect(result).toBe("Invalid Age");
  });
});
