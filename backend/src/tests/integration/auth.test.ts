import { describe, it, expect } from "vitest";
import request from "supertest";
import app from "../../app.js";
import { createTestUser } from "../helper/testUser.js";

// TEST CASES UNDER LOGIN
describe("POST /api/auth/login", () => {
  it("logs in successfully with correct username and password", async () => {
    const testUser = await createTestUser();

    const res = await request(app).post("/api/auth/login").send({
      username: testUser.username,
      password: testUser.plainPassword,
    });

    expect(res.status).toBe(200);
    expect(res.body.message).toBe("Login successful");
    expect(res.body.token).toBeDefined();
    expect(res.body.refreshToken).toBeDefined();
    expect(res.body.user.password_hash).toBeUndefined();
  });
});

// TEST CASES UNDER LOGOUT

// TEST CASES UNDER REFRESH
describe("POST /api/auth/refresh", () => {
  async function login() {
    const testUser = await createTestUser();
    const res = await request(app).post("/api/auth/login").send({
      username: testUser.username,
      password: testUser.plainPassword,
    });
    return res.body as { token: string; refreshToken: string };
  }

  it("returns a new access token and refresh token", async () => {
    const { refreshToken } = await login();

    const res = await request(app)
      .post("/api/auth/refresh")
      .send({ refreshToken });

    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
    expect(res.body.refreshToken).toBeDefined();
  });

  it("rejects a missing refresh token", async () => {
    const res = await request(app).post("/api/auth/refresh").send({});
    expect(res.status).toBe(400);
  });

  it("rejects an access token used as a refresh token", async () => {
    const { token } = await login();

    const res = await request(app)
      .post("/api/auth/refresh")
      .send({ refreshToken: token });

    expect(res.status).toBe(401);
  });

  it("rejects the refresh token after logout", async () => {
    const { token, refreshToken } = await login();

    await request(app)
      .patch("/api/auth/logout")
      .set("Authorization", `Bearer ${token}`);

    const res = await request(app)
      .post("/api/auth/refresh")
      .send({ refreshToken });

    expect(res.status).toBe(401);
  });
});
