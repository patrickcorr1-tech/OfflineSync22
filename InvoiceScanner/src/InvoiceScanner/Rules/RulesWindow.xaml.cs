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
    private System.Threading.CancellationTokenSource? _ocrCts;

    public RulesWindow(string path)
    {
        InitializeComponent();
        _path = path;
        LoadRules();
        CancelOcrButton.IsEnabled = false;
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

    private async void LoadOcr_Click(object sender, RoutedEventArgs e)
    {
        var dialog = new OpenFileDialog
        {
            Filter = "Text Files (*.txt)|*.txt|PDF Files (*.pdf)|*.pdf|All Files (*.*)|*.*"
        };

        if (dialog.ShowDialog() == true)
        {
            var ext = Path.GetExtension(dialog.FileName).ToLowerInvariant();
            if (ext == ".pdf")
            {
                TestResultText.Text = "Running OCR...";
                OcrProgress.Value = 0;
                CancelOcrButton.IsEnabled = true;
                Spinner.Visibility = Visibility.Visible;
                StartSpinner();
                _ocrCts = new System.Threading.CancellationTokenSource();

                try
                {
                    var ocr = new OcrEngine();
                    var progress = new Progress<int>(p => OcrProgress.Value = p);
                    var text = await ocr.ExtractTextFromPdfAsync(dialog.FileName, progress, _ocrCts.Token);
                    OcrInputBox.Text = text;
                    TestResultText.Text = "OCR loaded.";
                }
                catch (OperationCanceledException)
                {
                    TestResultText.Text = "OCR canceled.";
                }
                finally
                {
                    CancelOcrButton.IsEnabled = false;
                    _ocrCts = null;
                    StopSpinner();
                    Spinner.Visibility = Visibility.Collapsed;
                }
            }
            else
            {
                OcrInputBox.Text = File.ReadAllText(dialog.FileName);
            }
        }
    }

    private void TestOcr_Click(object sender, RoutedEventArgs e)
    {
        var rules = BuildRulesFromUi();
        var parser = new InvoiceParser(rules);
        var data = parser.Parse(OcrInputBox.Text ?? string.Empty);

        TestResultText.Text = $"Supplier: {data.Supplier} | Invoice: {data.InvoiceNumber} | Date: {data.Date}";
    }

    private void CancelOcr_Click(object sender, RoutedEventArgs e)
    {
        _ocrCts?.Cancel();
    }

    private void StartSpinner()
    {
        var animation = new System.Windows.Media.Animation.DoubleAnimation
        {
            From = 0,
            To = 360,
            Duration = TimeSpan.FromSeconds(1),
            RepeatBehavior = System.Windows.Media.Animation.RepeatBehavior.Forever
        };
        SpinnerRotate.BeginAnimation(System.Windows.Media.RotateTransform.AngleProperty, animation);
    }

    private void StopSpinner()
    {
        SpinnerRotate.BeginAnimation(System.Windows.Media.RotateTransform.AngleProperty, null);
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
