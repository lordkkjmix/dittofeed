import axios, { AxiosError } from "axios";
import { SmsProviderType } from "../types";

// Mock axios
jest.mock("axios");
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe("whatsappCloud", () => {
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
        const mockResponse = {
          data: {
            messaging_product: "whatsapp",
            contacts: [{ input: "1234567890", wa_id: "1234567890" }],
            messages: [{ id: "wamid.test123456" }],
          },
        };

        mockedAxios.post.mockResolvedValue(mockResponse);

        const { sendSms } = await import("./whatsappCloud");

        const result = await sendSms({
          accessToken: "fake-access-token",
          phoneNumberId: "123456789012345",
          to: "+1234567890",
          body: "Test message",
          tags: { messageId: "msg-123" },
        });

        expect(result.isOk()).toBe(true);
        result.match(
          (successResult) => {
            expect(successResult.type).toBe(SmsProviderType.WhatsAppCloud);
            expect(successResult.messageId).toBe("wamid.test123456");
          },
          () => fail("Expected success result"),
        );

        // Verify API call
        expect(mockedAxios.post).toHaveBeenCalledWith(
          "https://graph.facebook.com/v21.0/123456789012345/messages",
          {
            messaging_product: "whatsapp",
            to: "1234567890", // Normalized (no +)
            type: "text",
            text: {
              body: "Test message",
            },
          },
          {
            headers: {
              Authorization: "Bearer fake-access-token",
              "Content-Type": "application/json",
            },
          },
        );
      });

      it("should normalize phone numbers by removing non-digit characters", async () => {
        const mockResponse = {
          data: {
            messages: [{ id: "wamid.test123" }],
          },
        };

        mockedAxios.post.mockResolvedValue(mockResponse);

        const { sendSms } = await import("./whatsappCloud");

        await sendSms({
          accessToken: "fake-token",
          phoneNumberId: "123456789012345",
          to: "+1 (234) 567-8900",
          body: "Test",
        });

        expect(mockedAxios.post).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({
            to: "12345678900", // All non-digits removed
          }),
          expect.any(Object),
        );
      });

      it("should handle phone numbers with only digits", async () => {
        const mockResponse = {
          data: {
            messages: [{ id: "wamid.test123" }],
          },
        };

        mockedAxios.post.mockResolvedValue(mockResponse);

        const { sendSms } = await import("./whatsappCloud");

        await sendSms({
          accessToken: "fake-token",
          phoneNumberId: "123456789012345",
          to: "1234567890",
          body: "Test",
        });

        expect(mockedAxios.post).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({
            to: "1234567890",
          }),
          expect.any(Object),
        );
      });
    });

    describe("when the operation fails", () => {
      it("should throw when response is missing message ID", async () => {
        const mockResponse = {
          data: {
            messaging_product: "whatsapp",
            contacts: [{ input: "1234567890" }],
            messages: [], // Empty messages array
          },
        };

        mockedAxios.post.mockResolvedValue(mockResponse);

        const { sendSms } = await import("./whatsappCloud");

        await expect(
          sendSms({
            accessToken: "fake-token",
            phoneNumberId: "123456789012345",
            to: "+1234567890",
            body: "Test",
          }),
        ).rejects.toThrow("WhatsApp Cloud API response missing message ID");
      });

      it("should return an error result for non-retryable errors", async () => {
        const mockError: Partial<AxiosError> = {
          response: {
            status: 400,
            data: {
              error: {
                code: 100,
                message: "Invalid parameter",
                type: "OAuthException",
                fbtrace_id: "ABC123XYZ",
              },
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

        const { sendSms } = await import("./whatsappCloud");

        const result = await sendSms({
          accessToken: "fake-token",
          phoneNumberId: "123456789012345",
          to: "+1234567890",
          body: "Test",
        });

        expect(result.isErr()).toBe(true);
        result.match(
          () => fail("Expected error result"),
          (errorResult) => {
            expect(errorResult.type).toBe(SmsProviderType.WhatsAppCloud);
            expect(errorResult.errorCode).toBe("100");
            expect(errorResult.errorMessage).toBe(
              "OAuthException: Invalid parameter",
            );
          },
        );
      });

      it("should throw for retryable rate limit errors (code 4)", async () => {
        const mockError: Partial<AxiosError> = {
          response: {
            status: 400,
            data: {
              error: {
                code: 4, // API Unknown - retryable
                message: "API rate limit exceeded",
                type: "OAuthException",
              },
            },
            statusText: "Bad Request",
            headers: {},
            config: {} as any,
          },
          message: "Request failed",
          name: "AxiosError",
        };

        mockedAxios.post.mockRejectedValue(mockError);

        const { sendSms } = await import("./whatsappCloud");

        await expect(
          sendSms({
            accessToken: "fake-token",
            phoneNumberId: "123456789012345",
            to: "+1234567890",
            body: "Test",
          }),
        ).rejects.toThrow("Retryable WhatsApp Cloud error");
      });

      it("should throw for retryable throttling errors (code 80007)", async () => {
        const mockError: Partial<AxiosError> = {
          response: {
            status: 429,
            data: {
              error: {
                code: 80007, // Rate limit hit
                message: "Rate limit hit",
                type: "OAuthException",
              },
            },
            statusText: "Too Many Requests",
            headers: {},
            config: {} as any,
          },
          message: "Request failed",
          name: "AxiosError",
        };

        mockedAxios.post.mockRejectedValue(mockError);

        const { sendSms } = await import("./whatsappCloud");

        await expect(
          sendSms({
            accessToken: "fake-token",
            phoneNumberId: "123456789012345",
            to: "+1234567890",
            body: "Test",
          }),
        ).rejects.toThrow("Retryable WhatsApp Cloud error");
      });

      it("should throw for retryable HTTP 500 errors", async () => {
        const mockError: Partial<AxiosError> = {
          response: {
            status: 500,
            data: {
              error: {
                code: 1,
                message: "Internal server error",
                type: "InternalServerError",
              },
            },
            statusText: "Internal Server Error",
            headers: {},
            config: {} as any,
          },
          message: "Request failed",
          name: "AxiosError",
        };

        mockedAxios.post.mockRejectedValue(mockError);

        const { sendSms } = await import("./whatsappCloud");

        await expect(
          sendSms({
            accessToken: "fake-token",
            phoneNumberId: "123456789012345",
            to: "+1234567890",
            body: "Test",
          }),
        ).rejects.toThrow("Retryable WhatsApp Cloud error");
      });

      it("should throw for retryable HTTP 503 errors", async () => {
        const mockError: Partial<AxiosError> = {
          response: {
            status: 503,
            data: {
              error: {
                code: 2,
                message: "Service unavailable",
                type: "ServiceUnavailable",
              },
            },
            statusText: "Service Unavailable",
            headers: {},
            config: {} as any,
          },
          message: "Request failed",
          name: "AxiosError",
        };

        mockedAxios.post.mockRejectedValue(mockError);

        const { sendSms } = await import("./whatsappCloud");

        await expect(
          sendSms({
            accessToken: "fake-token",
            phoneNumberId: "123456789012345",
            to: "+1234567890",
            body: "Test",
          }),
        ).rejects.toThrow("Retryable WhatsApp Cloud error");
      });

      it("should handle network errors as retryable", async () => {
        const mockError: Partial<AxiosError> = {
          code: "ECONNREFUSED",
          message: "Connection refused",
          name: "AxiosError",
        };

        mockedAxios.post.mockRejectedValue(mockError);

        const { sendSms } = await import("./whatsappCloud");

        await expect(
          sendSms({
            accessToken: "fake-token",
            phoneNumberId: "123456789012345",
            to: "+1234567890",
            body: "Test",
          }),
        ).rejects.toThrow("Retryable WhatsApp Cloud error");
      });

      it("should handle errors with minimal information", async () => {
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

        const { sendSms } = await import("./whatsappCloud");

        const result = await sendSms({
          accessToken: "invalid-token",
          phoneNumberId: "123456789012345",
          to: "+1234567890",
          body: "Test",
        });

        expect(result.isErr()).toBe(true);
        result.match(
          () => fail("Expected error result"),
          (errorResult) => {
            expect(errorResult.type).toBe(SmsProviderType.WhatsAppCloud);
            expect(errorResult.errorCode).toBe("0");
            expect(errorResult.errorMessage).toBe("Unknown: Unauthorized");
          },
        );
      });
    });
  });
});
