import axios, { AxiosError } from "axios";
import { err, ok, Result } from "neverthrow";

import logger from "../logger";
import {
  MessageBrevoServiceFailure,
  MessageTags,
  SmsBrevoSuccess,
  SmsProviderType,
} from "../types";

export const BREVO_API_URL = "https://api.brevo.com/v3/transactionalSMS/sms";

export const BREVO_RETRYABLE_STATUS_CODES = new Set([
  408, // Request Timeout
  429, // Too Many Requests
  500, // Internal Server Error
  502, // Bad Gateway
  503, // Service Unavailable
  504, // Gateway Timeout
]);

function isRetryableBrevoError(statusCode?: number): boolean {
  if (!statusCode) {
    return true; // Network errors should be retried
  }
  return BREVO_RETRYABLE_STATUS_CODES.has(statusCode);
}

export async function sendSms({
  apiKey,
  sender,
  to,
  body,
  tags,
}: {
  apiKey: string;
  sender?: string;
  to: string;
  body: string;
  tags?: MessageTags;
}): Promise<Result<SmsBrevoSuccess, MessageBrevoServiceFailure>> {
  try {
    const response = await axios.post(
      BREVO_API_URL,
      {
        sender: sender || "Dittofeed",
        recipient: to,
        content: body,
        tag: tags?.messageId,
      },
      {
        headers: {
          "api-key": apiKey,
          "Content-Type": "application/json",
        },
      },
    );

    logger().debug(
      {
        messageId: response.data.messageId,
        reference: response.data.reference,
        tags,
      },
      "Brevo SMS sent successfully",
    );

    return ok({
      type: SmsProviderType.Brevo,
      messageId: response.data.messageId || response.data.reference,
    });
  } catch (error) {
    const axiosError = error as AxiosError<{
      code: string;
      message: string;
    }>;

    const errorCode =
      axiosError.response?.data?.code || axiosError.code || "UNKNOWN";
    const errorMessage =
      axiosError.response?.data?.message ||
      axiosError.message ||
      "Unknown error";

    logger().error(
      {
        err: axiosError,
        errorCode,
        errorMessage,
        tags,
        statusCode: axiosError.response?.status,
      },
      "Brevo SMS send failed",
    );

    // Throw retryable errors to be handled by the workflow retry logic
    if (isRetryableBrevoError(axiosError.response?.status)) {
      throw new Error(
        `Retryable Brevo error: code=${errorCode} message=${errorMessage}`,
      );
    }

    return err({
      type: SmsProviderType.Brevo,
      errorCode,
      errorMessage,
    });
  }
}
