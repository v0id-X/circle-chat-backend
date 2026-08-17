import { jest } from "@jest/globals";

const mockFindOne = jest.fn();
const mockCreate = jest.fn();
const mockFindById = jest.fn();
const mockFindByIdAndUpdate = jest.fn();

const mockGenSalt = jest.fn();
const mockHash = jest.fn();
const mockCompare = jest.fn();

const mockGenerateToken = jest.fn();

const mockCloudinaryUpload = jest.fn();

jest.unstable_mockModule("../../models/User.js", () => ({
    default: {
        findOne: mockFindOne,
        create: mockCreate,
        findById: mockFindById,
        findByIdAndUpdate: mockFindByIdAndUpdate,
    },
}));

jest.unstable_mockModule("bcryptjs", () => ({
    default: {
        genSalt: mockGenSalt,
        hash: mockHash,
        compare: mockCompare,
    },
}));

jest.unstable_mockModule("../../lib/utils.js", () => ({
    genrateToken: mockGenerateToken,
}));

jest.unstable_mockModule("../../lib/cloudinary.js", () => ({
    default: {
        uploader: {
            upload: mockCloudinaryUpload,
        },
    },
}));

const {
    signup,
    login,
    checkAuth,
    updatePublicKey,
    getPublicKey,
    updateProfile,
} = await import("../../controllers/userController.js");

describe("User Controller", () => {
    let req;
    let res;

    beforeEach(() => {
        jest.clearAllMocks();

        req = {
            body: {},
            params: {},
            user: {
                _id: "user-123",
            },
        };

        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis(),
        };

        mockGenSalt.mockResolvedValue("salt-10");
        mockHash.mockResolvedValue("hashed-password");
        mockGenerateToken.mockReturnValue("jwt-token");
    });

    describe("signup", () => {
        test("creates a new user with a hashed password", async () => {
            req.body = {
                fullName: "Test User",
                email: "test@example.com",
                password: "password123",
                bio: "Test bio",
                publicKey: "public-key",
                encryptedPrivateKey: "encrypted-private-key",
                salt: "encryption-salt",
                nonce: "encryption-nonce",
            };

            mockFindOne.mockResolvedValue(null);

            const newUser = {
                _id: "user-123",
                fullName: "Test User",
                email: "test@example.com",
                password: "hashed-password",
                bio: "Test bio",
                publicKey: "public-key",
                encryptedPrivateKey: "encrypted-private-key",
                salt: "encryption-salt",
                nonce: "encryption-nonce",
                toObject: () => ({
                    _id: "user-123",
                    fullName: "Test User",
                    email: "test@example.com",
                    password: "hashed-password",
                    bio: "Test bio",
                    publicKey: "public-key",
                    encryptedPrivateKey: "encrypted-private-key",
                    salt: "encryption-salt",
                    nonce: "encryption-nonce",
                }),
            };

            mockCreate.mockResolvedValue(newUser);

            await signup(req, res);

            expect(mockFindOne).toHaveBeenCalledWith({
                email: "test@example.com",
            });

            expect(mockGenSalt).toHaveBeenCalledWith(10);

            expect(mockHash).toHaveBeenCalledWith(
                "password123",
                "salt-10"
            );

            expect(mockCreate).toHaveBeenCalledWith({
                fullName: "Test User",
                email: "test@example.com",
                password: "hashed-password",
                bio: "Test bio",
                publicKey: "public-key",
                encryptedPrivateKey: "encrypted-private-key",
                salt: "encryption-salt",
                nonce: "encryption-nonce",
            });

            expect(mockGenerateToken).toHaveBeenCalledWith("user-123");

            expect(res.json).toHaveBeenCalledWith({
                success: true,
                userData: {
                    _id: "user-123",
                    fullName: "Test User",
                    email: "test@example.com",
                    bio: "Test bio",
                    publicKey: "public-key",
                    encryptedPrivateKey: "encrypted-private-key",
                    salt: "encryption-salt",
                    nonce: "encryption-nonce",
                },
                token: "jwt-token",
                message: "Account created successfully!",
            });
        });

        test("rejects signup when required credentials are missing", async () => {
            req.body = {
                fullName: "Test User",
                email: "test@example.com",
                password: "password123",
            };

            await signup(req, res);

            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: "Missing Credentials",
            });

            expect(mockFindOne).not.toHaveBeenCalled();
            expect(mockCreate).not.toHaveBeenCalled();
        });

        test("rejects signup when email is already registered", async () => {
            req.body = {
                fullName: "Existing User",
                email: "existing@example.com",
                password: "password123",
                bio: "Test bio",
                publicKey: "public-key",
                encryptedPrivateKey: "encrypted-private-key",
                salt: "encryption-salt",
                nonce: "encryption-nonce",
            };

            mockFindOne.mockResolvedValue({
                _id: "existing-user",
                email: "existing@example.com",
            });

            await signup(req, res);

            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: "Email already in use!",
            });

            expect(mockCreate).not.toHaveBeenCalled();
            expect(mockHash).not.toHaveBeenCalled();
        });

        test("returns an error when signup fails", async () => {
            req.body = {
                fullName: "Test User",
                email: "test@example.com",
                password: "password123",
                bio: "Test bio",
                publicKey: "public-key",
                encryptedPrivateKey: "encrypted-private-key",
                salt: "encryption-salt",
                nonce: "encryption-nonce",
            };

            mockFindOne.mockRejectedValue(
                new Error("Database unavailable")
            );

            await signup(req, res);

            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: "Database unavailable",
            });
        });
    });

    describe("login", () => {
        test("logs in with valid credentials", async () => {
            req.body = {
                email: "test@example.com",
                password: "password123",
            };

            const user = {
                _id: "user-123",
                email: "test@example.com",
                fullName: "Test User",
                password: "hashed-password",
                bio: "Test bio",
                toObject: () => ({
                    _id: "user-123",
                    email: "test@example.com",
                    fullName: "Test User",
                    password: "hashed-password",
                    bio: "Test bio",
                }),
            };

            mockFindOne.mockResolvedValue(user);
            mockCompare.mockResolvedValue(true);

            await login(req, res);

            expect(mockFindOne).toHaveBeenCalledWith({
                email: "test@example.com",
            });

            expect(mockCompare).toHaveBeenCalledWith(
                "password123",
                "hashed-password"
            );

            expect(mockGenerateToken).toHaveBeenCalledWith("user-123");

            expect(res.json).toHaveBeenCalledWith({
                success: true,
                message: "Login Successful",
                token: "jwt-token",
                userData: {
                    _id: "user-123",
                    email: "test@example.com",
                    fullName: "Test User",
                    bio: "Test bio",
                },
            });
        });

        test("returns generic credentials error when user does not exist", async () => {
            req.body = {
                email: "unknown@example.com",
                password: "password123",
            };

            mockFindOne.mockResolvedValue(null);

            await login(req, res);

            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: "Incorrect Password!",
            });

            expect(mockCompare).not.toHaveBeenCalled();
            expect(mockGenerateToken).not.toHaveBeenCalled();
        });

        test("rejects incorrect password", async () => {
            req.body = {
                email: "test@example.com",
                password: "wrong-password",
            };

            mockFindOne.mockResolvedValue({
                _id: "user-123",
                password: "hashed-password",
            });

            mockCompare.mockResolvedValue(false);

            await login(req, res);

            expect(mockCompare).toHaveBeenCalledWith(
                "wrong-password",
                "hashed-password"
            );

            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: "Incorrect Password!",
            });

            expect(mockGenerateToken).not.toHaveBeenCalled();
        });

        test("returns an error when login fails", async () => {
            req.body = {
                email: "test@example.com",
                password: "password123",
            };

            mockFindOne.mockRejectedValue(
                new Error("Database unavailable")
            );

            await login(req, res);

            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: "Database unavailable",
            });
        });
    });

    describe("checkAuth", () => {
        test("returns the authenticated user", () => {
            const user = {
                _id: "user-123",
                fullName: "Test User",
                email: "test@example.com",
            };

            req.user = user;

            checkAuth(req, res);

            expect(res.json).toHaveBeenCalledWith({
                success: true,
                user,
            });
        });
    });

    describe("updatePublicKey", () => {
        test("updates the authenticated user's public key", async () => {
            req.body = {
                publicKey: "new-public-key",
            };

            mockFindByIdAndUpdate.mockResolvedValue({
                _id: "user-123",
                publicKey: "new-public-key",
            });

            await updatePublicKey(req, res);

            expect(mockFindByIdAndUpdate).toHaveBeenCalledWith(
                "user-123",
                {
                    publicKey: "new-public-key",
                }
            );

            expect(res.json).toHaveBeenCalledWith({
                success: true,
                message: "public key updated succesfully!",
            });
        });

        test("returns an error when public key update fails", async () => {
            req.body = {
                publicKey: "new-public-key",
            };

            mockFindByIdAndUpdate.mockRejectedValue(
                new Error("Update failed")
            );

            await updatePublicKey(req, res);

            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: "failed to update user's public keyUpdate failed",
            });
        });
    });

    describe("getPublicKey", () => {
        test("returns the target user's public key", async () => {
            req.params.targetUserId = "user-456";

            const user = {
                publicKey: "target-public-key",
            };

            const mockSelect = jest.fn().mockResolvedValue(user);

            mockFindById.mockReturnValue({
                select: mockSelect,
            });

            await getPublicKey(req, res);

            expect(mockFindById).toHaveBeenCalledWith("user-456");

            expect(mockSelect).toHaveBeenCalledWith("publicKey");

            expect(res.json).toHaveBeenCalledWith({
                success: true,
                publicKey: "target-public-key",
            });
        });

        test("returns an error when target user does not exist", async () => {
            req.params.targetUserId = "missing-user";

            const mockSelect = jest.fn().mockResolvedValue(null);

            mockFindById.mockReturnValue({
                select: mockSelect,
            });

            await getPublicKey(req, res);

            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: "User not found!",
            });
        });

        test("returns an error when public key is unavailable", async () => {
            req.params.targetUserId = "user-456";

            const mockSelect = jest.fn().mockResolvedValue({
                publicKey: "",
            });

            mockFindById.mockReturnValue({
                select: mockSelect,
            });

            await getPublicKey(req, res);

            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: "Public key not available for the user",
            });
        });

        test("returns a server error when public key lookup fails", async () => {
            req.params.targetUserId = "user-456";

            mockFindById.mockImplementation(() => {
                throw new Error("Database failure");
            });

            await getPublicKey(req, res);

            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: "server error",
                error: "Database failure",
            });
        });
    });

    describe("updateProfile", () => {
        test("updates profile without uploading an image", async () => {
            req.body = {
                fullName: "Updated User",
                bio: "Updated bio",
            };

            const updatedUser = {
                _id: "user-123",
                fullName: "Updated User",
                bio: "Updated bio",
            };

            mockFindByIdAndUpdate.mockResolvedValue(updatedUser);

            await updateProfile(req, res);

            expect(mockFindByIdAndUpdate).toHaveBeenCalledWith(
                "user-123",
                {
                    bio: "Updated bio",
                    fullName: "Updated User",
                },
                {
                    new: true,
                }
            );

            expect(mockCloudinaryUpload).not.toHaveBeenCalled();

            expect(res.json).toHaveBeenCalledWith({
                success: true,
                user: updatedUser,
            });
        });

        test("uploads a profile image and updates the profile", async () => {
            req.body = {
                profilePic: "base64-image-data",
                fullName: "Updated User",
                bio: "Updated bio",
            };

            mockCloudinaryUpload.mockResolvedValue({
                secure_url: "https://cloudinary.example/profile.jpg",
            });

            const updatedUser = {
                _id: "user-123",
                fullName: "Updated User",
                bio: "Updated bio",
                profilePic: "https://cloudinary.example/profile.jpg",
            };

            mockFindByIdAndUpdate.mockResolvedValue(updatedUser);

            await updateProfile(req, res);

            expect(mockCloudinaryUpload).toHaveBeenCalledWith(
                "base64-image-data"
            );

            expect(mockFindByIdAndUpdate).toHaveBeenCalledWith(
                "user-123",
                {
                    profilePic: "https://cloudinary.example/profile.jpg",
                    bio: "Updated bio",
                    fullName: "Updated User",
                },
                {
                    new: true,
                }
            );

            expect(res.json).toHaveBeenCalledWith({
                success: true,
                user: updatedUser,
            });
        });

        test("returns an error when profile update fails", async () => {
            req.body = {
                fullName: "Updated User",
                bio: "Updated bio",
            };

            mockFindByIdAndUpdate.mockRejectedValue(
                new Error("Profile update failed")
            );

            await updateProfile(req, res);

            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: "Profile update failed",
            });
        });

        test("returns an error when profile image upload fails", async () => {
            req.body = {
                profilePic: "base64-image-data",
                fullName: "Updated User",
                bio: "Updated bio",
            };

            mockCloudinaryUpload.mockRejectedValue(
                new Error("Cloudinary upload failed")
            );

            await updateProfile(req, res);

            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: "Cloudinary upload failed",
            });

            expect(mockFindByIdAndUpdate).not.toHaveBeenCalled();
        });
    });
});