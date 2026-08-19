using Microsoft.UI;
using Microsoft.UI.Windowing;
using Microsoft.UI.Xaml;
using Microsoft.UI.Xaml.Controls;
using Microsoft.UI.Xaml.Media.Imaging;
using Windows.Graphics;
using Windows.Storage;
using Windows.Storage.Pickers;
using Windows.System;
using WinRT.Interop;

namespace PaperBanana.WinUI;

public sealed partial class MainWindow : Window
{
    private readonly ModelCatalog _catalog;
    private readonly PaperBananaApiClient _apiClient = new();
    private readonly Dictionary<string, string> _apiKeys = new(StringComparer.OrdinalIgnoreCase);
    private readonly DispatcherTimer _pollingTimer = new();

    private BackendHealth? _health;
    private CurrentUser? _currentUser;
    private PaperBananaJob? _currentJob;
    private string _currentJobId = "";

    public MainWindow()
    {
        InitializeComponent();
        _catalog = ModelCatalogLoader.Load();
        ConfigureWindow();
        BindStaticOptions();
        SelectDefaultValues();
        _pollingTimer.Interval = TimeSpan.FromSeconds(3);
        _pollingTimer.Tick += PollingTimer_Tick;
        _ = BootstrapAsync();
    }

    private async Task BootstrapAsync()
    {
        await RefreshHealthAsync();
        await RefreshSessionAsync();
    }

    private void ConfigureWindow()
    {
        var hwnd = WindowNative.GetWindowHandle(this);
        var windowId = Win32Interop.GetWindowIdFromWindow(hwnd);
        var appWindow = AppWindow.GetFromWindowId(windowId);
        var iconPath = Path.Combine(AppContext.BaseDirectory, "Assets", "icon.ico");
        if (File.Exists(iconPath)) appWindow.SetIcon(iconPath);
        appWindow.Resize(new SizeInt32(1440, 900));
    }

    private void BindStaticOptions()
    {
        ProviderComboBox.ItemsSource = _catalog.Providers;
        CategoryComboBox.ItemsSource = _catalog.InfographicCategories;
        ExamplesItems.ItemsSource = _catalog.QuickStartExamples;
        PipelineComboBox.ItemsSource = _catalog.PipelineOptions;
        RetrievalComboBox.ItemsSource = _catalog.RetrievalOptions;
        AspectRatioComboBox.ItemsSource = _catalog.AspectRatioOptions;
        CandidateComboBox.ItemsSource = _catalog.CandidateOptions;
        CriticRoundComboBox.ItemsSource = _catalog.CriticRoundOptions;
    }

    private void SelectDefaultValues()
    {
        ProviderComboBox.SelectedItem = _catalog.DefaultProvider;
        CategoryComboBox.SelectedIndex = 0;
        PipelineComboBox.SelectedIndex = 0;
        RetrievalComboBox.SelectedIndex = 0;
        AspectRatioComboBox.SelectedIndex = 0;
        CandidateComboBox.SelectedIndex = 0;
        CriticRoundComboBox.SelectedIndex = 1;
        MethodContentBox.Text = _catalog.SampleMethod;
        CaptionBox.Text = "图 1：所提出的多智能体学术图示生成框架总览。";
        UpdateAdvancedVisibility();
        ShowGeneratePanel();
    }

    private ProviderOption SelectedProvider => ProviderComboBox.SelectedItem as ProviderOption ?? _catalog.DefaultProvider;
    private ModelOption SelectedMainModel => MainModelComboBox.SelectedItem as ModelOption ?? SelectedProvider.MainModels.First();
    private ModelOption SelectedImageModel => ImageModelComboBox.SelectedItem as ModelOption ?? SelectedProvider.ImageModels.First();
    private CatalogOption SelectedCategory => CategoryComboBox.SelectedItem as CatalogOption ?? _catalog.InfographicCategories[0];
    private CatalogOption SelectedPipeline => PipelineComboBox.SelectedItem as CatalogOption ?? _catalog.PipelineOptions[0];
    private CatalogOption SelectedRetrieval => RetrievalComboBox.SelectedItem as CatalogOption ?? _catalog.RetrievalOptions[0];
    private CatalogOption SelectedAspectRatio => AspectRatioComboBox.SelectedItem as CatalogOption ?? _catalog.AspectRatioOptions[0];
    private CatalogOption SelectedCandidateCount => CandidateComboBox.SelectedItem as CatalogOption ?? _catalog.CandidateOptions[0];
    private CatalogOption SelectedCriticRounds => CriticRoundComboBox.SelectedItem as CatalogOption ?? _catalog.CriticRoundOptions[1];
    private bool IsAdvancedMode => AdvancedModeRadio.IsChecked == true;
    private string ApiBase => PaperBananaApiClient.DefaultApiBase;

    private void ProviderComboBox_SelectionChanged(object sender, SelectionChangedEventArgs e)
    {
        if (MainModelComboBox is null || ImageModelComboBox is null || ApiKeyBox is null || GuideText is null) return;
        var provider = SelectedProvider;
        MainModelComboBox.ItemsSource = provider.MainModels;
        ImageModelComboBox.ItemsSource = provider.ImageModels;
        MainModelComboBox.SelectedItem = provider.MainModels.FirstOrDefault(item => item.Value == provider.MainModel) ?? provider.MainModels.First();
        ImageModelComboBox.SelectedItem = provider.ImageModels.FirstOrDefault(item => item.Value == provider.ImageModel) ?? provider.ImageModels.First();
        ApiKeyBox.PlaceholderText = provider.KeyPlaceholder;
        ApiKeyBox.Password = _apiKeys.GetValueOrDefault(provider.Id, "");
        GuideText.Text = string.Join(" ", provider.GuideSteps);
        UpdateSimpleSummary();
    }

    private void ApiKeyBox_PasswordChanged(object sender, RoutedEventArgs e)
    {
        _apiKeys[SelectedProvider.Id] = ApiKeyBox.Password;
    }

    private void ModeRadio_Checked(object sender, RoutedEventArgs e)
    {
        UpdateAdvancedVisibility();
    }

    private void UpdateAdvancedVisibility()
    {
        if (AdvancedPanel is null) return;
        AdvancedPanel.Visibility = IsAdvancedMode ? Visibility.Visible : Visibility.Collapsed;
        SimpleSummaryPanel.Visibility = IsAdvancedMode ? Visibility.Collapsed : Visibility.Visible;
        MockCheckBox.Visibility = _health?.MockEnabled == true ? Visibility.Visible : Visibility.Collapsed;
        UpdateSimpleSummary();
    }

    private void UpdateSimpleSummary()
    {
        if (SimpleSummaryText is null) return;
        var provider = SelectedProvider;
        var mainLabel = provider.MainModels.FirstOrDefault(item => item.Value == provider.MainModel)?.Label ?? provider.MainModel;
        var imageLabel = provider.ImageModels.FirstOrDefault(item => item.Value == provider.ImageModel)?.Label ?? provider.ImageModel;
        SimpleSummaryText.Text = $"默认配置：{mainLabel} · {imageLabel} · 规划器 + 评审器 · 16:9";
    }

    private async void RefreshButton_Click(object sender, RoutedEventArgs e)
    {
        await RefreshHealthAsync();
        await RefreshSessionAsync();
    }

    private async Task RefreshHealthAsync()
    {
        try
        {
            _health = await _apiClient.FetchBackendHealthAsync(ApiBase);
            HealthText.Text = "服务在线";
            UpdateAdvancedVisibility();
        }
        catch (Exception error)
        {
            _health = null;
            HealthText.Text = ErrorFormatter.Format(error);
        }
    }

    private async Task RefreshSessionAsync()
    {
        _currentUser = await _apiClient.GetSessionAsync(ApiBase);
        UpdateAccountUi();
    }

    private void AuthButton_Click(object sender, RoutedEventArgs e)
    {
        ShowRecordsPanel();
    }

    private async void SubmitButton_Click(object sender, RoutedEventArgs e)
    {
        HideInfo(SubmitInfoBar);
        HideInfo(JobErrorInfoBar);

        if (MethodContentBox.Text.Trim().Length < 20)
        {
            ShowError(SubmitInfoBar, "论文方法内容至少需要 20 个字符。");
            return;
        }
        if (CaptionBox.Text.Trim().Length < 3)
        {
            ShowError(SubmitInfoBar, "请填写目标图注。");
            return;
        }

        var selectedKey = ApiKeyBox.Password.Trim();
        var canMock = IsAdvancedMode && MockCheckBox.IsChecked == true && _health?.MockEnabled == true;
        if (string.IsNullOrWhiteSpace(selectedKey) && !canMock)
        {
            ShowError(SubmitInfoBar, "请填写当前模型平台的 API Key。");
            return;
        }

        SubmitButton.IsEnabled = false;
        SubmitButton.Content = "提交中...";
        ResultImagesList.ItemsSource = null;
        try
        {
            var provider = SelectedProvider;
            var payload = new JobCreateRequest(
                IsAdvancedMode ? "advanced" : "simple",
                provider.Id,
                selectedKey,
                MethodContentBox.Text.Trim(),
                CaptionBox.Text.Trim(),
                SelectedCategory.Label,
                IsAdvancedMode ? SelectedMainModel.Value : provider.MainModel,
                IsAdvancedMode ? SelectedImageModel.Value : provider.ImageModel,
                IsAdvancedMode ? SelectedPipeline.Value : "demo_planner_critic",
                IsAdvancedMode ? SelectedRetrieval.Value : "none",
                IsAdvancedMode ? SelectedAspectRatio.Value : "16:9",
                IsAdvancedMode ? ParseInt(SelectedCandidateCount.Value, 1) : 1,
                IsAdvancedMode ? ParseInt(SelectedCriticRounds.Value, 1) : 1,
                IsAdvancedMode && MockCheckBox.IsChecked == true);

            var created = await _apiClient.CreateJobAsync(ApiBase, _health, payload);
            _currentJobId = created.Id;
            _currentJob = new PaperBananaJob { Id = created.Id, Status = created.Status, ClientPlatform = "windows" };
            CurrentJobText.Text = $"任务来源：{_currentJob.ClientPlatformDisplayName} · 任务编号 {_currentJobId}";
            _pollingTimer.Start();
            await LoadCurrentJobAsync();
        }
        catch (Exception error)
        {
            ShowError(SubmitInfoBar, ErrorFormatter.Format(error));
        }
        finally
        {
            SubmitButton.IsEnabled = true;
            SubmitButton.Content = "生成候选图";
        }
    }

    private async void PollingTimer_Tick(object? sender, object e)
    {
        await LoadCurrentJobAsync();
    }

    private async Task LoadCurrentJobAsync()
    {
        if (string.IsNullOrWhiteSpace(_currentJobId)) return;
        try
        {
            _currentJob = await _apiClient.GetJobAsync(ApiBase, _health, _currentJobId);
            CurrentJobText.Text = $"{StatusLabel(_currentJob.Status)} · 任务来源：{_currentJob.ClientPlatformDisplayName} · 任务编号 {_currentJob.Id}";
            if (_currentJob.Status == "failed" && !string.IsNullOrWhiteSpace(_currentJob.FailureText))
            {
                ShowError(JobErrorInfoBar, ErrorFormatter.Format(_currentJob.FailureText));
            }
            else
            {
                HideInfo(JobErrorInfoBar);
            }
            ResultImagesList.ItemsSource = await BuildImageItemsAsync(_currentJob.ResultImages);
            if (_currentJob.IsTerminal) _pollingTimer.Stop();
        }
        catch (Exception error)
        {
            ShowError(JobErrorInfoBar, ErrorFormatter.Format(error));
        }
    }

    private async Task<IReadOnlyList<ResultImageViewModel>> BuildImageItemsAsync(IReadOnlyList<ResultImage> images)
    {
        var items = new List<ResultImageViewModel>();
        foreach (var image in images)
        {
            var url = _apiClient.ResolveImageUrl(ApiBase, image.Url);
            var item = new ResultImageViewModel
            {
                Image = image,
                Url = url,
                Title = string.IsNullOrWhiteSpace(image.Filename) ? $"候选图 {image.CandidateId + 1}" : image.Filename
            };
            try
            {
                item.PreviewSource = url.StartsWith("data:", StringComparison.OrdinalIgnoreCase)
                    ? await PaperBananaApiClient.BitmapFromDataUriAsync(url)
                    : new BitmapImage(new Uri(url));
            }
            catch
            {
                item.PreviewSource = null;
            }
            items.Add(item);
        }
        return items;
    }

    private async void OpenImageButton_Click(object sender, RoutedEventArgs e)
    {
        if ((sender as FrameworkElement)?.Tag is not ResultImageViewModel item || item.Url.StartsWith("data:", StringComparison.OrdinalIgnoreCase)) return;
        await Launcher.LaunchUriAsync(new Uri(item.Url));
    }

    private async void SaveImageButton_Click(object sender, RoutedEventArgs e)
    {
        if ((sender as FrameworkElement)?.Tag is not ResultImageViewModel item) return;
        try
        {
            await SaveImageAsync(item);
        }
        catch (Exception error)
        {
            ShowError(JobErrorInfoBar, ErrorFormatter.Format(error));
        }
    }

    private async void SaveRecordImageButton_Click(object sender, RoutedEventArgs e)
    {
        if ((sender as FrameworkElement)?.Tag is not ResultImageViewModel item) return;
        try
        {
            await SaveImageAsync(item);
        }
        catch (Exception error)
        {
            ShowError(RecordsInfoBar, ErrorFormatter.Format(error));
        }
    }

    private async Task SaveImageAsync(ResultImageViewModel item)
    {
        var bytes = await _apiClient.GetImageBytesAsync(ApiBase, item.Image.Url);
        var picker = new FileSavePicker
        {
            SuggestedStartLocation = PickerLocationId.PicturesLibrary,
            SuggestedFileName = Path.GetFileNameWithoutExtension(item.Image.Filename)
        };
        picker.FileTypeChoices.Add("PNG 图片", [".png"]);
        InitializeWithWindow.Initialize(picker, WindowNative.GetWindowHandle(this));
        var file = await picker.PickSaveFileAsync();
        if (file is not null)
        {
            await FileIO.WriteBytesAsync(file, bytes);
        }
    }

    private void ExampleButton_Click(object sender, RoutedEventArgs e)
    {
        if ((sender as FrameworkElement)?.Tag is not QuickStartExample example) return;
        MethodContentBox.Text = example.MethodContent;
        CaptionBox.Text = example.Caption;
        CategoryComboBox.SelectedItem = _catalog.InfographicCategories.FirstOrDefault(item => item.Value == example.Category) ?? _catalog.InfographicCategories[0];
    }

    private void AuthModeComboBox_SelectionChanged(object sender, SelectionChangedEventArgs e)
    {
        if (AuthNameBox is null) return;
        AuthNameBox.Visibility = IsSignUpMode() ? Visibility.Visible : Visibility.Collapsed;
    }

    private async void AuthSubmitButton_Click(object sender, RoutedEventArgs e)
    {
        HideInfo(RecordsInfoBar);
        var email = AuthEmailBox.Text.Trim();
        var password = AuthPasswordBox.Password;
        if (string.IsNullOrWhiteSpace(email) || password.Length < 8)
        {
            ShowError(RecordsInfoBar, "请输入邮箱和至少 8 位密码。");
            return;
        }

        AuthSubmitButton.IsEnabled = false;
        try
        {
            if (IsSignUpMode())
            {
                var name = AuthNameBox.Text.Trim();
                if (name.Length > 24) name = name[..24];
                if (string.IsNullOrWhiteSpace(name)) name = email.Split('@')[0];
                await _apiClient.SignUpAsync(ApiBase, email, password, name);
            }
            else
            {
                await _apiClient.SignInAsync(ApiBase, email, password);
            }
            AuthPasswordBox.Password = "";
            await RefreshSessionAsync();
            await LoadRecordsAsync();
        }
        catch (Exception error)
        {
            ShowError(RecordsInfoBar, ErrorFormatter.Format(error));
        }
        finally
        {
            AuthSubmitButton.IsEnabled = true;
        }
    }

    private bool IsSignUpMode()
    {
        return (AuthModeComboBox.SelectedItem as ComboBoxItem)?.Tag?.ToString() == "sign-up";
    }

    private async void RefreshRecordsButton_Click(object sender, RoutedEventArgs e)
    {
        await LoadRecordsAsync();
    }

    private async Task LoadRecordsAsync()
    {
        HideInfo(RecordsInfoBar);
        if (_currentUser is null)
        {
            ShowError(RecordsInfoBar, "请先登录后再查看任务记录。");
            return;
        }

        try
        {
            var jobs = await _apiClient.UserJobsAsync(ApiBase, _health);
            RecordsList.ItemsSource = await Task.WhenAll(jobs.Select(ToListItemAsync));
        }
        catch (Exception error)
        {
            ShowError(RecordsInfoBar, ErrorFormatter.Format(error));
        }
    }

    private async Task<JobListItem> ToListItemAsync(PaperBananaJob job)
    {
        return new JobListItem
        {
            Job = job,
            StatusLabel = StatusLabel(job.Status),
            Images = await BuildImageItemsAsync(job.ResultImages)
        };
    }

    private string StatusLabel(string status)
    {
        return _catalog.StatusLabels.TryGetValue(status, out var label) ? label : status;
    }

    private void UpdateAccountUi()
    {
        if (_currentUser is null)
        {
            AccountText.Text = "未登录";
            AuthButton.Content = "登录 / 注册";
            AuthPanel.Visibility = Visibility.Visible;
        }
        else
        {
            AccountText.Text = $"已登录：{_currentUser.Email}";
            AuthButton.Content = _currentUser.Email;
            AuthPanel.Visibility = Visibility.Collapsed;
        }
    }

    private void GenerateTabButton_Click(object sender, RoutedEventArgs e) => ShowGeneratePanel();
    private async void RecordsTabButton_Click(object sender, RoutedEventArgs e)
    {
        ShowRecordsPanel();
        if (_currentUser is not null) await LoadRecordsAsync();
    }

    private void ShowGeneratePanel()
    {
        GeneratePanel.Visibility = Visibility.Visible;
        RecordsPanel.Visibility = Visibility.Collapsed;
    }

    private void ShowRecordsPanel()
    {
        GeneratePanel.Visibility = Visibility.Collapsed;
        RecordsPanel.Visibility = Visibility.Visible;
    }

    private static void ShowError(InfoBar infoBar, string message)
    {
        infoBar.Title = "操作失败";
        infoBar.Message = message;
        infoBar.Severity = InfoBarSeverity.Error;
        infoBar.IsOpen = true;
    }

    private static void HideInfo(InfoBar infoBar)
    {
        infoBar.IsOpen = false;
        infoBar.Message = "";
    }

    private static int ParseInt(string value, int fallback)
    {
        return int.TryParse(value, out var parsed) ? parsed : fallback;
    }
}
