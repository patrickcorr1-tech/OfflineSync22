# Notification Hooks

Use /api/notify/event to send push to project participants.

Example payload:
```json
{ "targetUserId": "<uuid>", "title": "Quote sent", "body": "Quote for Project X" }
```

TODO: resolve project participants server-side and broadcast to all assigned users + company contacts.
