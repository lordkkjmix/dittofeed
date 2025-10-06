# Brevo SMS Provider

Brevo (formerly Sendinblue) is a comprehensive digital marketing platform that includes SMS messaging capabilities. This guide will help you integrate Brevo SMS with Dittofeed.

## Overview

Brevo offers transactional and marketing SMS services with competitive pricing and global reach. It supports over 190 countries and provides a user-friendly API for sending SMS messages.

## Prerequisites

Before setting up Brevo SMS in Dittofeed, you'll need:

1. A Brevo account (sign up at [brevo.com](https://www.brevo.com))
2. SMS credits purchased in your Brevo account
3. A verified sender name (required in some countries)
4. An API key with SMS permissions

## Getting Your API Key

1. Log in to your Brevo account
2. Navigate to **Settings** > **SMTP & API** > **API Keys**
3. Click **Generate a new API Key**
4. Give your API key a descriptive name (e.g., "Dittofeed SMS")
5. Copy the generated API key (you won't be able to see it again)

> **Important**: Keep your API key secure and never share it publicly or commit it to version control.

## Configuration in Dittofeed

### Step 1: Navigate to Settings

1. Log in to your Dittofeed dashboard
2. Go to **Settings** > **Message Channels** > **SMS**

### Step 2: Configure Brevo

In the **Brevo** section, fill in the following fields:

| Field | Required | Description |
|-------|----------|-------------|
| **API Key** | Yes | Your Brevo API key obtained from the Brevo dashboard |
| **Sender Name** | No | Default sender name for SMS (defaults to "Dittofeed" if not provided) |

### Step 3: Set as Default Provider (Optional)

If you want to use Brevo as your default SMS provider:

1. In the **Default SMS Provider** section at the top of the SMS settings
2. Select **Brevo** from the dropdown
3. Click **Save**

## Sender Name Guidelines

The sender name (also called sender ID) appears as the message sender on the recipient's device:

- **Alphanumeric**: Up to 11 characters (letters, numbers, spaces)
- **Numeric**: Up to 15 digits
- **Requirements vary by country**: Some countries only allow pre-registered sender IDs

### Country-Specific Requirements

- **United States**: Alphanumeric sender IDs are not supported. You must use a registered phone number.
- **European Union**: Alphanumeric sender IDs are widely supported
- **India**: Requires pre-registration and DLT (Distributed Ledger Technology) registration
- **Other countries**: Check [Brevo's country guidelines](https://help.brevo.com/hc/en-us/articles/209554289)

## API Limits and Pricing

### Rate Limits

Brevo enforces the following rate limits:

- **Default**: 300 SMS per day for free accounts
- **Paid accounts**: Higher limits based on your plan
- **API rate limit**: 10 requests per second

If you exceed these limits, you'll receive a `429 Too Many Requests` error, and Dittofeed will automatically retry.

### Pricing

Brevo uses a credit-based system:
- Pricing varies by destination country
- Credits can be purchased in bulk
- Check current pricing at [brevo.com/pricing](https://www.brevo.com/pricing/)

## Testing Your Configuration

To test your Brevo SMS configuration:

1. Create a simple SMS template in Dittofeed
2. Send a test message to your own phone number
3. Check the Brevo dashboard for delivery status
4. Verify the message was received

## Troubleshooting

### Common Issues

#### API Key Invalid
**Error**: `invalid_parameter` or `unauthorized`
**Solution**:
- Verify you copied the entire API key correctly
- Ensure the API key has SMS permissions
- Check if the API key has been revoked in the Brevo dashboard

#### Insufficient Credits
**Error**: `insufficient_credits`
**Solution**:
- Purchase more SMS credits in your Brevo account
- Check your current credit balance in the Brevo dashboard

#### Invalid Sender Name
**Error**: `invalid_sender`
**Solution**:
- Use an alphanumeric sender (11 characters max) or numeric (15 digits max)
- For certain countries, pre-register your sender ID in Brevo
- Leave the sender field empty to use the default "Dittofeed"

#### Rate Limit Exceeded
**Error**: `rate_limit_exceeded`
**Solution**:
- Dittofeed automatically retries rate-limited requests
- Upgrade your Brevo plan for higher limits
- Spread your messages over a longer time period

## Features

### Supported Features
- ✅ Transactional SMS
- ✅ Global delivery (190+ countries)
- ✅ Unicode support (emojis, international characters)
- ✅ Delivery tracking
- ✅ Custom sender ID (country-dependent)

### Not Currently Supported in Dittofeed
- ❌ MMS (Multimedia messaging)
- ❌ Webhooks for delivery status (coming soon)
- ❌ Two-way messaging

## Best Practices

1. **Use Clear Sender IDs**: Choose a sender name that recipients will recognize
2. **Comply with Local Regulations**: Ensure you have consent to send SMS in each country
3. **Include Opt-Out Instructions**: Add unsubscribe information to marketing messages
4. **Monitor Your Credits**: Set up alerts in Brevo when credits run low
5. **Test Before Launching**: Always send test messages before production campaigns

## Additional Resources

- [Brevo API Documentation](https://developers.brevo.com/reference/sendtransacsms)
- [Brevo Help Center](https://help.brevo.com/)
- [Country-Specific SMS Guidelines](https://help.brevo.com/hc/en-us/articles/209554289)
- [Brevo SMS Pricing](https://www.brevo.com/pricing/)

## Support

If you encounter issues with the Brevo integration:

1. Check the Dittofeed logs for detailed error messages
2. Verify your configuration in the Brevo dashboard
3. Contact Brevo support for API-specific issues
4. Open an issue in the [Dittofeed GitHub repository](https://github.com/dittofeed/dittofeed/issues)
