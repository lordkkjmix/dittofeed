import axios, { AxiosError } from "axios";
import { SmsProviderType } from "../types";

// Mock axios
jest.mock("axios");
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe("brevo", () => {
  // Reset modules before each test to clear module cache
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("sendSms", () => {
    describe("when the operation succeeds", () => {
      it("should return a success result with messageId", async () => {
        // Setup mock success response
        const mockResponse = {
          data: {
            messageId: "test-message-id-123",
            reference: "ref-456",
          },
        };

        mockedAxios.post.mockResolvedValue(mockResponse);

        // Import the module
        const { sendSms } = await import("./brevo");

        // Act
        const result = await sendSms({
          apiKey: "fake-api-key",
          sender: "TestSender",
          to: "+1234567890",
          body: "Test message",
          tags: { messageId: "msg-123" },
        });

        // Assert
        expect(result.isOk()).toBe(true);
        result.match(
          (successResult) => {
            expect(successResult.type).toBe(SmsProviderType.Brevo);
            expect(successResult.messageId).toBe("test-message-id-123");
          },
          () => fail("Expected success result"),
        );

        // Verify API call
        expect(mockedAxios.post).toHaveBeenCalledWith(
          "https://api.brevo.com/v3/transactionalSMS/sms",
          {
            sender: "TestSender",
            recipient: "+1234567890",
            content: "Test message",
            tag: "msg-123",
          },
          {
            headers: {
              "api-key": "fake-api-key",
              "Content-Type": "application/json",
            },
          },
        );
      });

      it("should use reference as messageId when messageId is not present", async () => {
        // Setup mock success response without messageId
        const mockResponse = {
          data: {
            reference: "ref-456",
          },
        };

        mockedAxios.post.mockResolvedValue(mockResponse);

        const { sendSms } = await import("./brevo");

        const result = await sendSms({
          apiKey: "fake-api-key",
          to: "+1234567890",
          body: "Test message",
        });

        expect(result.isOk()).toBe(true);
        result.match(
          (successResult) => {
            expect(successResult.messageId).toBe("ref-456");
          },
          () => fail("Expected success result"),
        );
      });

      it("should use default sender when sender is not provided", async () => {
        const mockResponse = {
          data: {
            messageId: "test-id",
          },
        };

        mockedAxios.post.mockResolvedValue(mockResponse);

        const { sendSms } = await import("./brevo");

        await sendSms({
          apiKey: "fake-api-key",
          to: "+1234567890",
          body: "Test message",
        });

        expect(mockedAxios.post).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({
            sender: "Dittofeed",
          }),
          expect.any(Object),
        );
      });
    });

    describe("when the operation fails", () => {
      it("should return an error result for non-retryable errors", async () => {
        // Setup mock error response (400 Bad Request - not retryable)
        const mockError: Partial<AxiosError> = {
          response: {
            status: 400,
            data: {
              code: "invalid_parameter",
              message: "Invalid phone number",
            },
            statusText: "Bad Request",
            headers: {},
            config: {} as any,
          },
          code: "ERR_BAD_REQUEST",
          message: "Request failed with status code 400",
          name: "AxiosError",
        };

        mockedAxios.post.mockRejectedValue(mockError);

        const { sendSms } = await import("./brevo");

        // Act
        const result = await sendSms({
          apiKey: "fake-api-key",
          to: "invalid-number",
          body: "Test message",
        });

        // Assert
        expect(result.isErr()).toBe(true);
        result.match(
          () => fail("Expected error result"),
          (errorResult) => {
            expect(errorResult.type).toBe(SmsProviderType.Brevo);
            expect(errorResult.errorCode).toBe("invalid_parameter");
            expect(errorResult.errorMessage).toBe("Invalid phone number");
          },
        );
      });

      it("should throw for retryable errors (429 Rate Limit)", async () => {
        // Setup mock error response (429 - retryable)
        const mockError: Partial<AxiosError> = {
          response: {
            status: 429,
            data: {
              code: "rate_limit_exceeded",
              message: "Too many requests",
            },
            statusText: "Too Many Requests",
            headers: {},
            config: {} as any,
          },
          code: "ERR_RATE_LIMIT",
          message: "Request failed with status code 429",
          name: "AxiosError",
        };

        mockedAxios.post.mockRejectedValue(mockError);

        const { sendSms } = await import("./brevo");

        // Act & Assert
        await expect(
          sendSms({
            apiKey: "fake-api-key",
            to: "+1234567890",
            body: "Test message",
          }),
        ).rejects.toThrow("Retryable Brevo error");
      });

      it("should throw for retryable errors (500 Server Error)", async () => {
        // Setup mock error response (500 - retryable)
        const mockError: Partial<AxiosError> = {
          response: {
            status: 500,
            data: {
              code: "internal_error",
              message: "Internal server error",
            },
            statusText: "Internal Server Error",
            headers: {},
            config: {} as any,
          },
          code: "ERR_INTERNAL",
          message: "Request failed with status code 500",
          name: "AxiosError",
        };

        mockedAxios.post.mockRejectedValue(mockError);

        const { sendSms } = await import("./brevo");

        // Act & Assert
        await expect(
          sendSms({
            apiKey: "fake-api-key",
            to: "+1234567890",
            body: "Test message",
          }),
        ).rejects.toThrow("Retryable Brevo error");
      });

      it("should handle network errors as retryable", async () => {
        // Setup network error (no response)
        const mockError: Partial<AxiosError> = {
          code: "ECONNREFUSED",
          message: "Connection refused",
          name: "AxiosError",
        };

        mockedAxios.post.mockRejectedValue(mockError);

        const { sendSms } = await import("./brevo");

        // Act & Assert
        await expect(
          sendSms({
            apiKey: "fake-api-key",
            to: "+1234567890",
            body: "Test message",
          }),
        ).rejects.toThrow("Retryable Brevo error");
      });

      it("should handle errors with missing error data", async () => {
        // Setup error with minimal information
        const mockError: Partial<AxiosError> = {
          response: {
            status: 401,
            data: {} as any,
            statusText: "Unauthorized",
            headers: {},
            config: {} as any,
          },
          code: "ERR_UNAUTHORIZED",
          message: "Unauthorized",
          name: "AxiosError",
        };

        mockedAxios.post.mockRejectedValue(mockError);

        const { sendSms } = await import("./brevo");

        const result = await sendSms({
          apiKey: "invalid-api-key",
          to: "+1234567890",
          body: "Test message",
        });

        expect(result.isErr()).toBe(true);
        result.match(
          () => fail("Expected error result"),
          (errorResult) => {
            expect(errorResult.type).toBe(SmsProviderType.Brevo);
            expect(errorResult.errorCode).toBe("ERR_UNAUTHORIZED");
            expect(errorResult.errorMessage).toBe("Unauthorized");
          },
        );
      });
    });
  });
});
