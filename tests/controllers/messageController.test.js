import { jest } from "@jest/globals";

const mockMessageFind = jest.fn();
const mockMessageUpdateMany = jest.fn();
const mockMessageFindOneAndUpdate = jest.fn();
const mockMessageAggregate = jest.fn();
const mockMessageCreate = jest.fn();

const mockUserFind = jest.fn();

const mockUploadStream = jest.fn();
const mockSocketTo = jest.fn();
const mockSocketEmit = jest.fn();

const mockUserSocketMap = {};

jest.unstable_mockModule("../../models/Message.js", () => ({
    default: {
        find: mockMessageFind,
        updateMany: mockMessageUpdateMany,
        findOneAndUpdate: mockMessageFindOneAndUpdate,
        aggregate: mockMessageAggregate,
        create: mockMessageCreate,
    },
}));

jest.unstable_mockModule("../../models/User.js", () => ({
    default: {
        find: mockUserFind,
    },
}));

jest.unstable_mockModule("../../lib/cloudinary.js", () => ({
    default: {
        uploader: {
            upload_stream: mockUploadStream,
        },
    },
}));

jest.unstable_mockModule("../../server.js", () => ({
    userSocketMap: mockUserSocketMap,
    io: {
        to: mockSocketTo,
    },
}));

const {
    getUsersForSidebar,
    getMessages,
    markMessageSeen,
    sendMessage,
} = await import("../../controllers/messageController.js");

describe("Message Controller", () => {
    let req;
    let res;

    beforeEach(() => {
        jest.clearAllMocks();

        req = {
            user: {
                _id: "user-123",
            },
            params: {},
            query: {},
            body: {},
        };

        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis(),
        };

        mockSocketTo.mockReturnValue({
            emit: mockSocketEmit,
        });

        Object.keys(mockUserSocketMap).forEach((key) => {
            delete mockUserSocketMap[key];
        });
    });

    describe("getUsersForSidebar", () => {
        test("returns users, unseen message counts, and next cursor", async () => {
            req.query.cursor = undefined;

            const users = Array.from({ length: 30 }, (_, index) => ({
                _id: `user-${index + 1}`,
                fullName: `User ${index + 1}`,
                profilePic: null,
                bio: "",
                publicKey: "public-key",
            }));

            const mockLimit = jest.fn().mockResolvedValue(users);

            const mockSort = jest.fn().mockReturnValue({
                limit: mockLimit,
            });

            const mockSelect = jest.fn().mockReturnValue({
                sort: mockSort,
            });

            mockUserFind.mockReturnValue({
                select: mockSelect,
            });

            mockMessageAggregate.mockResolvedValue([
                {
                    _id: "sender-1",
                    count: 3,
                },
                {
                    _id: "sender-2",
                    count: 2,
                },
            ]);

            await getUsersForSidebar(req, res);

            expect(mockUserFind).toHaveBeenCalledWith({
                _id: {
                    $ne: "user-123",
                },
            });

            expect(mockSelect).toHaveBeenCalledWith(
                "fullName profilePic bio publicKey"
            );

            expect(mockSort).toHaveBeenCalledWith({
                _id: 1,
            });

            expect(mockLimit).toHaveBeenCalledWith(30);

            expect(mockMessageAggregate).toHaveBeenCalledWith([
                {
                    $match: {
                        receiverId: "user-123",
                        seen: false,
                    },
                },
                {
                    $group: {
                        _id: "$senderId",
                        count: {
                            $sum: 1,
                        },
                    },
                },
            ]);

            expect(res.json).toHaveBeenCalledWith({
                success: true,
                users,
                unseenMessages: {
                    "sender-1": 3,
                    "sender-2": 2,
                },
                nextCursor: "user-30",
            });
        });

        test("applies cursor pagination when a cursor is provided", async () => {
            req.query.cursor = "user-100";

            const users = [
                {
                    _id: "user-101",
                    fullName: "User 101",
                },
            ];

            const mockLimit = jest.fn().mockResolvedValue(users);

            const mockSort = jest.fn().mockReturnValue({
                limit: mockLimit,
            });

            const mockSelect = jest.fn().mockReturnValue({
                sort: mockSort,
            });

            mockUserFind.mockReturnValue({
                select: mockSelect,
            });

            mockMessageAggregate.mockResolvedValue([]);

            await getUsersForSidebar(req, res);

            expect(mockUserFind).toHaveBeenCalledWith({
                _id: {
                    $ne: "user-123",
                    $gt: "user-100",
                },
            });

            expect(res.json).toHaveBeenCalledWith({
                success: true,
                users,
                unseenMessages: {},
                nextCursor: null,
            });
        });

        test("returns an error response when the database query fails", async () => {
            mockUserFind.mockImplementation(() => {
                throw new Error("Database failure");
            });

            await getUsersForSidebar(req, res);

            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: "Database failure",
            });
        });
    });

    describe("getMessages", () => {
        test("retrieves messages only from the authenticated user's conversation", async () => {
            req.params.id = "user-456";

            const messages = [
                {
                    _id: "message-2",
                    senderId: "user-456",
                    receiverId: "user-123",
                },
                {
                    _id: "message-1",
                    senderId: "user-123",
                    receiverId: "user-456",
                },
            ];

            const mockLimit = jest.fn().mockResolvedValue([...messages]);

            const mockSort = jest.fn().mockReturnValue({
                limit: mockLimit,
            });

            mockMessageFind.mockReturnValue({
                sort: mockSort,
            });

            mockMessageUpdateMany.mockResolvedValue({
                modifiedCount: 1,
            });

            await getMessages(req, res);

            expect(mockMessageFind).toHaveBeenCalledWith({
                $or: [
                    {
                        senderId: "user-123",
                        receiverId: "user-456",
                    },
                    {
                        senderId: "user-456",
                        receiverId: "user-123",
                    },
                ],
            });

            expect(mockSort).toHaveBeenCalledWith({
                _id: -1,
            });

            expect(mockLimit).toHaveBeenCalledWith(20);

            expect(mockMessageUpdateMany).toHaveBeenCalledWith(
                {
                    senderId: "user-456",
                    receiverId: "user-123",
                    seen: false,
                },
                {
                    seen: true,
                }
            );

            expect(res.json).toHaveBeenCalledWith({
                success: true,
                messages: [...messages].reverse(),
            });
        });

        test("applies the cursor when retrieving older messages", async () => {
            req.params.id = "user-456";
            req.query.cursor = "message-cursor";

            const mockLimit = jest.fn().mockResolvedValue([]);

            const mockSort = jest.fn().mockReturnValue({
                limit: mockLimit,
            });

            mockMessageFind.mockReturnValue({
                sort: mockSort,
            });

            mockMessageUpdateMany.mockResolvedValue({
                modifiedCount: 0,
            });

            await getMessages(req, res);

            expect(mockMessageFind).toHaveBeenCalledWith({
                $or: [
                    {
                        senderId: "user-123",
                        receiverId: "user-456",
                    },
                    {
                        senderId: "user-456",
                        receiverId: "user-123",
                    },
                ],
                _id: {
                    $lt: "message-cursor",
                },
            });

            expect(mockLimit).toHaveBeenCalledWith(20);

            expect(res.json).toHaveBeenCalledWith({
                success: true,
                messages: [],
            });
        });

        test("returns an error response when retrieving messages fails", async () => {
            mockMessageFind.mockImplementation(() => {
                throw new Error("Message query failed");
            });

            await getMessages(req, res);

            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: "Message query failed",
            });
        });
    });

    describe("markMessageSeen", () => {
        test("marks a message as seen when the authenticated user is the receiver", async () => {
            req.params.id = "message-123";

            mockMessageFindOneAndUpdate.mockResolvedValue({
                _id: "message-123",
                receiverId: "user-123",
                seen: true,
            });

            await markMessageSeen(req, res);

            expect(mockMessageFindOneAndUpdate).toHaveBeenCalledWith(
                {
                    _id: "message-123",
                    receiverId: "user-123",
                },
                {
                    seen: true,
                }
            );

            expect(res.json).toHaveBeenCalledWith({
                success: true,
            });
        });

        test("rejects attempts to mark another user's message as seen", async () => {
            req.params.id = "message-123";

            mockMessageFindOneAndUpdate.mockResolvedValue(null);

            await markMessageSeen(req, res);

            expect(res.status).toHaveBeenCalledWith(403);

            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: "Not authorized to update this message",
            });
        });

        test("returns an error response when updating the message fails", async () => {
            req.params.id = "message-123";

            mockMessageFindOneAndUpdate.mockRejectedValue(
                new Error("Update failed")
            );

            await markMessageSeen(req, res);

            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: "Update failed",
            });
        });
    });

    describe("sendMessage", () => {
        test("creates and returns a text message", async () => {
            req.params.id = "user-456";

            req.body = {
                text: "encrypted message",
                nonce: "nonce-value",
            };

            const newMessage = {
                _id: "message-123",
                senderId: "user-123",
                receiverId: "user-456",
                text: "encrypted message",
                nonce: "nonce-value",
            };

            mockMessageCreate.mockResolvedValue(newMessage);

            await sendMessage(req, res);

            expect(mockMessageCreate).toHaveBeenCalledWith({
                senderId: "user-123",
                receiverId: "user-456",
                text: "encrypted message",
                image: undefined,
                nonce: "nonce-value",
            });

            expect(res.status).toHaveBeenCalledWith(200);

            expect(res.json).toHaveBeenCalledWith({
                success: true,
                newMessage,
            });
        });

        test("uploads an encrypted image through Cloudinary", async () => {
            req.params.id = "user-456";

            req.body = {
                text: "encrypted message",
                nonce: "nonce-value",
                image: "encrypted-image-buffer",
            };

            const newMessage = {
                _id: "message-123",
                senderId: "user-123",
                receiverId: "user-456",
                text: "encrypted message",
                image: "https://cloudinary.example/encrypted.bin",
                nonce: "nonce-value",
            };

            mockUploadStream.mockImplementation((options, callback) => {
                callback(null, {
                    secure_url: "https://cloudinary.example/encrypted.bin",
                });

                return {
                    end: jest.fn(),
                };
            });

            mockMessageCreate.mockResolvedValue(newMessage);

            await sendMessage(req, res);

            expect(mockUploadStream).toHaveBeenCalledWith(
                {
                    resource_type: "raw",
                    folder: "encrypted_messages",
                },
                expect.any(Function)
            );

            expect(mockMessageCreate).toHaveBeenCalledWith({
                senderId: "user-123",
                receiverId: "user-456",
                text: "encrypted message",
                image: "https://cloudinary.example/encrypted.bin",
                nonce: "nonce-value",
            });

            expect(res.status).toHaveBeenCalledWith(200);

            expect(res.json).toHaveBeenCalledWith({
                success: true,
                newMessage,
            });
        });

        test("emits a new message when the receiver is connected", async () => {
            req.params.id = "user-456";

            req.body = {
                text: "encrypted message",
                nonce: "nonce-value",
            };

            const newMessage = {
                _id: "message-123",
                senderId: "user-123",
                receiverId: "user-456",
                text: "encrypted message",
                nonce: "nonce-value",
            };

            mockMessageCreate.mockResolvedValue(newMessage);

            mockUserSocketMap["user-456"] = "socket-456";

            await sendMessage(req, res);

            expect(mockSocketTo).toHaveBeenCalledWith("socket-456");

            expect(mockSocketEmit).toHaveBeenCalledWith(
                "newMessage",
                newMessage
            );

            expect(res.status).toHaveBeenCalledWith(200);

            delete mockUserSocketMap["user-456"];
        });

        test("does not emit when the receiver is offline", async () => {
            req.params.id = "user-456";

            req.body = {
                text: "encrypted message",
                nonce: "nonce-value",
            };

            const newMessage = {
                _id: "message-123",
                senderId: "user-123",
                receiverId: "user-456",
            };

            mockMessageCreate.mockResolvedValue(newMessage);

            await sendMessage(req, res);

            expect(mockSocketTo).not.toHaveBeenCalled();
            expect(mockSocketEmit).not.toHaveBeenCalled();

            expect(res.status).toHaveBeenCalledWith(200);
        });

        test("returns a 500 response when message creation fails", async () => {
            req.params.id = "user-456";

            req.body = {
                text: "encrypted message",
                nonce: "nonce-value",
            };

            mockMessageCreate.mockRejectedValue(
                new Error("Message creation failed")
            );

            await sendMessage(req, res);

            expect(res.status).toHaveBeenCalledWith(500);

            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: "Message creation failed",
            });
        });
    });
});