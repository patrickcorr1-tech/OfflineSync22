using System.Linq;
using InvoiceScanner.Models;
using InvoiceScanner.Utils;

namespace InvoiceScanner.Core;

public class InvoiceParser
{
    public InvoiceData Parse(string text)
    {
        var clean = TextUtils.Clean(text);
        var invoice = RegexPatterns.InvoiceNumber.Match(clean);
        var date = ExtractDate(clean);
        var supplier = GuessSupplier(clean);

        return new InvoiceData
        {
            Supplier = supplier,
            InvoiceNumber = ExtractInvoiceNumber(invoice),
            Date = date
        };
    }

    private static string ExtractInvoiceNumber(System.Text.RegularExpressions.Match match)
    {
        if (!match.Success) return string.Empty;
        for (int i = 1; i < match.Groups.Count; i++)
        {
            if (match.Groups[i].Success && !string.IsNullOrWhiteSpace(match.Groups[i].Value))
                return match.Groups[i].Value.Trim();
        }
        return string.Empty;
    }

    private static string ExtractDate(string clean)
    {
        var labeled = RegexPatterns.InvoiceDateLabel.Match(clean);
        if (labeled.Success)
        {
            return TextUtils.NormalizeDate(labeled.Groups[1].Value);
        }

        var date = RegexPatterns.Date.Match(clean);
        if (date.Success) return TextUtils.NormalizeDate(date.Value);

        var iso = RegexPatterns.DateIso.Match(clean);
        if (iso.Success) return TextUtils.NormalizeDate(iso.Value);

        var text = RegexPatterns.DateText.Match(clean);
        if (text.Success) return TextUtils.NormalizeDate(text.Value);

        return string.Empty;
    }

    private string GuessSupplier(string text)
    {
        var lines = text.Split('\n')
            .Select(l => l.Trim())
            .Where(l => l.Length > 3)
            .Where(l => !RegexPatterns.IgnoreWords.IsMatch(l))
            .Take(12)
            .ToList();

        if (lines.Count == 0) return string.Empty;

        var candidates = lines
            .Select(l => new
            {
                Line = l,
                Upper = l.Count(char.IsUpper),
                HasSuffix = RegexPatterns.CompanySuffix.IsMatch(l),
                Length = l.Length
            })
            .OrderByDescending(c => c.HasSuffix)
            .ThenByDescending(c => c.Upper)
            .ThenByDescending(c => c.Length)
            .ToList();

        return TextUtils.NormalizeName(candidates.First().Line);
    }
}
