import { jest } from "@jest/globals";
import express from "express";
import request from "supertest";

const mockVerify = jest.fn();
const mockFindById = jest.fn();
const mockCheckAuth = jest.fn();

jest.unstable_mockModule("jsonwebtoken", () => ({
    default: {
        verify: mockVerify,
    },
}));

jest.unstable_mockModule("../../models/User.js", () => ({
    default: {
        findById: mockFindById,
    },
}));

jest.unstable_mockModule("../../controllers/userController.js", () => ({
    checkAuth: mockCheckAuth,
    getPublicKey: jest.fn(),
    login: jest.fn(),
    signup: jest.fn(),
    updateProfile: jest.fn(),
    updatePublicKey: jest.fn(),
}));

const { default: userRouter } = await import("../../routes/userRoutes.js");

describe("User authentication routes", () => {
    let app;

    beforeEach(() => {
        jest.clearAllMocks();

        process.env.JWT_SECRET = "test-secret";

        app = express();
        app.use(express.json());
        app.use("/api/auth", userRouter);

        mockCheckAuth.mockImplementation((req, res) => {
            res.status(200).json({
                success: true,
                user: req.user,
            });
        });
    });

    test("GET /api/auth/check rejects requests without a token", async () => {
        const response = await request(app)
            .get("/api/auth/check");

        expect(response.status).toBe(401);

        expect(response.body).toEqual({
            success: false,
            message: "Not authorized, no token provided",
        });

        expect(mockCheckAuth).not.toHaveBeenCalled();
    });

    test("GET /api/auth/check rejects invalid tokens", async () => {
        mockVerify.mockImplementation(() => {
            throw new Error("invalid token");
        });

        const response = await request(app)
            .get("/api/auth/check")
            .set("token", "invalid-token");

        expect(response.status).toBe(401);

        expect(response.body).toEqual({
            success: false,
            message: "Invalid or expired token",
        });

        expect(mockCheckAuth).not.toHaveBeenCalled();
    });

    test("GET /api/auth/check rejects authenticated requests for missing users", async () => {
        mockVerify.mockReturnValue({
            uid: "missing-user",
        });

        mockFindById.mockReturnValue({
            select: jest.fn().mockResolvedValue(null),
        });

        const response = await request(app)
            .get("/api/auth/check")
            .set("token", "valid-token");

        expect(response.status).toBe(404);

        expect(response.body).toEqual({
            success: false,
            message: "User not found",
        });

        expect(mockCheckAuth).not.toHaveBeenCalled();
    });

    test("GET /api/auth/check allows authenticated users", async () => {
        const user = {
            _id: "user-123",
            name: "Test User",
            email: "test@example.com",
        };

        mockVerify.mockReturnValue({
            uid: "user-123",
        });

        mockFindById.mockReturnValue({
            select: jest.fn().mockResolvedValue(user),
        });

        const response = await request(app)
            .get("/api/auth/check")
            .set("token", "valid-token");

        expect(response.status).toBe(200);

        expect(response.body).toEqual({
            success: true,
            user,
        });

        expect(mockCheckAuth).toHaveBeenCalledTimes(1);
    });
});