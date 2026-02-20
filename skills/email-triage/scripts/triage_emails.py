#!/usr/bin/env python3
"""
Email Triage & Follow-up Hunter
Scans inbox for emails needing replies and drafts follow-ups for stale threads.
"""

import subprocess
import json
import re
import os
from datetime import datetime, timedelta
from dataclasses import dataclass, asdict
from typing import List, Optional
import argparse

@dataclass
class EmailThread:
    id: str
    subject: str
    sender: str
    date: datetime
    flags: List[str]
    folder: str
    snippet: str
    needs_reply: bool = False
    days_stale: int = 0
    suggested_action: str = ""

class EmailTriage:
    def __init__(self, account: str = "default", stale_days: int = 2):
        self.account = account
        self.stale_days = stale_days
        self.threads: List[EmailThread] = []
        
    def _run_himalaya(self, args: List[str]) -> dict:
        """Execute himalaya CLI command and return JSON output."""
        cmd = ["himalaya", "-o", "json"] + args
        if self.account != "default":
            cmd.extend(["-a", self.account])
        
        try:
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=60)
            if result.returncode != 0:
                print(f"Himalaya error: {result.stderr}")
                return {}
            return json.loads(result.stdout) if result.stdout else {}
        except Exception as e:
            print(f"Command failed: {e}")
            return {}
    
    def _parse_date(self, date_str: str) -> datetime:
        """Parse various date formats from emails."""
        formats = [
            "%Y-%m-%d %H:%M:%S",
            "%a, %d %b %Y %H:%M:%S %z",
            "%d %b %Y %H:%M:%S %z",
        ]
        for fmt in formats:
            try:
                return datetime.strptime(date_str.split('(')[0].strip(), fmt)
            except ValueError:
                continue
        return datetime.now()
    
    def _needs_reply(self, subject: str, flags: List[str], snippet: str) -> bool:
        """Determine if an email likely needs a reply."""
        reply_indicators = [
            "please reply", "awaiting your response", "let me know",
            "thoughts?", "feedback", "review", "approve", "confirm",
            "re:", "fw:", "fwd:", "question", "help", "urgent"
        ]
        
        # Check if already replied (flags contain 'R' or 'S' for seen)
        if 'R' in flags or 'A' in flags:  # Replied or Answered
            return False
            
        subject_lower = subject.lower()
        snippet_lower = snippet.lower()
        
        # Check for reply indicators
        for indicator in reply_indicators:
            if indicator in subject_lower or indicator in snippet_lower:
                return True
        
        # Check for question marks
        if '?' in snippet or '?' in subject:
            return True
            
        return False
    
    def scan_inbox(self, folder: str = "INBOX", limit: int = 100) -> List[EmailThread]:
        """Scan inbox for emails needing replies."""
        print(f"Scanning {folder} for emails needing replies...")
        
        # Get emails from folder
        result = self._run_himalaya(["envelope", "list", "-f", folder, "-s", str(limit)])
        
        if not result or "response" not in result:
            print("No emails found or error fetching emails.")
            return []
        
        emails = result["response"]
        cutoff_date = datetime.now() - timedelta(days=self.stale_days)
        
        for email in emails:
            try:
                date = self._parse_date(email.get("date", ""))
                flags = list(email.get("flags", ""))
                
                thread = EmailThread(
                    id=str(email.get("id", "")),
                    subject=email.get("subject", "(No Subject)"),
                    sender=email.get("from", {}).get("addr", "Unknown"),
                    date=date,
                    flags=flags,
                    folder=folder,
                    snippet=email.get("snippet", "")[:200]
                )
                
                # Determine if needs reply
                thread.needs_reply = self._needs_reply(
                    thread.subject, flags, thread.snippet
                )
                
                # Calculate staleness
                if date < cutoff_date:
                    thread.days_stale = (datetime.now() - date).days
                
                if thread.needs_reply and thread.days_stale > 0:
                    thread.suggested_action = self._suggest_action(thread)
                    self.threads.append(thread)
                    
            except Exception as e:
                print(f"Error processing email: {e}")
                continue
        
        # Sort by staleness (oldest first)
        self.threads.sort(key=lambda x: x.days_stale, reverse=True)
        return self.threads
    
    def _suggest_action(self, thread: EmailThread) -> str:
        """Suggest follow-up action based on email content."""
        subject_lower = thread.subject.lower()
        snippet_lower = thread.snippet.lower()
        
        if "invoice" in subject_lower or "payment" in subject_lower:
            return "Follow up on payment/invoice status"
        elif "meeting" in subject_lower or "call" in subject_lower:
            return "Propose meeting time or confirm attendance"
        elif "proposal" in subject_lower or "quote" in subject_lower:
            return "Follow up on proposal/quote status"
        elif "review" in subject_lower:
            return "Provide feedback or review"
        elif "question" in subject_lower or "?" in thread.snippet:
            return "Answer questions posed"
        else:
            return "General follow-up and status update"
    
    def draft_follow_up(self, thread: EmailThread, tone: str = "professional") -> str:
        """Draft a follow-up email for a stale thread."""
        templates = {
            "professional": self._professional_template,
            "friendly": self._friendly_template,
            "urgent": self._urgent_template
        }
        
        template_func = templates.get(tone, self._professional_template)
        return template_func(thread)
    
    def _professional_template(self, thread: EmailThread) -> str:
        return f"""Subject: Re: {thread.subject}

Hi there,

I hope this message finds you well. I wanted to follow up on my previous email regarding {thread.subject.lower()}.

I understand things can get busy, but I wanted to make sure this didn't fall through the cracks. {thread.suggested_action}.

Please let me know if you need any additional information from me.

Best regards,
[Your Name]"""
    
    def _friendly_template(self, thread: EmailThread) -> str:
        return f"""Subject: Re: {thread.subject}

Hey!

Just circling back on this — wanted to make sure you saw my last message about {thread.subject.lower()}.

No rush if you're swamped, but would love to hear back when you get a chance!

Thanks,
[Your Name]"""
    
    def _urgent_template(self, thread: EmailThread) -> str:
        return f"""Subject: Re: {thread.subject} - Follow-up Required

Hi,

I'm following up on my previous email from {thread.days_stale} days ago regarding {thread.subject.lower()}.

This requires your attention. {thread.suggested_action}.

Please respond by end of day if possible.

Thanks,
[Your Name]"""
    
    def generate_report(self, output_path: Optional[str] = None) -> str:
        """Generate a markdown report of all stale threads."""
        if not self.threads:
            return "# Email Triage Report\n\n✅ No stale emails needing replies found!"
        
        report = ["# Email Triage Report\n"]
        report.append(f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M')}\n")
        report.append(f"Found **{len(self.threads)}** emails needing follow-up\n")
        
        for i, thread in enumerate(self.threads, 1):
            report.append(f"\n## {i}. {thread.subject}")
            report.append(f"- **From:** {thread.sender}")
            report.append(f"- **Stale for:** {thread.days_stale} days")
            report.append(f"- **Suggested Action:** {thread.suggested_action}")
            report.append(f"- **Snippet:** {thread.snippet[:150]}...")
            report.append(f"\n### Draft Follow-up:\n")
            report.append("```")
            report.append(self.draft_follow_up(thread, "professional"))
            report.append("```")
            report.append("\n---\n")
        
        report_text = "\n".join(report)
        
        if output_path:
            with open(output_path, 'w') as f:
                f.write(report_text)
            print(f"Report saved to: {output_path}")
        
        return report_text


def main():
    parser = argparse.ArgumentParser(description="Email Triage & Follow-up Hunter")
    parser.add_argument("--account", default="default", help="Himalaya account name")
    parser.add_argument("--stale-days", type=int, default=2, help="Days before considering stale")
    parser.add_argument("--folder", default="INBOX", help="Folder to scan")
    parser.add_argument("--limit", type=int, default=100, help="Max emails to scan")
    parser.add_argument("--output", "-o", help="Output file for report")
    parser.add_argument("--tone", default="professional", choices=["professional", "friendly", "urgent"])
    
    args = parser.parse_args()
    
    triage = EmailTriage(account=args.account, stale_days=args.stale_days)
    triage.scan_inbox(folder=args.folder, limit=args.limit)
    report = triage.generate_report(output_path=args.output)
    print(report)


if __name__ == "__main__":
    main()
