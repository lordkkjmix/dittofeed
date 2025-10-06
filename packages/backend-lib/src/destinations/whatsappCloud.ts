import axios, { AxiosError } from "axios";
import { err, ok, Result } from "neverthrow";

import logger from "../logger";
import {
  MessageTags,
  MessageWhatsAppCloudServiceFailure,
  SmsProviderType,
  SmsWhatsAppCloudSuccess,
} from "../types";

export const WHATSAPP_API_VERSION = "v21.0";

export const WHATSAPP_RETRYABLE_ERROR_CODES = new Set([
  4, // API Unknown
  17, // API User Too Many Calls
  32, // API Too Many Calls
  80007, // Rate limit hit
  131031, // Business Account Throttled
  368, // Temporarily blocked for policies violations
]);

export const WHATSAPP_RETRYABLE_STATUS_CODES = new Set([
  408, // Request Timeout
  429, // Too Many Requests
  500, // Internal Server Error
  502, // Bad Gateway
  503, // Service Unavailable
  504, // Gateway Timeout
]);

function isRetryableWhatsAppError(
  errorCode?: number,
  statusCode?: number,
): boolean {
  if (!statusCode && !errorCode) {
    return true; // Network errors should be retried
  }
  if (statusCode && WHATSAPP_RETRYABLE_STATUS_CODES.has(statusCode)) {
    return true;
  }
  if (errorCode && WHATSAPP_RETRYABLE_ERROR_CODES.has(errorCode)) {
    return true;
  }
  return false;
}

/**
 * Normalize phone number for WhatsApp Cloud API
 * Removes all non-digit characters
 */
function normalizePhoneNumber(phone: string): string {
  return phone.replace(/\D/g, "");
}

export async function sendSms({
  accessToken,
  phoneNumberId,
  to,
  body,
  tags,
}: {
  accessToken: string;
  phoneNumberId: string;
  to: string;
  body: string;
  tags?: MessageTags;
}): Promise<
  Result<SmsWhatsAppCloudSuccess, MessageWhatsAppCloudServiceFailure>
> {
  const normalizedTo = normalizePhoneNumber(to);

  try {
    const url = `https://graph.facebook.com/${WHATSAPP_API_VERSION}/${phoneNumberId}/messages`;

    const response = await axios.post(
      url,
      {
        messaging_product: "whatsapp",
        to: normalizedTo,
        type: "text",
        text: {
          body,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      },
    );

    const messageId = response.data.messages?.[0]?.id;

    if (!messageId) {
      logger().error(
        {
          response: response.data,
          tags,
        },
        "WhatsApp Cloud API response missing message ID",
      );
      throw new Error("WhatsApp Cloud API response missing message ID");
    }

    logger().debug(
      {
        messageId,
        to: normalizedTo,
        tags,
      },
      "WhatsApp Cloud message sent successfully",
    );

    return ok({
      type: SmsProviderType.WhatsAppCloud,
      messageId,
    });
  } catch (error) {
    const axiosError = error as AxiosError<{
      error?: {
        code: number;
        message: string;
        type: string;
        error_subcode?: number;
        fbtrace_id?: string;
      };
    }>;

    const errorCode =
      axiosError.response?.data?.error?.code ||
      parseInt(axiosError.code || "0", 10);
    const errorMessage =
      axiosError.response?.data?.error?.message ||
      axiosError.message ||
      "Unknown error";
    const errorType = axiosError.response?.data?.error?.type || "Unknown";

    logger().error(
      {
        err: axiosError,
        errorCode,
        errorMessage,
        errorType,
        tags,
        to: normalizedTo,
        statusCode: axiosError.response?.status,
        fbtrace_id: axiosError.response?.data?.error?.fbtrace_id,
      },
      "WhatsApp Cloud send failed",
    );

    // Throw retryable errors to be handled by the workflow retry logic
    if (
      isRetryableWhatsAppError(errorCode, axiosError.response?.status)
    ) {
      throw new Error(
        `Retryable WhatsApp Cloud error: code=${errorCode} message=${errorMessage}`,
      );
    }

    return err({
      type: SmsProviderType.WhatsAppCloud,
      errorCode: errorCode.toString(),
      errorMessage: `${errorType}: ${errorMessage}`,
    });
  }
}
