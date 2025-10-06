# WhatsApp Cloud API Provider

WhatsApp Cloud API is Meta's official solution for businesses to send WhatsApp messages programmatically. This guide will help you integrate WhatsApp Cloud API with Dittofeed.

## Overview

The WhatsApp Cloud API allows businesses to send messages, including text, media, and interactive messages, directly through WhatsApp. It's hosted by Meta and offers a scalable solution for business messaging.

## Prerequisites

Before setting up WhatsApp Cloud API in Dittofeed, you'll need:

1. A [Meta Business Account](https://business.facebook.com/)
2. A [Meta Developer Account](https://developers.facebook.com/)
3. A WhatsApp Business Account
4. A verified Facebook Business Manager
5. A phone number to register with WhatsApp Business

## Setup Process

### Step 1: Create a Meta App

1. Go to [Meta for Developers](https://developers.facebook.com/)
2. Click **My Apps** > **Create App**
3. Select **Business** as the app type
4. Fill in your app details and create the app
5. In the app dashboard, add **WhatsApp** as a product

### Step 2: Get Your Credentials

You'll need two key pieces of information:

#### 1. Phone Number ID

1. In your Meta App dashboard, go to **WhatsApp** > **API Setup**
2. Find your **Phone Number ID** under "From" section
3. Copy this ID (it looks like: `109876543210123`)

#### 2. Access Token

For production use, you should create a System User access token:

1. Go to [Meta Business Suite](https://business.facebook.com/)
2. Navigate to **Business Settings** > **Users** > **System Users**
3. Click **Add** to create a new system user
4. Give it a name (e.g., "Dittofeed Integration")
5. Assign the user to your WhatsApp Business Account
6. Click **Generate New Token**
7. Select your app and the following permissions:
   - `whatsapp_business_messaging`
   - `whatsapp_business_management`
8. Set token expiration to **Never** for production
9. Copy the generated access token

> **Security Note**: System user tokens are more secure than temporary user tokens and don't expire unless revoked.

### Step 3: Verify Your Business

For production use, you must verify your Facebook Business:

1. Go to **Business Settings** > **Security Center**
2. Click **Start Verification**
3. Follow the verification steps (may require business documents)

> **Note**: Unverified businesses have strict messaging limits.

## Configuration in Dittofeed

### Step 1: Navigate to Settings

1. Log in to your Dittofeed dashboard
2. Go to **Settings** > **Message Channels** > **SMS**

### Step 2: Configure WhatsApp Cloud API

In the **WhatsApp Cloud API** section, fill in the following fields:

| Field | Required | Description |
|-------|----------|-------------|
| **Access Token** | Yes | Your System User access token or temporary token from Meta |
| **Phone Number ID** | Yes | The Phone Number ID from your WhatsApp Business Account |
| **Business Account ID** | No | Your WhatsApp Business Account ID (optional, for advanced features) |

### Step 3: Set as Default Provider (Optional)

To use WhatsApp Cloud as your default SMS provider:

1. In the **Default SMS Provider** section at the top of SMS settings
2. Select **WhatsApp Cloud** from the dropdown
3. Click **Save**

## Phone Number Format

WhatsApp requires phone numbers in international format without the `+` sign:

- ✅ Correct: `14155551234` (US number)
- ✅ Correct: `447911123456` (UK number)
- ❌ Incorrect: `+14155551234`
- ❌ Incorrect: `(415) 555-1234`

> **Note**: Dittofeed automatically normalizes phone numbers by removing all non-digit characters.

## API Limits and Pricing

### Rate Limits

WhatsApp Cloud API enforces rate limits based on your Quality Rating:

| Quality Rating | Messages per Day (per phone number) |
|----------------|-------------------------------------|
| High Quality   | 1,000 (Tier 1) → Unlimited (Tier 3+) |
| Medium Quality | 1,000 (Tier 1) → Unlimited (Tier 3+) |
| Low Quality    | 250 (Tier 1) → 50,000 (Tier 3+) |

**Rate Limiting**:
- Default: 80 messages per second
- Can be increased by requesting higher throughput

### Message Tiers

Your messaging limit increases based on usage:

- **Tier 1**: Up to 1,000 conversations per day (start here)
- **Tier 2**: Up to 10,000 conversations per day
- **Tier 3**: Up to 100,000 conversations per day
- **Tier 4**: Unlimited conversations

You automatically move up tiers as you send more messages.

### Pricing

WhatsApp charges per conversation:

- **Business-Initiated**: You start the conversation (higher cost)
- **User-Initiated**: Customer messages you first within 24 hours (lower cost)
- **Free Tier**: First 1,000 conversations per month are free

Pricing varies by country. Check [WhatsApp Pricing](https://developers.facebook.com/docs/whatsapp/pricing) for details.

## Testing Your Configuration

### Using the Test Number

Meta provides a test number for development:

1. In your Meta App dashboard, go to **WhatsApp** > **API Setup**
2. Add test recipient numbers under **To**
3. Send a test message to verify your setup

### Production Testing

1. Create a simple text template in Dittofeed
2. Send a test message to your verified phone number
3. Check the Meta App dashboard for delivery status
4. Verify the message was received in WhatsApp

## Message Templates

For business-initiated conversations, WhatsApp requires approved message templates:

### Creating a Template

1. Go to **WhatsApp** > **Message Templates** in Meta Business Suite
2. Click **Create Template**
3. Fill in template details:
   - **Name**: Unique identifier
   - **Category**: Marketing, Utility, or Authentication
   - **Language**: Target language
   - **Content**: Your message with optional variables
4. Submit for approval (usually approved within 24 hours)

### Using Templates in Dittofeed

Currently, Dittofeed sends text messages using the WhatsApp Cloud API. For template messages, you'll need to:

1. Use the template name and parameters in your message
2. Ensure the template is approved before sending

> **Note**: Template support in Dittofeed is coming soon. For now, only user-initiated conversations (24-hour window) support freeform text.

## Troubleshooting

### Common Issues

#### Invalid Access Token
**Error**: `OAuthException` or `Invalid OAuth access token`
**Solution**:
- Verify your access token hasn't expired
- Ensure the token has `whatsapp_business_messaging` permission
- Regenerate the token if necessary

#### Invalid Phone Number ID
**Error**: `Invalid parameter` or `Phone number not found`
**Solution**:
- Double-check your Phone Number ID in the Meta App dashboard
- Ensure the phone number is registered and verified
- Verify the phone number is added to your WhatsApp Business Account

#### Message Not Delivered
**Error**: Message sent but not received
**Solution**:
- Check if you're outside the 24-hour messaging window (requires template)
- Verify the recipient's number is a valid WhatsApp number
- Check your message quality rating in Meta Business Suite

#### Rate Limit Exceeded
**Error**: `Too many requests` (Error code 4, 80007, or 131031)
**Solution**:
- Dittofeed automatically retries rate-limited requests
- Reduce your sending rate
- Request higher throughput from Meta if needed

#### Business Not Verified
**Error**: `Message sending limited`
**Solution**:
- Complete business verification in Facebook Business Manager
- Verified businesses have higher limits
- Contact Meta support for verification issues

## Features

### Supported Features
- ✅ Text messages
- ✅ International reach (180+ countries)
- ✅ Unicode and emoji support
- ✅ Delivery receipts
- ✅ Read receipts
- ✅ End-to-end encryption

### Coming Soon in Dittofeed
- 🔄 Message templates
- 🔄 Media messages (images, documents, etc.)
- 🔄 Interactive messages (buttons, lists)
- 🔄 Webhook support for delivery status
- 🔄 Two-way messaging

## Best Practices

1. **Obtain Consent**: Always get user permission before sending WhatsApp messages
2. **Use Templates for Business-Initiated Messages**: Required outside the 24-hour window
3. **Maintain Quality Rating**: High-quality messages unlock higher limits
4. **Include Opt-Out Instructions**: Allow users to unsubscribe easily
5. **Respect 24-Hour Window**: Customer-initiated conversations are cheaper
6. **Monitor Usage**: Track your tier progression and conversation counts
7. **Keep Tokens Secure**: Use system user tokens and rotate them regularly

## Compliance

### WhatsApp Commerce Policy
- Don't spam users
- Don't send promotional content in service messages
- Don't send messages about illegal products
- Provide clear opt-out mechanisms

### GDPR and Data Privacy
- Store user consent records
- Provide data access and deletion capabilities
- Include privacy policy in your templates

## Additional Resources

- [WhatsApp Cloud API Documentation](https://developers.facebook.com/docs/whatsapp/cloud-api)
- [Message Templates Guide](https://developers.facebook.com/docs/whatsapp/message-templates)
- [WhatsApp Pricing](https://developers.facebook.com/docs/whatsapp/pricing)
- [WhatsApp Business Policy](https://www.whatsapp.com/legal/commerce-policy)
- [Meta for Developers](https://developers.facebook.com/)

## Support

If you encounter issues with the WhatsApp Cloud API integration:

1. Check the Dittofeed logs for detailed error messages (includes `fbtrace_id` for Meta support)
2. Verify your configuration in the Meta App dashboard
3. Check your quality rating and messaging limits
4. Contact Meta support with the `fbtrace_id` from error logs
5. Open an issue in the [Dittofeed GitHub repository](https://github.com/dittofeed/dittofeed/issues)

## FAQ

**Q: Can I use my personal WhatsApp number?**
A: No, you must use a WhatsApp Business Account with a dedicated business phone number.

**Q: How long does business verification take?**
A: Usually 1-3 business days, but can take longer depending on your location and submitted documents.

**Q: Can I send messages to any WhatsApp number?**
A: Yes, but you must have user consent and comply with WhatsApp's Commerce Policy.

**Q: What happens if I exceed my rate limit?**
A: Dittofeed will automatically retry the message. Consistent high-quality messaging will increase your limits.

**Q: Do I need a green checkmark (verified badge)?**
A: No, the verified badge is optional and separate from business verification. It provides additional trust but isn't required to use the API.
