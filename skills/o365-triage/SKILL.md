---
name: o365-triage
description: Triage and resolve common Microsoft 365 user issues (login failures, MFA problems, Outlook/email sync, mailbox access, licensing, password resets, account lockouts). Use when asked to diagnose or fix Office 365/Microsoft 365 user access, Outlook connectivity, or mailbox issues in a small/medium business environment.
---

# O365 Triage

## Overview
Provide a fast, consistent workflow for diagnosing and resolving Microsoft 365 user issues with minimal back-and-forth.

## Workflow Decision Tree

### Step 1 — Capture essentials (ask first)
Collect these before diving in:
- Affected user UPN/email, device type (Windows/macOS/mobile), network (office/home/VPN)
- Exact error message/code + when it occurs (login vs Outlook open vs send/receive)
- Scope: single user vs multiple users
- Recent changes: password reset, MFA change, new device, license change

### Step 2 — Check service health and scope
- If multiple users or widespread symptoms: check Microsoft 365 Service Health first.
- If only one user: continue to user-specific checks.

### Step 3 — Account status & license
In Microsoft 365 Admin Center / Entra ID:
- Verify account enabled, not blocked, not deleted
- Check password reset status and sign-in blocked flags
- Confirm license assigned for the workload (Exchange Online, Office apps)

### Step 4 — Sign-in / MFA issues
Use Entra ID sign-in logs:
- Look for failure reason (invalid password, MFA required, conditional access, device risk)
- If MFA is broken: reset MFA, require re-registration, or bypass temporarily if approved
- If conditional access blocks: confirm device compliance/OS, location/IP, or require approval

### Step 5 — Outlook / mailbox issues
- Verify mailbox exists and is healthy (Exchange Admin Center)
- Check quota, mailbox size, and recent migration status
- For Outlook client issues:
  - Try webmail (OWA) to isolate client vs service
  - If OWA works: rebuild Outlook profile, clear cached credentials, re-add account
  - If OWA fails: treat as account or mailbox issue

### Step 6 — Send/receive or sync issues
- Check for stuck items in Outbox, large attachments, or rules causing loops
- Verify DNS (MX, Autodiscover) if multiple users affected
- For mobile: remove/re-add account, ensure modern auth enabled

### Step 7 — Resolution & confirmation
- State the fix applied and confirm user can sign in/send/receive
- Document the root cause and any follow-up needed

## Common Fixes (quick list)
- Password reset + force sign-out
- Reset MFA/require re-registration
- Assign missing license
- Rebuild Outlook profile / clear credentials
- Temporarily bypass conditional access (with approval)

## Escalation
If unresolved or policy-related, gather logs/screenshots and escalate to the help desk with:
- User UPN
- Error codes/messages
- Sign-in log entries
- Steps already attempted
