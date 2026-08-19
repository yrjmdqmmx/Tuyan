using System.Text.Json;
using Microsoft.UI.Xaml.Media;

namespace PaperBanana.WinUI;

public enum BackendMode
{
    Gateway,
    Laf,
    FastApi
}

public sealed record BackendHealth(BackendMode Mode, string Runtime, bool MockEnabled, string Detail);

public sealed record CurrentUser(string Id, string Email, string Name);

public sealed record ModelOption(string Value, string Label, string Group)
{
    public string DisplayName => string.IsNullOrWhiteSpace(Group) ? Label : $"{Group} / {Label}";
}

public sealed record CatalogOption(string Value, string Label, string Description = "")
{
    public string DisplayName => string.IsNullOrWhiteSpace(Description) ? Label : $"{Label} - {Description}";
}

public sealed record QuickStartExample(
    string Id,
    string Label,
    string Title,
    string Category,
    string Caption,
    string MethodContent,
    string Hint);

public sealed class ProviderOption
{
    public required string Id { get; init; }
    public required string Label { get; init; }
    public required string KeyName { get; init; }
    public required string KeyPlaceholder { get; init; }
    public required string MainModel { get; init; }
    public required string ImageModel { get; init; }
    public required IReadOnlyList<ModelOption> MainModels { get; init; }
    public required IReadOnlyList<ModelOption> ImageModels { get; init; }
    public required string GuideUrl { get; init; }
    public required IReadOnlyList<string> GuideSteps { get; init; }
}

public sealed class ModelCatalog
{
    public required IReadOnlyList<ProviderOption> Providers { get; init; }
    public required IReadOnlyList<CatalogOption> InfographicCategories { get; init; }
    public required IReadOnlyList<QuickStartExample> QuickStartExamples { get; init; }
    public required IReadOnlyList<CatalogOption> PipelineOptions { get; init; }
    public required IReadOnlyList<CatalogOption> RetrievalOptions { get; init; }
    public required IReadOnlyList<CatalogOption> AspectRatioOptions { get; init; }
    public required IReadOnlyList<CatalogOption> CandidateOptions { get; init; }
    public required IReadOnlyList<CatalogOption> CriticRoundOptions { get; init; }
    public required IReadOnlyDictionary<string, string> StatusLabels { get; init; }
    public required string SampleMethod { get; init; }

    public ProviderOption DefaultProvider => Providers.First(provider => provider.Id == "bailian");
}

public sealed record JobCreateRequest(
    string ConfigurationMode,
    string Provider,
    string ApiKey,
    string MethodContent,
    string Caption,
    string InfographicCategory,
    string MainModelName,
    string ImageModelName,
    string PipelineMode,
    string RetrievalSetting,
    string AspectRatio,
    int NumCandidates,
    int MaxCriticRounds,
    bool Mock);

public sealed class ResultImage
{
    public string Filename { get; init; } = "";
    public string Url { get; init; } = "";
    public int CandidateId { get; init; }
    public string MimeType { get; init; } = "";
}

public sealed class PaperBananaJob
{
    public string Id { get; init; } = "";
    public string Status { get; init; } = "queued";
    public string Provider { get; init; } = "";
    public string ClientPlatform { get; init; } = "";
    public string UserEmail { get; init; } = "";
    public string ConfigurationMode { get; init; } = "simple";
    public string MethodContent { get; init; } = "";
    public string Caption { get; init; } = "";
    public string InfographicCategory { get; init; } = "";
    public string MainModelName { get; init; } = "";
    public string ImageModelName { get; init; } = "";
    public string PipelineMode { get; init; } = "";
    public string AspectRatio { get; init; } = "";
    public int NumCandidates { get; init; }
    public int MaxCriticRounds { get; init; }
    public int PromptCharCount { get; init; }
    public int ResultImageCount { get; init; }
    public IReadOnlyList<ResultImage> ResultImages { get; init; } = [];
    public string LogsTail { get; init; } = "";
    public string Error { get; init; } = "";
    public DateTimeOffset? CreatedAt { get; init; }
    public DateTimeOffset? UpdatedAt { get; init; }
    public DateTimeOffset? CompletedAt { get; init; }

    public bool IsTerminal => Status is "succeeded" or "failed";
    public string Title => string.IsNullOrWhiteSpace(Caption) ? Id : Caption;
    public string FailureText => string.IsNullOrWhiteSpace(Error) ? LogsTail : Error;
    public string ClientPlatformDisplayName => ClientPlatform switch
    {
        "web" => "Web 网页",
        "miniprogram" => "微信小程序",
        "android" => "Android",
        "ios" => "iOS",
        "windows" => "Windows",
        "macos" => "macOS",
        "harmony" => "HarmonyOS",
        _ => "未记录"
    };

    public static PaperBananaJob FromJson(JsonElement element)
    {
        var images = ReadImages(Get(element, "result_images", "resultImages"));
        return new PaperBananaJob
        {
            Id = GetString(element, "id", "_id"),
            Status = GetString(element, "status", fallback: "queued"),
            Provider = GetString(element, "provider"),
            ClientPlatform = NormalizeClientPlatform(GetString(element, "client_platform", "clientPlatform")),
            UserEmail = GetString(element, "user_email", "userEmail"),
            ConfigurationMode = GetString(element, "configuration_mode", "configurationMode", fallback: "simple"),
            MethodContent = GetString(element, "method_content", "methodContent"),
            Caption = GetString(element, "caption"),
            InfographicCategory = GetString(element, "infographic_category", "infographicCategory"),
            MainModelName = GetString(element, "main_model_name", "mainModelName"),
            ImageModelName = GetString(element, "image_gen_model_name", "imageModelName"),
            PipelineMode = GetString(element, "pipeline_mode", "pipelineMode"),
            AspectRatio = GetString(element, "aspect_ratio", "aspectRatio"),
            NumCandidates = GetInt(element, "num_candidates", "numCandidates"),
            MaxCriticRounds = GetInt(element, "max_critic_rounds", "maxCriticRounds"),
            PromptCharCount = GetInt(element, "prompt_char_count", "promptCharCount"),
            ResultImageCount = GetInt(element, "result_image_count", "resultImageCount", fallback: images.Count),
            ResultImages = images,
            LogsTail = GetLogsTail(element),
            Error = GetString(element, "error"),
            CreatedAt = GetDate(element, "created_at", "createdAt"),
            UpdatedAt = GetDate(element, "updated_at", "updatedAt"),
            CompletedAt = GetDate(element, "completed_at", "completedAt")
        };
    }

    private static string NormalizeClientPlatform(string value)
    {
        var platform = value.Trim().ToLowerInvariant();
        return platform is "web" or "miniprogram" or "android" or "ios" or "windows" or "macos" or "harmony"
            ? platform
            : "";
    }

    private static List<ResultImage> ReadImages(JsonElement? element)
    {
        if (element is not { ValueKind: JsonValueKind.Array }) return [];
        var list = new List<ResultImage>();
        var index = 0;
        foreach (var image in element.Value.EnumerateArray())
        {
            list.Add(new ResultImage
            {
                Filename = GetString(image, "filename", "url", fallback: $"candidate-{index + 1}.png"),
                Url = GetString(image, "url"),
                CandidateId = GetInt(image, "candidate_id", "candidateId", fallback: index),
                MimeType = GetString(image, "mime_type", "mimeType", fallback: "image/png")
            });
            index += 1;
        }
        return list;
    }

    private static string GetLogsTail(JsonElement element)
    {
        var direct = GetString(element, "logs_tail");
        if (!string.IsNullOrWhiteSpace(direct)) return direct;
        var logs = Get(element, "logs");
        if (logs is not { ValueKind: JsonValueKind.Array }) return "";
        return string.Join(Environment.NewLine, logs.Value.EnumerateArray()
            .Select(item => item.ValueKind == JsonValueKind.String ? item.GetString() : item.ToString())
            .Where(value => !string.IsNullOrWhiteSpace(value))
            .TakeLast(10));
    }

    private static JsonElement? Get(JsonElement element, params string[] names)
    {
        foreach (var name in names)
        {
            if (element.ValueKind == JsonValueKind.Object && element.TryGetProperty(name, out var value))
            {
                return value;
            }
        }
        return null;
    }

    private static string GetString(JsonElement element, params string[] names)
    {
        return GetString(element, names, fallback: "");
    }

    private static string GetString(JsonElement element, string first, string second = "", string fallback = "")
    {
        return GetString(element, string.IsNullOrWhiteSpace(second) ? [first] : [first, second], fallback);
    }

    private static string GetString(JsonElement element, string[] names, string fallback)
    {
        var value = Get(element, names);
        if (value is null) return fallback;
        return value.Value.ValueKind switch
        {
            JsonValueKind.String => value.Value.GetString() ?? fallback,
            JsonValueKind.Number => value.Value.ToString(),
            JsonValueKind.True => "true",
            JsonValueKind.False => "false",
            _ => fallback
        };
    }

    private static int GetInt(JsonElement element, string first, string second = "", int fallback = 0)
    {
        var value = Get(element, string.IsNullOrWhiteSpace(second) ? [first] : [first, second]);
        if (value is null) return fallback;
        if (value.Value.ValueKind == JsonValueKind.Number && value.Value.TryGetInt32(out var number)) return number;
        return int.TryParse(GetString(element, string.IsNullOrWhiteSpace(second) ? [first] : [first, second], ""), out var parsed)
            ? parsed
            : fallback;
    }

    private static DateTimeOffset? GetDate(JsonElement element, string first, string second)
    {
        var raw = GetString(element, first, second);
        return DateTimeOffset.TryParse(raw, out var date) ? date : null;
    }
}

public sealed class ResultImageViewModel
{
    public required ResultImage Image { get; init; }
    public required string Title { get; init; }
    public required string Url { get; init; }
    public ImageSource? PreviewSource { get; set; }
}

public sealed class JobListItem
{
    public required PaperBananaJob Job { get; init; }
    public required string StatusLabel { get; init; }
    public IReadOnlyList<ResultImageViewModel> Images { get; init; } = [];
    public string Title => Job.Title;
    public string Meta => $"{Job.Provider} · {Job.MainModelName} · {Job.ImageModelName}";
    public string ClientPlatformDisplayName => Job.ClientPlatformDisplayName;
    public string ClientPlatformDisplayText => $"任务来源：{ClientPlatformDisplayName}";
    public string CreatedText => Job.CreatedAt?.ToLocalTime().ToString("MM-dd HH:mm") ?? "";
    public string Error => Job.Status == "failed" ? ErrorFormatter.Format(Job.FailureText) : "";
}

public static class ErrorFormatter
{
    public static string Format(Exception error) => Format(error.Message);

    public static string Format(string? message)
    {
        var value = message ?? "";
        if (value.Contains("Invalid email or password", StringComparison.OrdinalIgnoreCase)) return "邮箱或密码不正确。";
        if (value.Contains("User already exists", StringComparison.OrdinalIgnoreCase)) return "这个邮箱已经注册，请直接登录。";
        if (value.Contains("Missing API key", StringComparison.OrdinalIgnoreCase)) return "缺少所选模型接口的 API Key。";
        if (value.Contains("Incorrect API key", StringComparison.OrdinalIgnoreCase) || value.Contains("apikey-error", StringComparison.OrdinalIgnoreCase)) return "API Key 不正确，请确认模型服务和密钥匹配。";
        if (value.Contains("Please log in", StringComparison.OrdinalIgnoreCase) || value.Contains("请先登录", StringComparison.OrdinalIgnoreCase) || value.Contains("Unauthorized", StringComparison.OrdinalIgnoreCase)) return "请先登录后再使用任务记录。";
        if (value.Contains("Forbidden", StringComparison.OrdinalIgnoreCase)) return "当前账号没有权限查看这个任务。";
        if (value.Contains("timeout", StringComparison.OrdinalIgnoreCase) || value.Contains("TaskCanceledException", StringComparison.OrdinalIgnoreCase)) return "请求超时，请稍后重试。";
        if (value.Contains("Network", StringComparison.OrdinalIgnoreCase) || value.Contains("No such host", StringComparison.OrdinalIgnoreCase)) return "无法连接服务，请确认网络可用后重试。";
        if (value.Contains("password", StringComparison.OrdinalIgnoreCase)) return "密码至少需要 8 位。";
        if (value.Contains("HTTP 503", StringComparison.OrdinalIgnoreCase)) return "服务暂时不可用，请稍后重试。";
        return string.IsNullOrWhiteSpace(value) ? "操作失败" : value;
    }
}
