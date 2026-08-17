import express from "express";
import request from "supertest";

const { authLimiter } = await import("../../middleware/rateLimiter.js");

describe("authLimiter", () => {
    const app = express();

    app.post("/login", authLimiter, (req, res) => {
        res.status(200).json({ success: true });
    });

    test("allows requests within the rate limit", async () => {
        const response = await request(app)
            .post("/login");

        expect(response.status).toBe(200);
        expect(response.body).toEqual({ success: true });
    });

    test("blocks requests after the rate limit is exceeded", async () => {
        const responses = [];

        for (let i = 0; i < 10; i++) {
            responses.push(
                await request(app).post("/login")
            );
        }

        const blockedResponse = await request(app)
            .post("/login");

        expect(blockedResponse.status).toBe(429);
        expect(blockedResponse.body).toEqual({
            success: false,
            message: "Too many attempts. Please try again later.",
        });
    });
});