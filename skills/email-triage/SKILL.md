---
name: email-triage
description: Automated email triage and follow-up drafting for Office 365/IMAP accounts. Scans inbox for emails needing replies (flagged, questions, requests) and drafts follow-up messages for stale threads (>48h old). Use when managing email backlog, tracking "waiting on" responses, or preparing weekly email reviews. Integrates with himalaya CLI.
---

# Email Triage & Follow-up Hunter

Automated email scanning and follow-up drafting to keep your inbox under control and ensure no important threads slip through the cracks.

## What This Skill Does

1. **Scans your inbox** for emails likely needing replies
2. **Detects stale threads** (>48 hours old with no response)
3. **Categorizes** by type (invoices, meetings, proposals, questions)
4. **Drafts follow-up emails** with appropriate tone
5. **Generates a report** for your review

## Quick Start

### Run Triage Scan

```bash
python3 scripts/triage_emails.py --stale-days 2 --output report.md
```

### Review and Customize

Read the generated `report.md` and:
- Review flagged emails
- Edit draft follow-ups as needed
- Decide which to send

### Send via Himalaya (optional)

```bash
# Copy draft from report, then:
himalaya write recipient@example.com --subject "Re: Subject" --body "Your message"
```

## How It Works

### Detection Logic

Emails are flagged as "needs reply" if they have:
- Question marks in subject or body
- Keywords: "please reply", "awaiting response", "let me know", "feedback", "review"
- No reply/answered flags set
- Subject prefixes: "Re:", "Fw:", "Fwd:"

### Staleness Calculation

Emails older than `--stale-days` (default: 2) are marked stale.

### Categorization

| Type | Keywords | Suggested Action |
|------|----------|------------------|
| Invoice/Payment | "invoice", "payment" | Follow up on payment status |
| Meeting | "meeting", "call" | Propose time or confirm |
| Proposal | "proposal", "quote" | Follow up on status |
| Review | "review" | Provide feedback |
| Question | "?" in body | Answer questions |

## Command Reference

```bash
# Basic scan
python3 scripts/triage_emails.py

# Scan sent folder for "waiting on" tracking
python3 scripts/triage_emails.py --folder "Sent Items" --stale-days 7

# Friendly tone for warm leads
python3 scripts/triage_emails.py --tone friendly --output warm-leads.md

# Urgent tone for overdue items
python3 scripts/triage_emails.py --tone urgent --stale-days 5

# Specific account (from himalaya config)
python3 scripts/triage_emails.py --account work
```

## Report Output

The generated markdown report includes:
1. **Summary** — count of stale emails
2. **Email details** — sender, subject, days stale
3. **Suggested action** — what type of follow-up needed
4. **Draft message** — ready-to-use follow-up text

## Prerequisites

1. **Himalaya CLI installed and configured**
   ```bash
   himalaya --version  # Verify installation
   himalaya account list  # Verify account setup
   ```

2. **Python 3.7+**

3. **IMAP access enabled** for your email provider

## Setup for Office 365

See [references/himalaya-cli.md](references/himalaya-cli.md) for detailed setup:

```bash
# Install himalaya
cargo install himalaya

# Configure
himalaya account configure

# Test
himalaya list -f INBOX -s 5
```

## Email Templates

See [references/email-templates.md](references/email-templates.md) for:
- Professional follow-ups
- Friendly check-ins
- Urgent requests
- Invoice/payment chasing
- Meeting scheduling
- Final attempt messages

## Workflow Integration

### Weekly Review (Recommended)

Run every Wednesday morning:
```bash
python3 scripts/triage_emails.py --output ~/email-reports/weekly-$(date +%F).md
```

### Daily Quick Check
```bash
python3 scripts/triage_emails.py --stale-days 1 --limit 20
```

### Monthly Deep Clean
```bash
# Scan sent items for threads you forgot to follow up on
python3 scripts/triage_emails.py --folder "Sent Items" --stale-days 14
```

## Troubleshooting

### No emails found
- Verify himalaya config: `himalaya account configure`
- Check folder name: `himalaya folder list`
- Try larger limit: `--limit 500`

### Wrong emails flagged
- Adjust detection in script's `_needs_reply()` method
- Add custom keywords for your workflow

### Date parsing errors
- Script handles common formats; modify `_parse_date()` for edge cases

## Customization

### Add Your Keywords
Edit `scripts/triage_emails.py`, line ~55:
```python
reply_indicators = [
    # ... existing keywords ...
    "your-custom-term",
]
```

### Custom Templates
Modify template methods in script:
- `_professional_template()`
- `_friendly_template()`
- `_urgent_template()`

Or use reference templates in [references/email-templates.md](references/email-templates.md)

## Security Notes

- Script runs locally, no data leaves your machine
- Uses himalaya's existing authentication
- Does not auto-send emails (requires manual review)
- No email content stored permanently
