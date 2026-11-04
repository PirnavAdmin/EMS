# EMS multi-sender email configuration (backend add-on)

## What changed
- Added sender-account storage and purpose mapping models/tables.
- Added SuperAdmin-only APIs under `/api/Settings` to manage sender accounts and purpose mappings.
- Added purpose-based email sending only for demo request notification and demo request replies.
- Existing `IEmailService` methods and their global sender behavior are unchanged.
- `GET /api/Settings/email` retains the existing fields but returns an empty `SenderPassword` so the secret is not exposed. An empty password in `PUT /api/Settings/email` now retains the existing global password.

## 1. Apply additive database SQL
Run `Database/EmailSenderAccounts_Additive.sql` against the EMS database configured in `ConnectionStrings:DefaultConnection`. It creates only two new tables and does not modify or delete existing tables or records.

## 2. Protect Data Protection keys
Sender-account passwords are stored encrypted using ASP.NET Core Data Protection. Configure `DataProtection:KeysPath` (or environment variable `DataProtection__KeysPath`) to a persistent, access-restricted directory/volume shared by all instances of this application. Back up and protect that key ring. If keys are lost or changed, previously encrypted sender passwords cannot be decrypted. Do not commit the key ring or sender passwords to source control.

## 3. Configure the contact sender
Use an authenticated SuperAdmin token. Create an account using `POST /api/Settings/email-senders`:

```json
{
  "senderEmail": "contact@peoplehrsync.com",
  "senderPassword": "ENTER_THE_MAILBOX_PASSWORD_SECURELY",
  "smtpHost": "YOUR_MAIL_PROVIDER_SMTP_HOST",
  "smtpPort": 587,
  "enableSSL": true,
  "displayName": "PeopleHrsync",
  "isActive": true
}
```

Use the actual SMTP host/port/TLS settings supplied by the email provider; they are intentionally not guessed here. Do not put the password in code, a checked-in JSON file, screenshots, or logs. Send it only over HTTPS through the authenticated settings UI/API.

The response contains no password. It includes `hasPassword` only.

## 4. Map purposes
After retrieving the account ID from `GET /api/Settings/email-senders`, call `PUT /api/Settings/email-purpose-mappings` twice, using the account ID created above:

```json
{ "purpose": "DemoRequestNotification", "senderAccountId": 1 }
```

```json
{ "purpose": "DemoRequestReply", "senderAccountId": 1 }
```

The ID above is an example only; use the actual returned ID. Optional mapping `General` can be configured for future purpose-based sends. Existing EMS email features continue to use the existing `emailsettings` global sender and are not switched by these mappings.

## Added endpoints
- `GET /api/Settings/email-senders`
- `POST /api/Settings/email-senders`
- `PUT /api/Settings/email-senders/{id}`
- `GET /api/Settings/email-purpose-mappings`
- `PUT /api/Settings/email-purpose-mappings`

These endpoints require the `SuperAdmin` role. Existing endpoints and routes remain.
