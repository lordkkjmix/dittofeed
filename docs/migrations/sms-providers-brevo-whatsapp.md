# Migration: Add Brevo and WhatsApp Cloud SMS Providers

**Date**: 2025-01-06
**Migration Type**: Schema-compatible (No SQL migration required)
**Affects**: SMS Provider functionality

## Summary

This change adds two new SMS provider types to Dittofeed:
- **Brevo** (formerly Sendinblue)
- **WhatsApp Cloud API**

## Database Impact

### No Migration Required ✅

The `SmsProvider` table uses a `text` column for the `type` field, not a PostgreSQL ENUM. This means:

- **No SQL migration is needed**
- New provider types are automatically supported
- Existing data is not affected
- Backward compatibility is maintained

### Database Schema

```sql
CREATE TABLE IF NOT EXISTS "SmsProvider" (
  "id" uuid PRIMARY KEY NOT NULL,
  "workspaceId" uuid NOT NULL,
  "secretId" uuid NOT NULL,
  "type" text NOT NULL,  -- ← Text column, not ENUM
  "createdAt" timestamp (3) DEFAULT now() NOT NULL,
  "updatedAt" timestamp (3) NOT NULL
);
```

The `type` column accepts any text value, so `'Brevo'` and `'WhatsAppCloud'` will work without schema changes.

## TypeScript Changes

### Enum Updated

The `SmsProviderType` enum in `/packages/isomorphic-lib/src/types.ts` was updated:

```typescript
export enum SmsProviderType {
  Twilio = "Twilio",
  SignalWire = "SignalWire",
  Brevo = "Brevo",              // NEW
  WhatsAppCloud = "WhatsAppCloud", // NEW
  Test = "Test",
}
```

### Secret Names Added

New secret names in `/packages/isomorphic-lib/src/constants.ts`:

```typescript
export enum SecretNames {
  // ... existing
  Brevo = "brevo",                    // NEW
  WhatsAppCloud = "whatsapp-cloud",   // NEW
}
```

## Data Migration

### Existing Data

No changes to existing SMS provider records. Current providers (`Twilio`, `SignalWire`, `Test`) continue to work unchanged.

### New Provider Configuration

Users can now create new `SmsProvider` records with:

```sql
INSERT INTO "SmsProvider" (id, workspaceId, secretId, type, createdAt, updatedAt)
VALUES (
  gen_random_uuid(),
  '<workspace-id>',
  '<secret-id>',
  'Brevo',  -- or 'WhatsAppCloud'
  now(),
  now()
);
```

## Rollback Plan

### Code Rollback

To rollback this feature:

1. Remove the new enum values from `SmsProviderType`
2. Remove the new secret names from `SecretNames`
3. Remove the Brevo and WhatsApp Cloud modules from `/packages/backend-lib/src/destinations/`
4. Remove the integration code from `/packages/backend-lib/src/messaging.ts`

### Database Rollback

**No database rollback required** because:

- No schema changes were made
- Existing data remains valid
- The `type` column uses `text`, not an ENUM

If Brevo or WhatsApp Cloud providers were created:

```sql
-- Optional: Remove Brevo providers
DELETE FROM "SmsProvider" WHERE type = 'Brevo';

-- Optional: Remove WhatsApp Cloud providers
DELETE FROM "SmsProvider" WHERE type = 'WhatsAppCloud';
```

## Testing

### Verify No Schema Changes

Run this query to verify the schema hasn't changed:

```sql
SELECT
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'SmsProvider'
  AND table_schema = 'public'
ORDER BY ordinal_position;
```

Expected output:
```
 column_name  | data_type           | is_nullable
--------------+---------------------+-------------
 id           | uuid                | NO
 workspaceId  | uuid                | NO
 secretId     | uuid                | NO
 type         | text                | NO
 createdAt    | timestamp without   | NO
 updatedAt    | timestamp without   | NO
```

### Test New Providers

1. Create a Brevo provider in the UI
2. Send a test SMS via Brevo
3. Create a WhatsApp Cloud provider in the UI
4. Send a test message via WhatsApp Cloud
5. Verify both providers appear in the default SMS provider dropdown

## Related Files

### Code Changes
- `/packages/isomorphic-lib/src/types.ts` - Type definitions
- `/packages/isomorphic-lib/src/constants.ts` - Constants and mappings
- `/packages/backend-lib/src/destinations/brevo.ts` - Brevo implementation
- `/packages/backend-lib/src/destinations/whatsappCloud.ts` - WhatsApp implementation
- `/packages/backend-lib/src/messaging.ts` - Integration logic
- `/packages/dashboard/src/pages/settings.page.tsx` - UI configuration

### Tests
- `/packages/backend-lib/src/destinations/brevo.test.ts`
- `/packages/backend-lib/src/destinations/whatsappCloud.test.ts`

### Documentation
- `/docs/sms-providers/brevo.md`
- `/docs/sms-providers/whatsapp-cloud.md`

## Deployment Notes

### Prerequisites
- No database migration required
- No downtime expected
- Backward compatible

### Deployment Steps

1. Deploy code changes
2. Restart application servers
3. Verify in logs that new providers are recognized
4. Configure provider credentials in the dashboard
5. Test sending messages

### Monitoring

Watch for:
- New SMS providers appearing in settings
- Successful API calls to Brevo and WhatsApp Cloud
- Error logs mentioning `SmsProviderType.Brevo` or `SmsProviderType.WhatsAppCloud`

## FAQs

**Q: Why don't we need a migration?**
A: The `type` column in `SmsProvider` is a `text` field, not a PostgreSQL ENUM. Text fields accept any string value.

**Q: Will this break existing SMS functionality?**
A: No. Existing providers (Twilio, SignalWire) continue to work unchanged. The new providers are additive only.

**Q: Can we use Brevo/WhatsApp immediately after deployment?**
A: Yes, as soon as the code is deployed, users can configure the new providers in the dashboard.

**Q: What if we want to restrict provider types in the future?**
A: We could add a PostgreSQL CHECK constraint:
```sql
ALTER TABLE "SmsProvider"
ADD CONSTRAINT "SmsProvider_type_check"
CHECK (type IN ('Twilio', 'SignalWire', 'Brevo', 'WhatsAppCloud', 'Test'));
```

However, this would require a migration for future provider additions.

## Conclusion

This is a **zero-downtime, backward-compatible change** that adds new SMS provider types without requiring any database schema modifications. The design using `text` for the provider type allows for flexible addition of new providers in the future.
