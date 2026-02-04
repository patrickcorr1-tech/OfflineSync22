using System.Text.RegularExpressions;

namespace InvoiceScanner.Utils;

public static class RegexPatterns
{
    public static readonly Regex InvoiceNumber = new(
        @"(?:Invoice\s*(?:No|#|Number)?\s*[:\-]?\s*)([A-Z0-9\-\/]+)|(?:Inv[.\s]*#?\s*)([A-Z0-9\-\/]+)|(?:Document\s*No\s*[:\-]?\s*)([A-Z0-9\-\/]+)|(?:Reference\s*[:\-]?\s*)([A-Z0-9\-\/]+)|(?:Bill\s*No\s*[:\-]?\s*)([A-Z0-9\-\/]+)",
        RegexOptions.IgnoreCase | RegexOptions.Compiled);

    public static readonly Regex Date = new(
        @"\b(\d{2})[\/\-](\d{2})[\/\-](\d{4})\b",
        RegexOptions.Compiled);

    public static readonly Regex DateIso = new(
        @"\b(\d{4})[\/\-](\d{2})[\/\-](\d{2})\b",
        RegexOptions.Compiled);

    public static readonly Regex DateText = new(
        @"\b(\d{1,2})\s*(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)[a-z]*\s*(\d{4})\b",
        RegexOptions.IgnoreCase | RegexOptions.Compiled);

    public static readonly Regex InvoiceDateLabel = new(
        @"invoice\s*date\s*[:\-]?\s*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}|\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2}|\d{1,2}\s*[A-Za-z]{3,9}\s*\d{4})",
        RegexOptions.IgnoreCase | RegexOptions.Compiled);

    public static readonly Regex DueDateLabel = new(
        @"due\s*date\s*[:\-]?\s*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}|\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2}|\d{1,2}\s*[A-Za-z]{3,9}\s*\d{4})",
        RegexOptions.IgnoreCase | RegexOptions.Compiled);

    public static readonly Regex IgnoreWords = new(
        @"\b(invoice|tax|total|vat|date|amount|due|paid|balance|account|statement|bank|swift|iban|address)\b",
        RegexOptions.IgnoreCase | RegexOptions.Compiled);

    public static readonly Regex CompanySuffix = new(
        @"\b(ltd|limited|llc|inc|co|company|gmbh|plc|pty|sarl|bv|ag|oy|aps|as|kg|kgaa|nv)\b",
        RegexOptions.IgnoreCase | RegexOptions.Compiled);
}
