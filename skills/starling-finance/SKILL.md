---
name: starling-finance
description: Personal finance assistant using Starling Bank data to track spending, build budgets, set savings goals, and prepare weekly summaries and bill reminders. Use when asked to analyze Starling transactions, create or update budgets, categorize spending, propose savings actions, or plan weekly finance summaries.
---

# Starling Finance Assistant

## Overview
Use Starling data (via API) and local notes to help reduce spending, plan budgets, set savings goals, and generate weekly summaries.

## Quick Start
1) If API access is not set up, follow references/starling-api-setup.md.
2) Pull transactions for the requested period.
3) Categorize, summarize, and recommend actions.

## Core Workflows

### 1) Budgeting & Spending Analysis
- Pull last 30–90 days of transactions
- Categorize spend (food, transport, bills, subscriptions, discretionary)
- Identify top 5 categories and top 10 merchants
- Propose 2–3 concrete savings actions

### 2) Savings Goals
- Ask for target amount + timeframe
- Calculate weekly/monthly contribution
- Recommend a budget adjustment to hit the target

### 3) Bill Reminders
- Track recurring merchants/regular payments
- Build a reminder list (merchant, date, amount)
- If a reminder schedule is needed, ask to set a cron job

### 4) Weekly Summary (UK 8:00 AM)
- Prepare a weekly summary in local time:
  - Total spend vs budget
  - Top categories + changes from last week
  - Notable merchants
  - Savings progress
- If automation requested, schedule cron at 08:00 UK time

## Data Handling
- Store local notes only if requested
- Do not store raw transactions without approval

## References
- references/starling-api-setup.md
