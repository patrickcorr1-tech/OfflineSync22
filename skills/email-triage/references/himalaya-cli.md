# Himalaya CLI Reference

Quick reference for using Himalaya email CLI with this skill.

## Basic Commands

### List Accounts
```bash
himalaya account list
```

### List Emails
```bash
himalaya list -f INBOX -s 50
himalaya list -f "Sent Items" -s 20
```

### Read Email
```bash
himalaya read 12345
himalaya read 12345 -t plain
```

### Search Emails
```bash
himalaya search "from:client@example.com" -f INBOX
himalaya search "subject:invoice" -f INBOX
```

### Send Email
```bash
himalaya write to@example.com --subject "Follow-up" --body "Message here"
```

## Output Formats

Always use JSON for scripting:
```bash
himalaya -o json list -f INBOX
```

## Common Flags

| Flag | Description |
|------|-------------|
| `-a, --account` | Specify account name |
| `-f, --folder` | Specify folder |
| `-s, --size` | Limit results |
| `-o, --output` | Output format (json, plain) |
| `-t, --mime-type` | MIME type for reading |

## Email Flags Reference

| Flag | Meaning |
|------|---------|
| `S` | Seen/Read |
| `R` | Replied |
| `A` | Answered |
| `F` | Flagged/Starred |
| `D` | Draft |

## Configuration

Config file: `~/.config/himalaya/config.toml`

Example for Office 365:
```toml
[accounts.default]
default = true
email = "your@email.com"
display-name = "Your Name"

backend.type = "imap"
backend.host = "outlook.office365.com"
backend.port = 993
backend.login = "your@email.com"
backend.auth.type = "oauth2"
# or password auth for basic setups

message.send.backend.type = "smtp"
message.send.backend.host = "smtp.office365.com"
message.send.backend.port = 587
message.send.backend.login = "your@email.com"
```

## Troubleshooting

### Connection Issues
```bash
# Test connection
himalaya account configure

# Check logs
himalaya -l debug list
```

### OAuth2 Setup for Office 365
1. Register app in Azure AD
2. Get client ID and secret
3. Run: `himalaya account configure`
4. Follow OAuth flow
