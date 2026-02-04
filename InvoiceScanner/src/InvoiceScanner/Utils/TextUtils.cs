using System;
using System.Globalization;
using System.Text.RegularExpressions;

namespace InvoiceScanner.Utils;

public static class TextUtils
{
    public static string Clean(string input)
    {
        var normalized = input.Replace("\r", "\n");
        normalized = Regex.Replace(normalized, "\n+", "\n");
        return normalized;
    }

    public static string NormalizeName(string input)
    {
        var cleaned = Regex.Replace(input, "[^A-Za-z0-9 &.-]", "");
        return CultureInfo.CurrentCulture.TextInfo.ToTitleCase(cleaned.ToLower());
    }

    public static string NormalizeDate(string raw)
    {
        raw = raw.Trim();

        if (RegexPatterns.Date.IsMatch(raw))
        {
            return raw.Replace('/', '-');
        }

        var iso = RegexPatterns.DateIso.Match(raw);
        if (iso.Success)
        {
            var yyyy = iso.Groups[1].Value;
            var mm = iso.Groups[2].Value;
            var dd = iso.Groups[3].Value;
            return $"{dd}-{mm}-{yyyy}";
        }

        var text = RegexPatterns.DateText.Match(raw);
        if (text.Success)
        {
            var dd = text.Groups[1].Value.PadLeft(2, '0');
            var mon = text.Groups[2].Value;
            var yyyy = text.Groups[3].Value;
            if (DateTime.TryParseExact($"{dd} {mon} {yyyy}", "dd MMM yyyy", CultureInfo.InvariantCulture,
                    DateTimeStyles.None, out var dt))
            {
                return dt.ToString("dd-MM-yyyy");
            }
        }

        return raw;
    }
}
