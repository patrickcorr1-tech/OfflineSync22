using System;
using System.IO;
using System.Linq;
using System.Windows;
using InvoiceScanner.Core;
using Microsoft.Win32;

namespace InvoiceScanner.Rules;

public partial class RulesWindow : Window
{
    private readonly string _path;

    public RulesWindow(string path)
    {
        InitializeComponent();
        _path = path;
        LoadRules();
    }

    private void LoadRules()
    {
        var rules = RuleLoader.Load(_path);
        InvoiceLabelsBox.Text = string.Join(Environment.NewLine, rules.InvoiceLabels);
        DateLabelsBox.Text = string.Join(Environment.NewLine, rules.DateLabels);
        IgnoreWordsBox.Text = string.Join(Environment.NewLine, rules.IgnoreWords);
        CompanySuffixesBox.Text = string.Join(Environment.NewLine, rules.CompanySuffixes);
    }

    private RuleSet BuildRulesFromUi()
    {
        return new RuleSet
        {
            InvoiceLabels = InvoiceLabelsBox.Text.Split('\n').Select(s => s.Trim()).Where(s => s.Length > 0).ToList(),
            DateLabels = DateLabelsBox.Text.Split('\n').Select(s => s.Trim()).Where(s => s.Length > 0).ToList(),
            IgnoreWords = IgnoreWordsBox.Text.Split('\n').Select(s => s.Trim()).Where(s => s.Length > 0).ToList(),
            CompanySuffixes = CompanySuffixesBox.Text.Split('\n').Select(s => s.Trim()).Where(s => s.Length > 0).ToList()
        };
    }

    private void LoadOcr_Click(object sender, RoutedEventArgs e)
    {
        var dialog = new OpenFileDialog
        {
            Filter = "Text Files (*.txt)|*.txt|All Files (*.*)|*.*"
        };

        if (dialog.ShowDialog() == true)
        {
            OcrInputBox.Text = File.ReadAllText(dialog.FileName);
        }
    }

    private void TestOcr_Click(object sender, RoutedEventArgs e)
    {
        var rules = BuildRulesFromUi();
        var parser = new InvoiceParser(rules);
        var data = parser.Parse(OcrInputBox.Text ?? string.Empty);

        TestResultText.Text = $"Supplier: {data.Supplier} | Invoice: {data.InvoiceNumber} | Date: {data.Date}";
    }

    private void Save_Click(object sender, RoutedEventArgs e)
    {
        var rules = BuildRulesFromUi();

        var json = System.Text.Json.JsonSerializer.Serialize(rules, new System.Text.Json.JsonSerializerOptions
        {
            WriteIndented = true
        });

        Directory.CreateDirectory(Path.GetDirectoryName(_path)!);
        File.WriteAllText(_path, json);
        DialogResult = true;
        Close();
    }

    private void Cancel_Click(object sender, RoutedEventArgs e)
    {
        Close();
    }
}
