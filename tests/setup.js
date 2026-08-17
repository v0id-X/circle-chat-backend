import { jest } from "@jest/globals";

beforeAll(() => {
    jest.spyOn(console, "log").mockImplementation(() => {});
});

afterAll(() => {
    console.log.mockRestore();
});