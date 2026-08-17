import { jest } from "@jest/globals";

const mockVerify = jest.fn();
const mockFindById = jest.fn();

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

const { protectRoute } = await import("../../middleware/auth.js");

describe("protectRoute", () => {
    let req;
    let res;
    let next;

    beforeEach(() => {
        jest.clearAllMocks();

        req = {
            headers: {},
        };

        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis(),
        };

        next = jest.fn();

        process.env.JWT_SECRET = "test-secret";
    });

    test("rejects request when no token is provided", async () => {
        await protectRoute(req, res, next);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({
            success: false,
            message: "Not authorized, no token provided",
        });

        expect(next).not.toHaveBeenCalled();
        expect(mockVerify).not.toHaveBeenCalled();
    });

    test("rejects request when token is invalid", async () => {
        req.headers.token = "invalid-token";

        mockVerify.mockImplementation(() => {
            throw new Error("invalid token");
        });

        await protectRoute(req, res, next);

        expect(mockVerify).toHaveBeenCalledWith(
            "invalid-token",
            "test-secret"
        );

        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({
            success: false,
            message: "Invalid or expired token",
        });

        expect(next).not.toHaveBeenCalled();
    });

    test("rejects request when token is expired", async () => {
        req.headers.token = "expired-token";

        mockVerify.mockImplementation(() => {
            const error = new Error("jwt expired");
            error.name = "TokenExpiredError";
            throw error;
        });

        await protectRoute(req, res, next);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({
            success: false,
            message: "Invalid or expired token",
        });

        expect(next).not.toHaveBeenCalled();
    });

    test("returns 404 when authenticated user does not exist", async () => {
        req.headers.token = "valid-token";

        mockVerify.mockReturnValue({
            uid: "user-123",
        });

        mockFindById.mockReturnValue({
            select: jest.fn().mockResolvedValue(null),
        });

        await protectRoute(req, res, next);

        expect(mockVerify).toHaveBeenCalledWith(
            "valid-token",
            "test-secret"
        );

        expect(mockFindById).toHaveBeenCalledWith("user-123");

        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.json).toHaveBeenCalledWith({
            success: false,
            message: "User not found",
        });

        expect(next).not.toHaveBeenCalled();
    });

    test("allows request when token and user are valid", async () => {
        req.headers.token = "valid-token";

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

        await protectRoute(req, res, next);

        expect(mockVerify).toHaveBeenCalledWith(
            "valid-token",
            "test-secret"
        );

        expect(mockFindById).toHaveBeenCalledWith("user-123");

        expect(req.user).toEqual(user);
        expect(next).toHaveBeenCalledTimes(1);

        expect(res.status).not.toHaveBeenCalled();
        expect(res.json).not.toHaveBeenCalled();
    });
});