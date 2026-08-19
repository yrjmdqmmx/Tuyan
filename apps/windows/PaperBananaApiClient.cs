using System.Net;
using System.Net.Http.Json;
using System.Runtime.InteropServices.WindowsRuntime;
using System.Text;
using System.Text.Json;
using Windows.Storage.Streams;

namespace PaperBanana.WinUI;

public sealed class PaperBananaApiClient
{
    public const string DefaultApiBase = "https://yifbnnzrwmxn.sealoshzh.site";
    internal const string ClientPlatform = "windows";

    private readonly HttpClient _httpClient;
    private readonly JsonSerializerOptions _jsonOptions = new(JsonSerializerDefaults.Web);

    public PaperBananaApiClient()
    {
        var handler = new HttpClientHandler
        {
            CookieContainer = new CookieContainer(),
            UseCookies = true
        };
        _httpClient = new HttpClient(handler)
        {
            Timeout = TimeSpan.FromSeconds(60)
        };
    }

    public async Task<BackendHealth> FetchBackendHealthAsync(string apiBase, CancellationToken cancellationToken = default)
    {
        var baseUrl = NormalizeApiBase(apiBase);
        var candidates = new[]
        {
            LafEndpoint(baseUrl),
            JoinUrl(baseUrl, "health"),
            JoinUrl(baseUrl, "api/health")
        };

        Exception? lastError = null;
        foreach (var candidate in candidates)
        {
            try
            {
                var root = await SendJsonAsync(candidate, HttpMethod.Get, null, cancellationToken);
                if (TryHealth(root, candidate, out var health)) return health;
                throw new InvalidOperationException("当前地址不是 PaperBanana 后端");
            }
            catch (Exception error)
            {
                lastError = error;
            }
        }

        throw lastError ?? new InvalidOperationException("后端暂时不可用");
    }

    public async Task<(string Id, string Status)> CreateJobAsync(string apiBase, BackendHealth? health, JobCreateRequest payload, CancellationToken cancellationToken = default)
    {
        var baseUrl = NormalizeApiBase(apiBase);
        if (ShouldUsePaperBananaEndpoint(health))
        {
            var body = new Dictionary<string, object?>
            {
                ["action"] = "createJob",
                ["clientPlatform"] = ClientPlatform,
                ["configurationMode"] = payload.ConfigurationMode,
                ["provider"] = payload.Provider,
                ["apiKeys"] = ApiKeysBody(payload.Provider, payload.ApiKey),
                ["methodContent"] = payload.MethodContent,
                ["caption"] = payload.Caption,
                ["infographicCategory"] = payload.InfographicCategory,
                ["mainModelName"] = payload.MainModelName,
                ["imageModelName"] = payload.ImageModelName,
                ["pipelineMode"] = ToLafPipeline(payload.PipelineMode),
                ["retrievalSetting"] = payload.RetrievalSetting,
                ["aspectRatio"] = payload.AspectRatio,
                ["numCandidates"] = payload.NumCandidates,
                ["maxCriticRounds"] = payload.MaxCriticRounds,
                ["mock"] = payload.Mock
            };
            var root = await SendJsonAsync(LafEndpoint(baseUrl), HttpMethod.Post, body, cancellationToken);
            return (ReadString(root, "jobId", "id"), ReadString(root, ["status"], "queued"));
        }

        var fastApiBody = new Dictionary<string, object?>
        {
            ["clientPlatform"] = ClientPlatform,
            ["provider"] = payload.Provider,
            ["configuration_mode"] = payload.ConfigurationMode,
            ["api_keys"] = ApiKeysBody(payload.Provider, payload.ApiKey),
            ["task_name"] = "diagram",
            ["method_content"] = payload.MethodContent,
            ["caption"] = payload.Caption,
            ["infographic_category"] = payload.InfographicCategory,
            ["main_model_name"] = payload.MainModelName,
            ["image_gen_model_name"] = payload.ImageModelName,
            ["pipeline_mode"] = payload.PipelineMode,
            ["retrieval_setting"] = payload.RetrievalSetting,
            ["aspect_ratio"] = payload.AspectRatio,
            ["num_candidates"] = payload.NumCandidates,
            ["max_critic_rounds"] = payload.MaxCriticRounds,
            ["mock"] = payload.Mock
        };
        var fastRoot = await SendJsonAsync(JoinUrl(baseUrl, "api/jobs"), HttpMethod.Post, fastApiBody, cancellationToken);
        return (ReadString(fastRoot, "id", "jobId"), ReadString(fastRoot, ["status"], "queued"));
    }

    public async Task<PaperBananaJob> GetJobAsync(string apiBase, BackendHealth? health, string jobId, CancellationToken cancellationToken = default)
    {
        var baseUrl = NormalizeApiBase(apiBase);
        if (ShouldUsePaperBananaEndpoint(health))
        {
            var root = await SendJsonAsync(
                LafEndpoint(baseUrl),
                HttpMethod.Post,
                new Dictionary<string, object?> { ["action"] = "getJob", ["jobId"] = jobId },
                cancellationToken);
            if (root.TryGetProperty("job", out var job)) return PaperBananaJob.FromJson(job);
            throw new InvalidOperationException("后端没有返回任务详情。");
        }

        return PaperBananaJob.FromJson(await SendJsonAsync(JoinUrl(baseUrl, $"api/jobs/{jobId}"), HttpMethod.Get, null, cancellationToken));
    }

    public async Task<IReadOnlyList<PaperBananaJob>> UserJobsAsync(string apiBase, BackendHealth? health, CancellationToken cancellationToken = default)
    {
        var baseUrl = NormalizeApiBase(apiBase);
        if (ShouldUsePaperBananaEndpoint(health))
        {
            var root = await SendJsonAsync(
                LafEndpoint(baseUrl),
                HttpMethod.Post,
                new Dictionary<string, object?> { ["action"] = "myJobs", ["limit"] = 50 },
                cancellationToken);
            return ReadJobs(root);
        }

        var fastRoot = await SendJsonAsync(JoinUrl(baseUrl, "api/jobs?scope=mine&limit=50"), HttpMethod.Get, null, cancellationToken);
        return ReadJobs(fastRoot);
    }

    public async Task<CurrentUser?> GetSessionAsync(string apiBase, CancellationToken cancellationToken = default)
    {
        try
        {
            var root = await SendJsonAsync(JoinUrl(NormalizeApiBase(apiBase), "api/auth/get-session"), HttpMethod.Get, null, cancellationToken);
            if (!root.TryGetProperty("user", out var user) || user.ValueKind != JsonValueKind.Object) return null;
            var id = ReadString(user, "id");
            if (string.IsNullOrWhiteSpace(id)) return null;
            return new CurrentUser(id, ReadString(user, "email"), ReadString(user, "name"));
        }
        catch
        {
            return null;
        }
    }

    public Task SignInAsync(string apiBase, string email, string password, CancellationToken cancellationToken = default)
    {
        return SendVoidAsync(
            JoinUrl(NormalizeApiBase(apiBase), "api/auth/sign-in/email"),
            new Dictionary<string, object?> { ["email"] = email, ["password"] = password },
            cancellationToken);
    }

    public Task SignUpAsync(string apiBase, string email, string password, string name, CancellationToken cancellationToken = default)
    {
        return SendVoidAsync(
            JoinUrl(NormalizeApiBase(apiBase), "api/auth/sign-up/email"),
            new Dictionary<string, object?> { ["email"] = email, ["password"] = password, ["name"] = name },
            cancellationToken);
    }

    public async Task SignOutAsync(string apiBase, CancellationToken cancellationToken = default)
    {
        try
        {
            await SendVoidAsync(JoinUrl(NormalizeApiBase(apiBase), "api/auth/sign-out"), new Dictionary<string, object?>(), cancellationToken);
        }
        catch
        {
            // Sign-out should clear local UI state even if the server session is already gone.
        }
    }

    public async Task<byte[]> GetImageBytesAsync(string apiBase, string url, CancellationToken cancellationToken = default)
    {
        if (TryReadDataUri(url, out var dataBytes)) return dataBytes;
        var resolved = ResolveImageUrl(apiBase, url);
        return await _httpClient.GetByteArrayAsync(resolved, cancellationToken);
    }

    public string ResolveImageUrl(string apiBase, string url)
    {
        if (string.IsNullOrWhiteSpace(url)) return "";
        if (url.StartsWith("http://", StringComparison.OrdinalIgnoreCase) ||
            url.StartsWith("https://", StringComparison.OrdinalIgnoreCase) ||
            url.StartsWith("data:", StringComparison.OrdinalIgnoreCase) ||
            url.StartsWith("file:", StringComparison.OrdinalIgnoreCase) ||
            url.StartsWith("blob:", StringComparison.OrdinalIgnoreCase))
        {
            return url;
        }
        return $"{NormalizeApiBase(apiBase)}/{url.TrimStart('/')}";
    }

    public static string NormalizeApiBase(string value)
    {
        var trimmed = string.IsNullOrWhiteSpace(value) ? DefaultApiBase : value.Trim();
        return trimmed.TrimEnd('/');
    }

    public static async Task<Microsoft.UI.Xaml.Media.Imaging.BitmapImage> BitmapFromDataUriAsync(string dataUri)
    {
        if (!TryReadDataUri(dataUri, out var bytes)) throw new InvalidOperationException("无效图片数据。");
        var bitmap = new Microsoft.UI.Xaml.Media.Imaging.BitmapImage();
        using var stream = new InMemoryRandomAccessStream();
        await stream.WriteAsync(bytes.AsBuffer());
        stream.Seek(0);
        await bitmap.SetSourceAsync(stream);
        return bitmap;
    }

    private static bool ShouldUsePaperBananaEndpoint(BackendHealth? health)
    {
        return health?.Mode != BackendMode.FastApi;
    }

    private static string LafEndpoint(string apiBase)
    {
        return apiBase.EndsWith("/paperbanana-api", StringComparison.OrdinalIgnoreCase)
            ? apiBase
            : JoinUrl(apiBase, "paperbanana-api");
    }

    private static string JoinUrl(string apiBase, string path)
    {
        if (Uri.TryCreate(path, UriKind.Absolute, out var absolute)) return absolute.ToString();
        return $"{apiBase.TrimEnd('/')}/{path.TrimStart('/')}";
    }

    private async Task SendVoidAsync(string url, object body, CancellationToken cancellationToken)
    {
        await SendJsonAsync(url, HttpMethod.Post, body, cancellationToken);
    }

    private async Task<JsonElement> SendJsonAsync(string url, HttpMethod method, object? body, CancellationToken cancellationToken)
    {
        using var request = new HttpRequestMessage(method, url);
        if (body is not null)
        {
            request.Content = JsonContent.Create(body, options: _jsonOptions);
        }
        return await SendJsonAsync(request, cancellationToken);
    }

    private async Task<JsonElement> SendJsonAsync(HttpRequestMessage request, CancellationToken cancellationToken)
    {
        request.Headers.TryAddWithoutValidation("Accept", "application/json");
        using var response = await _httpClient.SendAsync(request, cancellationToken);
        var text = await response.Content.ReadAsStringAsync(cancellationToken);
        using var document = JsonDocument.Parse(string.IsNullOrWhiteSpace(text) ? "{}" : text);
        var root = document.RootElement.Clone();

        var serverError = ServerError(root);
        if (!response.IsSuccessStatusCode || !string.IsNullOrWhiteSpace(serverError))
        {
            throw new InvalidOperationException(serverError ?? $"HTTP {(int)response.StatusCode}");
        }
        return root;
    }

    private static string? ServerError(JsonElement root)
    {
        if (root.ValueKind != JsonValueKind.Object) return null;
        if (root.TryGetProperty("code", out var code))
        {
            var codeText = code.ValueKind == JsonValueKind.Number ? code.GetInt32().ToString() : code.ToString();
            if (codeText != "0")
            {
                return ReadString(root, "error", "detail", "message", fallback: codeText);
            }
        }
        if (root.TryGetProperty("error", out var error))
        {
            if (error.ValueKind == JsonValueKind.String) return error.GetString();
            if (error.ValueKind == JsonValueKind.Object && error.TryGetProperty("message", out var message)) return message.GetString();
        }
        return null;
    }

    private static bool TryHealth(JsonElement root, string candidateUrl, out BackendHealth health)
    {
        var runtime = ReadString(root, "runtime");
        var mockEnabled = ReadBool(root, "mock_enabled");
        if (runtime == "gateway")
        {
            health = new BackendHealth(BackendMode.Gateway, "gateway", mockEnabled || ReadNestedBool(root, "laf", "mock_enabled"), "Gateway -> Laf");
            return true;
        }
        if (runtime == "laf")
        {
            health = new BackendHealth(BackendMode.Laf, "laf", mockEnabled, candidateUrl);
            return true;
        }
        if (ReadBool(root, "ok"))
        {
            health = new BackendHealth(BackendMode.FastApi, string.IsNullOrWhiteSpace(runtime) ? "fastapi" : runtime, mockEnabled, candidateUrl);
            return true;
        }
        health = new BackendHealth(BackendMode.Gateway, "", false, "");
        return false;
    }

    private static IReadOnlyList<PaperBananaJob> ReadJobs(JsonElement root)
    {
        if (!root.TryGetProperty("jobs", out var jobs) || jobs.ValueKind != JsonValueKind.Array) return [];
        return jobs.EnumerateArray().Select(PaperBananaJob.FromJson).ToArray();
    }

    private static Dictionary<string, string> ApiKeysBody(string provider, string apiKey)
    {
        return new Dictionary<string, string>
        {
            ["openrouter"] = provider == "openrouter" ? apiKey : "",
            ["gemini"] = provider == "gemini" ? apiKey : "",
            ["openai"] = provider == "openai" ? apiKey : "",
            ["bailian"] = provider == "bailian" ? apiKey : ""
        };
    }

    private static string ToLafPipeline(string mode)
    {
        return mode switch
        {
            "demo_full" => "full",
            "vanilla" => "vanilla",
            _ => "planner_critic"
        };
    }

    private static bool TryReadDataUri(string value, out byte[] bytes)
    {
        bytes = [];
        var marker = ";base64,";
        var index = value.IndexOf(marker, StringComparison.OrdinalIgnoreCase);
        if (!value.StartsWith("data:", StringComparison.OrdinalIgnoreCase) || index < 0) return false;
        bytes = Convert.FromBase64String(value[(index + marker.Length)..]);
        return true;
    }

    private static string ReadString(JsonElement element, params string[] names)
    {
        return ReadString(element, names, fallback: "");
    }

    private static string ReadString(JsonElement element, string[] names, string fallback)
    {
        foreach (var name in names)
        {
            if (element.ValueKind == JsonValueKind.Object && element.TryGetProperty(name, out var value))
            {
                return value.ValueKind switch
                {
                    JsonValueKind.String => value.GetString() ?? fallback,
                    JsonValueKind.Number => value.ToString(),
                    JsonValueKind.True => "true",
                    JsonValueKind.False => "false",
                    _ => fallback
                };
            }
        }
        return fallback;
    }

    private static string ReadString(JsonElement element, string first, string second, string fallback = "")
    {
        return ReadString(element, [first, second], fallback);
    }

    private static string ReadString(JsonElement element, string first, string second, string third, string fallback = "")
    {
        return ReadString(element, [first, second, third], fallback);
    }

    private static bool ReadBool(JsonElement element, string name)
    {
        if (!element.TryGetProperty(name, out var value)) return false;
        return value.ValueKind switch
        {
            JsonValueKind.True => true,
            JsonValueKind.False => false,
            JsonValueKind.String => bool.TryParse(value.GetString(), out var parsed) && parsed,
            _ => false
        };
    }

    private static bool ReadNestedBool(JsonElement element, string property, string nestedProperty)
    {
        return element.TryGetProperty(property, out var nested) && nested.ValueKind == JsonValueKind.Object && ReadBool(nested, nestedProperty);
    }
}
