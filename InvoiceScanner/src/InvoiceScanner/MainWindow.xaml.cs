using System;
using System.Threading.Tasks;
using System.Windows;
using InvoiceScanner.Core;

namespace InvoiceScanner;

public partial class MainWindow : Window
{
    private readonly SyncController _sync;

    public MainWindow()
    {
        InitializeComponent();
        _sync = new SyncController(AppendLog);
    }

    public void StartSync() => _ = RunSync();

    private async void SyncNow_Click(object sender, RoutedEventArgs e)
    {
        await RunSync();
    }

    private async Task RunSync()
    {
        SyncButton.IsEnabled = false;
        AppendLog($"[{DateTime.Now:T}] Sync started...");
        try
        {
            var result = await _sync.RunOnceAsync();
            AppendLog($"[{DateTime.Now:T}] Done. {result.Processed} processed, {result.Skipped} skipped.");
        }
        catch (Exception ex)
        {
            AppendLog($"[{DateTime.Now:T}] ERROR: {ex.Message}");
        }
        finally
        {
            SyncButton.IsEnabled = true;
        }
    }

    private void Rules_Click(object sender, RoutedEventArgs e)
    {
        var path = System.IO.Path.Combine(AppContext.BaseDirectory, "Rules", "rules.json");
        var window = new Rules.RulesWindow(path) { Owner = this };
        window.ShowDialog();
    }

    private void Hide_Click(object sender, RoutedEventArgs e)
    {
        Hide();
    }

    private void AppendLog(string message)
    {
        Dispatcher.Invoke(() =>
        {
            LogBox.AppendText(message + Environment.NewLine);
            LogBox.ScrollToEnd();
        });
    }
}
