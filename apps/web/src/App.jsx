import { activeReferenceUploadPolicy, referenceUploadSelectionError, referenceModelDimensionsError } from './lib/referenceUploadPolicy';
import { uploadReferenceFiles } from './lib/referenceUpload';
import { useTokenDance } from './hooks/useTokenDance';
import { TokenDanceRecovery, TokenDanceStatus } from './components/TokenDancePanel';
import AccountPage from './components/AccountPage';
import TokenDancePricing from './components/admin/TokenDancePricing';
import { workspaceEntry, selectWorkspaceEntry } from './lib/adminEntry';
import { presentRegistryModel, sortModelsNewestFirst } from './lib/modelPresentation'
import { minimaxRegion, regionApiKeySlot, selectRegionApiKeys, registryForRegions } from './lib/providerRegions'
import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  BarChart3,
  FileText,
  Github,
  Image as ImageIcon,
  Loader2,
  MessageCircle,
  MessageSquare,
  QrCode,
  Send,
  Settings2,
  ShieldCheck,
  Sparkles,
  Undo2,
  X,
} from 'lucide-react';
import {
  adminStatusRequest,
  abortReferenceUploadRequest,
  createJobRequest,
  fetchBackendHealth,
  getJobRequest,
  modelCapabilityRequest,
  modelRegistryRequest,
  optimizeInputsRequest,
  providerAccountCatalogRequest,
  finalizeReferenceUploadRequest,
  prepareReferenceUploadRequest,
  referenceLibraryRequest,
  refineImageRequest,
  submitFeedbackRequest,
  userJobsRequest,
} from '@paperbanana/api';
import {
  API_BASE_DEFAULT,
  AUTH_ENABLED,
  AUTH_REQUIRED,
  AUTH_UI_ENABLED,
  BENCH_ENABLED,
  CLIENT_VERSION,
  CUSTOM_API_BASE_ENABLED,
  LOCAL_CONSUMPTION_TEST,
  authClient,
  logoUrl,
} from './config';
import {
  INFOGRAPHIC_CATEGORIES,
  OUTPUT_FORMATS,
  PROVIDERS,
  REFERENCE_IMAGE_MODES,
  REFERENCE_IMAGE_LIMITS,
  RESOLUTION_OPTIONS,
  SAMPLE_METHOD,
  mainModelCanReadImages,
  supportedResolutions,
} from './constants';
import AspectRatioPicker from './components/AspectRatioPicker';
import AuthPanel from './components/AuthPanel';
import AuthUnavailablePanel from './components/AuthUnavailablePanel';
import FeaturedTemplateStudio from './components/FeaturedTemplateStudio';
import FeedbackDialog from './components/FeedbackDialog';
import GenerationSettingsDrawer from './components/GenerationSettingsDrawer';
import GuidePanel from './components/GuidePanel';
import InputOptimizationDialog from './components/InputOptimizationDialog';
import InputOptimizationFieldActions from './components/InputOptimizationFieldActions';
import useRefineUpload from './hooks/useRefineUpload';
import { refineUploadLimits, validateRefineDimensions, validateRefineFile, readImageDimensions } from './lib/refineUpload';
import JobStatus from './components/JobStatus';
import ModelRoutingSettings from './components/ModelRoutingSettings';
import ReferenceUploadPanel from './components/ReferenceUploadPanel';
import Select from './components/Select';
import TaskRecordsPanel from './components/TaskRecordsPanel';
import { useAuthSession } from './hooks/useAuthSession';
import { formatErrorMessage, formatOutputFormat, pollRetryDelay, shouldClearAuthForJobError } from './utils';
import { INPUT_LIMITS, officialApiBase, shouldPollJob, validateApiBase } from './lib/runtimePolicy';
import { buildAspectRatioOptions, normalizeSelectedAspectRatio } from './lib/aspectRatios';
import { attachFeaturedTemplateImages, featuredTemplateRequest } from './lib/featuredTemplates';
import { mergeProviderRegistry, modelRefinePresentation, uniqueRegistryModels } from './lib/modelRegistry';
import { buildReferencePageRequest } from './lib/referenceGallery';
import { normalizeRefineSource, refineRequestSource } from './lib/refineSource';
import {
  arkProbesForRoles,
  arkVerificationKey,
  buildModelSubmission,
  clearArkVerificationForRole,
  DEFAULT_WEB_PROVIDER,
  firstInvalidRequiredRoute,
  nextArkVerificationBatch,
  providerDefaultRoutes,
  requiredCreateRouteRoles,
  requiredRefineRouteRoles,
  scopedApiKeysForRoles,
  uniqueProvidersForRoles,
} from './lib/modelRouting';
import { appPath, isLoginEntry } from './appPaths';

const AdminWorkspace = lazy(() => import('./components/admin/AdminWorkspace'));
const AccountSettingsDialog = lazy(() => import('./components/AccountSettingsDialog'));
const ReferenceLibraryPanel = lazy(() => import('./components/ReferenceLibraryPanel'));
const RefinePanel = lazy(() => import('./components/RefinePanel'));
const WORKSPACE_TABS = [['generate', '生成候选图'], ['records', '任务记录'], ['refine', '精修图片'], ['account', '账户'], ['guide', '使用教程']];

const INPUT_OPTIMIZATION_TARGET_LABELS = Object.freeze({
  methodContent: '论文方法内容',
  caption: '目标图注',
  negativePrompt: '负向提示词',
  editInstruction: '精修指令',
});

function emptyInputOptimizationUndos() {
  return { methodContent: null, caption: null, negativePrompt: null, editInstruction: null };
}

export default function App() {
  const authSession = useAuthSession();
  const [activeTab, setActiveTab] = useState(() => workspaceEntry(window.location.search));
  const accountReturn = useRef({ tab: 'generate', scroll: 0 });
  const workspaceTab = activeTab === 'account' ? accountReturn.current.tab : activeTab;
  function openAccount() {
    selectTab('account');
  }
  function returnFromAccount() {
    selectTab(accountReturn.current.tab);
    requestAnimationFrame(() => window.scrollTo?.({ top: accountReturn.current.scroll }));
  }
  function selectTab(tab) {
    if (tab === activeTab) return;
    if (tab === 'account') {
      accountReturn.current = { tab: activeTab, scroll: window.scrollY };
      window.scrollTo?.({ top: 0 });
    }
    setShowGenerationSettings(false);
    selectWorkspaceEntry(tab);
    setActiveTab(tab);
  }
  useEffect(() => {
    const pop = () => {
      const tab = workspaceEntry(window.location.search);
      if (tab === 'account' && activeTab !== 'account') accountReturn.current = { tab: activeTab, scroll: window.scrollY };
      setShowGenerationSettings(false);
      setActiveTab(tab);
    };
    window.addEventListener('popstate', pop);
    return () => window.removeEventListener('popstate', pop);
  }, [activeTab]);
  const [showContactDialog, setShowContactDialog] = useState(false);
  const contactCloseRef = useRef(null);
  const [contactQrFailed, setContactQrFailed] = useState(false);
  const [showAuthPanel, setShowAuthPanel] = useState(() => isLoginEntry(window.location.search));
  const [showAccountDialog, setShowAccountDialog] = useState(false);
  const [showGenerationSettings, setShowGenerationSettings] = useState(false);
  const [generationFocusSetting, setGenerationFocusSetting] = useState('');
  const [inputOptimizationCredentialProvider, setInputOptimizationCredentialProvider] = useState('');
  const [apiBase, setApiBase] = useState(() => API_BASE_DEFAULT || officialApiBase(globalThis.location?.origin));
  const [configurationMode, setConfigurationMode] = useState(LOCAL_CONSUMPTION_TEST ? 'advanced' : 'simple');
  const [provider, setProvider] = useState(DEFAULT_WEB_PROVIDER);
  const [apiKeyRing, setApiKeys] = useState(() => Object.fromEntries(Object.keys(PROVIDERS).map((id) => [id, ''])));
  const [methodContent, setMethodContent] = useState(SAMPLE_METHOD);
  const [caption, setCaption] = useState('图 1：所提出的多智能体学术图示生成框架总览。');
  const [negativePrompt, setNegativePrompt] = useState('');
  const [inputIsDirty, setInputIsDirty] = useState(false);
  const [inputOptimizationGuidance, setInputOptimizationGuidance] = useState('');
  const [inputOptimizationUndos, setInputOptimizationUndos] = useState(emptyInputOptimizationUndos);
  const [isOptimizingInput, setIsOptimizingInput] = useState(false);
  const [inputOptimizationDialog, setInputOptimizationDialog] = useState({
    open: false,
    target: 'methodContent',
    original: '',
    candidate: '',
    inputs: null,
    status: 'loading',
    error: '',
  });
  const inputOptimizationSequenceRef = useRef(0);
  const activeInputOptimizationRef = useRef(0);
  const [infographicCategory, setInfographicCategory] = useState('method_framework');
  const [outputFormat, setOutputFormat] = useState('png');
  const [imageSize, setImageSize] = useState('1K');
  const [modelRoutes, setModelRoutes] = useState(() => providerDefaultRoutes(DEFAULT_WEB_PROVIDER, null, PROVIDERS));
  const [referenceImageMode, setReferenceImageMode] = useState('vision_model');
  const [referenceImages, setReferenceImages] = useState([]);
  const [mainModelCapability, setMainModelCapability] = useState(null);
  const referenceImagesRef = useRef([]);
  const [referenceUploadError, setReferenceUploadError] = useState('');
  const [isUploadingReferences, setIsUploadingReferences] = useState(false);
  const [isInspectingReferences, setIsInspectingReferences] = useState(false);
  const referenceInspectionRef = useRef(false);
  const [pipelineMode, setPipelineMode] = useState('demo_planner_critic');
  const [retrievalSetting, setRetrievalSetting] = useState('none');
  const [manualReferenceIds, setManualReferenceIds] = useState([]);
  const [referenceLibrary, setReferenceLibrary] = useState([]);
  const [featuredTemplates, setFeaturedTemplates] = useState(() => attachFeaturedTemplateImages([]));
  const [referencePageInfo, setReferencePageInfo] = useState({ page: 1, pageSize: 12, totalItems: 0, totalPages: 1, facets: { visualCategories: [], researchDomains: [] }, corpusVersion: '' });
  const referenceRequestRef = useRef({ sequence: 0, controller: null });
  const [referenceLibraryError, setReferenceLibraryError] = useState('');
  const [isLoadingReferenceLibrary, setIsLoadingReferenceLibrary] = useState(false);
  const [aspectRatio, setAspectRatio] = useState('16:9');
  const [numCandidates, setNumCandidates] = useState(1);
  const [maxCriticRounds, setMaxCriticRounds] = useState(LOCAL_CONSUMPTION_TEST ? 0 : 1);
  const [health, setHealth] = useState(null);
  const [healthError, setHealthError] = useState('');
  const [rawModelRegistry, setModelRegistry] = useState(null);
  const [providerRegions, setProviderRegions] = useState({ minimax: 'global' });
  const modelRegistry = useMemo(() => registryForRegions(rawModelRegistry, providerRegions), [rawModelRegistry, providerRegions]);
  const apiKeys = useMemo(() => selectRegionApiKeys(apiKeyRing, providerRegions), [apiKeyRing, providerRegions]);
  const [modelRegistryError, setModelRegistryError] = useState('');
  const [modelRegistryRetryNonce, setModelRegistryRetryNonce] = useState(0);
  const [mock, setMock] = useState(false);
  const [currentJobId, setCurrentJobId] = useState('');
  const [job, setJob] = useState(null);
  const latestJobRef = useRef(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [errorContext, setErrorContext] = useState('');
  const [pollRetryNonce, setPollRetryNonce] = useState(0);
  const [adminIdentity, setAdminIdentity] = useState('');
  const [userJobs, setUserJobs] = useState([]);
  const [userJobsError, setUserJobsError] = useState('');
  const [showFeedbackDialog, setShowFeedbackDialog] = useState(false);
  const [feedbackError, setFeedbackError] = useState('');
  const [feedbackSuccess, setFeedbackSuccess] = useState(false);
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);
  const [refineJobId, setRefineJobId] = useState('');
  const [refineJob, setRefineJob] = useState(null);
  const [refinePollError, setRefinePollError] = useState('');
  const refineSubmitLock = useRef(false);
  const refineRequestGeneration = useRef(0);
  const [refineInstruction, setRefineInstruction] = useState('');
  const [refineImageSize, setRefineImageSize] = useState('2K');
  const [refineAspectRatio, setRefineAspectRatio] = useState('16:9');
  const [refineError, setRefineError] = useState('');
  const [isSubmittingRefine, setIsSubmittingRefine] = useState(false);
  const [arkVerification, setArkVerification] = useState({});
  const [arkProbePaidConfirmed, setArkProbePaidConfirmed] = useState(false);
  const [isVerifyingArk, setIsVerifyingArk] = useState(false);
  const [arkVerificationError, setArkVerificationError] = useState('');
  const arkProbeGenerationRef = useRef(0);
  const arkActiveProbeRequestRef = useRef(0);
  const arkKeySnapshotRef = useRef('');
  const arkProbeRoutesSnapshotRef = useRef('');
  const currentUser = AUTH_ENABLED ? authSession.session?.user : null;
  const isAdmin = Boolean(currentUser?.id && adminIdentity === currentUser.id);
  const authReady = !AUTH_REQUIRED || Boolean(!authSession.isPending && currentUser);
  const apiBaseNormalized = useMemo(() => {
    try {
      return validateApiBase(apiBase, CUSTOM_API_BASE_ENABLED);
    } catch {
      return officialApiBase(globalThis.location?.origin);
    }
  }, [apiBase]);
  const tokenDance = useTokenDance(apiBaseNormalized, currentUser?.id, !authSession.isPending);
  const selectedInfographicCategory = INFOGRAPHIC_CATEGORIES.find(([id]) => id === infographicCategory) || INFOGRAPHIC_CATEGORIES[0];
  const isAdvancedMode = configurationMode === 'advanced';
  const isPlotCategory = infographicCategory === 'data_stat';
  const simpleModelRoutes = providerDefaultRoutes(provider, modelRegistry, PROVIDERS) || providerDefaultRoutes(provider, null, PROVIDERS);
  const activeModelRoutes = isAdvancedMode ? modelRoutes : simpleModelRoutes;
  const providerConfig = mergeProviderRegistry(PROVIDERS[activeModelRoutes.main.accessProvider], modelRegistry?.providers?.[activeModelRoutes.main.accessProvider]);
  const imageProviderConfig = mergeProviderRegistry(PROVIDERS[activeModelRoutes.image.accessProvider], modelRegistry?.providers?.[activeModelRoutes.image.accessProvider]);
  const visionProviderConfig = mergeProviderRegistry(PROVIDERS[activeModelRoutes.vision.accessProvider], modelRegistry?.providers?.[activeModelRoutes.vision.accessProvider]);
  const defaultMainModelLabel = findModelLabel(providerConfig.mainModels, activeModelRoutes.main.modelId);
  const defaultImageModelLabel = findModelLabel(imageProviderConfig.imageModels, activeModelRoutes.image.modelId);
  const defaultVisionModelLabel = findModelLabel(visionProviderConfig.visionModels || [], activeModelRoutes.vision.modelId);
  const activeMainModelName = activeModelRoutes.main.modelId;
  const activeImageGenModelName = activeModelRoutes.image.modelId;
  const activeReferenceVisionModelName = activeModelRoutes.vision.modelId;
  const activeMainRegistryEntry = modelRegistry?.providers?.[activeModelRoutes.main.accessProvider]?.models?.find((model) => model.id === activeMainModelName);
  const activeImageRegistryEntry = modelRegistry?.providers?.[activeModelRoutes.image.accessProvider]?.models?.find((model) => model.id === activeImageGenModelName);
  const activeVisionRegistryEntry = modelRegistry?.providers?.[activeModelRoutes.vision.accessProvider]?.models?.find((model) => model.id === activeReferenceVisionModelName);
  const refineCapability = modelRefinePresentation(activeImageRegistryEntry);
  const activeRefineUploadLimits = refineUploadLimits(modelRegistry?.refineUpload, activeModelRoutes[refineCapability.mode === 'direct-edit' ? 'image' : 'vision'], refineCapability.mode === 'direct-edit' ? 'refine' : 'generation');
  const { source: refineSource, setSource: setRefineSource, upload: refineUpload, selectFiles: selectRefineFiles, retry: retryRefineUpload } = useRefineUpload({
    apiBase: apiBaseNormalized, health, limits: activeRefineUploadLimits, authReady, ownerId: currentUser?.id || '',
  });
  const inputOptimizationSupported = Number(modelRegistry?.inputOptimizationContractVersion) >= 1;
  const refineOptimizationSupported = inputOptimizationSupported && modelRegistry?.inputOptimizationTargets?.includes('editInstruction');
  const selectedModelNotes = uniqueRegistryModels([activeMainRegistryEntry, activeImageRegistryEntry, activeVisionRegistryEntry].filter(Boolean));
  // 输出清晰度可选项随 provider/图像生成模型变化（自动精修由清晰度档位驱动）。
  const resolutionValues = activeImageRegistryEntry?.capabilities?.resolutions?.length
    ? activeImageRegistryEntry.capabilities.resolutions
    : supportedResolutions(activeModelRoutes.image.accessProvider, activeImageGenModelName);
  const resolutionOptions = RESOLUTION_OPTIONS.filter(([value]) => resolutionValues.includes(value));
  const generationAspectRatioOptions = buildAspectRatioOptions({
    capabilities: activeImageRegistryEntry?.capabilities,
    capabilityField: 'aspectRatios',
    resolution: imageSize,
    modelLabel: activeImageRegistryEntry?.label || activeImageGenModelName,
  });
  const refineAspectRatioOptions = buildAspectRatioOptions({
    capabilities: activeImageRegistryEntry?.capabilities,
    capabilityField: 'refineAspectRatios',
    resolution: refineImageSize,
    modelLabel: activeImageRegistryEntry?.label || activeImageGenModelName,
  });
  const refineResolutionMetadata = activeImageRegistryEntry?.capabilities;
  const refineResolutionValues = refineResolutionMetadata
    && Object.prototype.hasOwnProperty.call(refineResolutionMetadata, 'refineResolutions')
    ? (Array.isArray(refineResolutionMetadata.refineResolutions) ? refineResolutionMetadata.refineResolutions : [])
    : ['2K'];
  const refineResolutionOptions = RESOLUTION_OPTIONS.filter(([value]) => refineResolutionValues.includes(value));
  const defaultRefineImageSize = refineResolutionOptions[0]?.[0] || '';
  // 有参考图时以后端能力目录为权威；能力未知时默认走独立识别，避免把文本模型误当视觉模型。
  const mainModelCanRead = referenceImages.length
    ? mainModelCapability?.status === 'supported' && mainModelCapability?.supportsReferenceImages !== false
    : mainModelCanReadImages(activeModelRoutes.main.accessProvider, activeMainModelName);
  const activeReferenceImageMode = isAdvancedMode
    ? referenceImageMode
    : (mainModelCanRead ? 'main_model' : 'vision_model');
  const activeReferenceUpload = activeReferenceUploadPolicy(modelRegistry?.referenceUpload, activeModelRoutes[activeReferenceImageMode === 'main_model' ? 'main' : 'vision']);
  const referenceSelectionIssue = referenceUploadSelectionError(referenceImages, activeReferenceUpload);
  const mainModelDirectUnsupported = referenceImages.length > 0
    && activeReferenceImageMode === 'main_model'
    && !mainModelCanRead;
  const needsReferenceVisionModel = referenceImages.length > 0 && activeReferenceImageMode !== 'main_model';
  const canSelectMainModelDirect = mainModelCanRead;
  const referenceCapabilityNote = referenceImages.length
    ? (mainModelCanRead
        ? '当前主模型支持图像理解，将用主模型直读参考图。'
        : '当前主模型为文本模型，将使用独立识别模型读取参考图。')
    : '';
  const effectivePipelineMode = isAdvancedMode ? pipelineMode : 'demo_planner_critic';
  const effectiveRetrievalSetting = isAdvancedMode && !referenceImages.length ? retrievalSetting : 'none';
  const effectiveTaskName = isPlotCategory ? 'plot' : 'diagram';
  const createRouteRoles = requiredCreateRouteRoles({
    modelRoutes: activeModelRoutes,
    taskName: effectiveTaskName,
    outputFormat,
    pipelineMode: effectivePipelineMode === 'demo_planner_critic' ? 'planner_critic' : effectivePipelineMode === 'demo_full' ? 'full' : effectivePipelineMode,
    retrievalSetting: effectiveRetrievalSetting,
    imageSize,
    imageRefineMode: refineCapability.mode,
    referenceImages,
    referenceImageMode: activeReferenceImageMode,
  }, isAdvancedMode ? Number(maxCriticRounds) : 1);
  const refineRouteRoles = requiredRefineRouteRoles({ refineMode: refineCapability.mode });
  const credentialRouteRoles = workspaceTab === 'refine' ? refineRouteRoles : createRouteRoles;
  const credentialProviders = uniqueProvidersForRoles(activeModelRoutes, credentialRouteRoles);
  const settingsCredentialProviders = inputOptimizationCredentialProvider
    && !credentialProviders.includes(inputOptimizationCredentialProvider)
    ? [inputOptimizationCredentialProvider, ...credentialProviders]
    : credentialProviders;
  const activeArkProbes = arkProbesForRoles(activeModelRoutes, credentialRouteRoles);
  const activeArkProbeSignature = activeArkProbes.map(arkVerificationKey).join('|');
  arkKeySnapshotRef.current = apiKeys.ark;
  arkProbeRoutesSnapshotRef.current = activeArkProbeSignature;
  const missingCredentialProviders = credentialProviders.filter((routeProvider) => routeProvider === 'tokendance' ? !tokenDance.connection.connected : !apiKeys[routeProvider]?.trim());
  const refineConfigSummary = `${imageProviderConfig.label} · ${activeImageRegistryEntry?.label || activeImageGenModelName}`;
  const refineRunning = isSubmittingRefine || refineJob?.status === 'queued' || refineJob?.status === 'running';
  const refineSourcePolicyIssue = activeRefineUploadLimits?.submissionPolicy
    ? referenceModelDimensionsError(refineSource, activeRefineUploadLimits.submissionPolicy) : '';
  const refineSubmitHint = !authReady ? '请先登录，再提交精修。'
    : refineRunning ? '正在处理当前精修，请等待完成。'
    : ['validating', 'uploading', 'checking'].includes(refineUpload.status) ? '请等待原图上传与校验完成。'
    : refineSourcePolicyIssue ? refineSourcePolicyIssue
    : !Object.keys(refineRequestSource(refineSource)).length ? '请先选择并上传一张原图。'
    : refineCapability.mode === 'none' ? '请在精修设置中选择支持精修的图像模型。'
    : !refineResolutionOptions.length || !refineAspectRatioOptions.some(option => option.value === refineAspectRatio) ? '请在精修设置中选择可用模型和参数。'
    : missingCredentialProviders.length ? '请在精修设置中填写所需接入密钥。'
    : refineInstruction.trim().length < 3 ? '请填写至少 3 个字符的精修指令。'
    : refineInstruction.length > 2000 ? '精修指令不能超过 2000 个字符。' : '';

  useEffect(() => {
    let cancelled = false;
    fetchBackendHealth(apiBaseNormalized)
      .then((data) => {
        if (!cancelled) {
          setHealth(data);
          setHealthError('');
        }
      })
      .catch((healthRequestError) => {
        if (!cancelled) {
          setHealth(null);
          setHealthError(healthRequestError?.message || '后端健康检查失败');
        }
      });
    return () => {
      cancelled = true;
    };
  }, [apiBaseNormalized]);

  useEffect(() => {
    if (!health) return undefined;
    let cancelled = false;
    modelRegistryRequest(apiBaseNormalized, health)
      .then((registry) => {
        if (cancelled) return;
        setModelRegistry({ ...registry, providers: Object.fromEntries(Object.entries(registry.providers || {}).map(([id, entry]) => [id, { ...entry, models: sortModelsNewestFirst(entry.models.map((model) => presentRegistryModel(id, model))) }])) });
        const unavailable = Object.values(registry.unavailableProviders || {}).filter(Boolean);
        setModelRegistryError(unavailable.join('；'));
      })
      .catch((registryRequestError) => {
        if (!cancelled) {
          setModelRegistry(null);
          setModelRegistryError(registryRequestError?.message || '模型目录加载失败');
        }
      });
    return () => {
      cancelled = true;
    };
  }, [apiBaseNormalized, health, modelRegistryRetryNonce]);

  useEffect(() => {
    if (!health) return undefined;
    let cancelled = false;
    referenceLibraryRequest(apiBaseNormalized, health, featuredTemplateRequest())
      .then((result) => {
        if (!cancelled) setFeaturedTemplates(attachFeaturedTemplateImages(result.references));
      })
      .catch(() => {
        if (!cancelled) setFeaturedTemplates(attachFeaturedTemplateImages([]));
      });
    return () => {
      cancelled = true;
    };
  }, [apiBaseNormalized, health]);

  useEffect(() => {
    if (!modelRegistry || modelRegistry.providers?.[provider]) return;
    const available = [DEFAULT_WEB_PROVIDER, ...Object.keys(modelRegistry.providers || {})].find(id =>
      modelRegistry.providers?.[id] && providerDefaultRoutes(id, modelRegistry, PROVIDERS));
    if (available) setProvider(available);
  }, [modelRegistry, provider]);

  // provider / 图像生成模型变化时，若当前清晰度不再被支持则收敛到第一档。
  useEffect(() => {
    const supported = activeImageRegistryEntry?.capabilities?.resolutions?.length
      ? activeImageRegistryEntry.capabilities.resolutions
      : supportedResolutions(activeModelRoutes.image.accessProvider, activeImageGenModelName);
    if (!supported.includes(imageSize)) setImageSize(supported[0]);
  }, [activeModelRoutes.image.accessProvider, activeImageGenModelName, imageSize, activeImageRegistryEntry]);

  useEffect(() => {
    if (!activeImageRegistryEntry) return;
    const normalized = normalizeSelectedAspectRatio(aspectRatio, generationAspectRatioOptions);
    if (normalized !== aspectRatio) setAspectRatio(normalized);
  }, [activeModelRoutes.image.accessProvider, activeImageGenModelName, activeImageRegistryEntry, aspectRatio, imageSize]);

  useEffect(() => {
    if (!activeImageRegistryEntry) return;
    const normalized = normalizeSelectedAspectRatio(refineAspectRatio, refineAspectRatioOptions);
    if (normalized !== refineAspectRatio) setRefineAspectRatio(normalized);
  }, [activeModelRoutes.image.accessProvider, activeImageGenModelName, activeImageRegistryEntry, refineAspectRatio, refineImageSize]);

  // 精修清晰度是独立执行能力；路由或目录变化时回到新模型声明的第一档。
  useEffect(() => {
    setRefineImageSize(defaultRefineImageSize);
  }, [activeModelRoutes.image.accessProvider, activeImageGenModelName, modelRegistry, defaultRefineImageSize]);

  // 参考图模式按固定能力派生：主模型能直读→主模型直读，否则→独立识别模型。
  // provider/主模型变化时重算（之后用户仍可手动切换两种模式）。
  useEffect(() => {
    setReferenceImageMode(mainModelCanReadImages(activeModelRoutes.main.accessProvider, activeMainModelName) ? 'main_model' : 'vision_model');
  }, [activeModelRoutes.main.accessProvider, activeMainModelName]);

  useEffect(() => {
    setInputOptimizationCredentialProvider('');
  }, [activeModelRoutes.main.accessProvider, activeMainModelName]);

  useEffect(() => {
    if (!referenceImages.length) {
      setMainModelCapability(null);
      return undefined;
    }

    let cancelled = false;
    setMainModelCapability({ status: 'loading', reason: '正在检查主模型能力。' });
    modelCapabilityRequest(apiBaseNormalized, health, activeModelRoutes.main.accessProvider, activeMainModelName)
      .then((data) => {
        if (!cancelled) setMainModelCapability(data);
      })
      .catch((err) => {
        if (!cancelled) {
          setMainModelCapability({
            status: 'unknown',
            supportsReferenceImages: false,
            reason: err.message || '模型能力暂时无法确认。',
            source: 'client-error',
            cached: false,
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [apiBaseNormalized, health, activeModelRoutes.main.accessProvider, activeMainModelName, referenceImages.length]);

  useEffect(() => {
    if (!referenceImages.length || !mainModelCapability || mainModelCapability.status === 'loading') return;
    setReferenceImageMode(mainModelCapability.status === 'supported' && mainModelCapability.supportsReferenceImages !== false
      ? 'main_model'
      : 'vision_model');
  }, [mainModelCapability, referenceImages.length]);

  useEffect(() => {
    referenceImagesRef.current = referenceImages;
  }, [referenceImages]);

  useEffect(() => () => {
    referenceImagesRef.current.forEach((image) => URL.revokeObjectURL(image.previewUrl));
  }, []);

  useEffect(() => {
    if (!showContactDialog) return undefined;
    const previous = document.activeElement;
    contactCloseRef.current?.focus();
    const onKeyDown = (event) => {
      if (event.key === 'Escape') setShowContactDialog(false);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      previous?.focus?.();
    };
  }, [showContactDialog]);

  useEffect(() => {
    if (!currentJobId) return undefined;
    let cancelled = false;
    let timer;
    let retryAttempt = 0;
    const load = async () => {
      try {
        const data = await getJobRequest(apiBaseNormalized, health, currentJobId);
        if (!cancelled) {
          retryAttempt = 0;
          latestJobRef.current = data;
          setJob(data);
          setError('');
          setErrorContext('');
          if (shouldPollJob(data)) {
            timer = setTimeout(load, globalThis.document?.hidden ? 10000 : 3000);
          }
        }
      } catch (err) {
        const latestJob = latestJobRef.current;
        const hasVisibleResult = latestJob?.status === 'succeeded' || (latestJob?.result_images || []).some((image) => image.url);
        if (!cancelled) {
          if (!hasVisibleResult) {
            setError(err.message);
            setErrorContext('poll');
          }
          retryAttempt += 1;
          const delay = pollRetryDelay(err, retryAttempt, Boolean(globalThis.document?.hidden));
          if (delay === null) {
            setErrorContext('poll-stopped');
            if (shouldClearAuthForJobError(err)) authSession.clear();
          } else {
            timer = setTimeout(load, delay);
          }
        }
      }
    };
    load();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [apiBaseNormalized, currentJobId, health, pollRetryNonce]);

  useEffect(() => {
    if (!isAdvancedMode || retrievalSetting !== 'manual' || referenceImages.length) return undefined;
    let cancelled = false;
    loadReferenceLibrary({ silent: true, cancelledRef: () => cancelled, page: 1 });
    return () => {
      cancelled = true;
    };
  }, [apiBaseNormalized, health, isAdvancedMode, retrievalSetting, referenceImages.length]);

  useEffect(() => {
    if (!AUTH_ENABLED || !currentUser) return undefined;
    let cancelled = false;
    loadUserJobs({ silent: true, cancelledRef: () => cancelled });
    return () => {
      cancelled = true;
    };
  }, [apiBaseNormalized, currentUser?.id, health]);

  useEffect(() => {
    let cancelled = false;
    if (!AUTH_ENABLED || authSession.isPending || !currentUser) {
      setAdminIdentity('');
      return undefined;
    }

    adminStatusRequest(apiBaseNormalized, health)
      .then((data) => {
        if (!cancelled) setAdminIdentity(data.isAdmin ? currentUser.id : '');
      })
      .catch(() => {
        if (!cancelled) setAdminIdentity('');
      });

    return () => {
      cancelled = true;
    };
  }, [apiBaseNormalized, authSession.isPending, currentUser?.id, currentUser?.email, health]);

  async function addReferenceFiles(files) {
    if (referenceInspectionRef.current || isSubmitting || isUploadingReferences) return;
    setReferenceUploadError('');
    if (!files.length) return;
    if (isAdvancedMode && retrievalSetting !== 'none') {
      setReferenceUploadError('请先将检索设置切换为“不使用检索”，再上传参考图。');
      return;
    }

    const availableSlots = activeReferenceUpload.platform.maxCount - referenceImages.length;
    if (availableSlots <= 0) {
      setReferenceUploadError(`最多只能上传 ${activeReferenceUpload.platform.maxCount} 张参考图。`);
      return;
    }

    referenceInspectionRef.current = true;
    setIsInspectingReferences(true);
    try {
      const accepted = [];
      for (const file of files.slice(0, availableSlots)) {
        const mimeType = normalizeReferenceMimeType(file);
        if (!activeReferenceUpload.platform.mimeTypes.includes(mimeType)) {
          setReferenceUploadError('参考图仅支持 PNG、JPG、WebP 或 SVG。');
          continue;
        }
        if (!file.size || file.size > activeReferenceUpload.platform.maxBytes) {
          setReferenceUploadError(`单张原图须大于 0 且不超过 ${activeReferenceUpload.platform.maxBytes / 1024 / 1024}MiB。`);
          continue;
        }
        const previewUrl = URL.createObjectURL(file);
        let dimensions;
        try {
          dimensions = await readImageDimensions(previewUrl);
          validateRefineDimensions(dimensions, activeReferenceUpload.platform);
        } catch (error) { URL.revokeObjectURL(previewUrl); setReferenceUploadError(error.message); continue; }
        accepted.push({
          ...dimensions,
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
          file,
          filename: file.name || `reference-${referenceImages.length + accepted.length + 1}.${extensionForMimeType(mimeType)}`,
          mimeType,
          size: file.size,
          previewUrl,
        });
      }

      if (files.length > availableSlots) {
        setReferenceUploadError(`最多只能上传 ${activeReferenceUpload.platform.maxCount} 张参考图，已忽略多余文件。`);
      }

      if (accepted.length) {
        setReferenceImages((current) => [...current, ...accepted]);
      }
    } finally {
      referenceInspectionRef.current = false;
      setIsInspectingReferences(false);
    }
  }

  function removeReferenceImage(id) {
    setReferenceImages((current) => {
      const target = current.find((image) => image.id === id);
      if (target) URL.revokeObjectURL(target.previewUrl);
      return current.filter((image) => image.id !== id);
    });
  }

  async function uploadReferencesForJob() {
    if (!referenceImages.length) return [];

    if (referenceSelectionIssue) throw new Error(referenceSelectionIssue);
    setIsUploadingReferences(true);
    setReferenceUploadError('');
    let prepared;
    try {
      const uploadItems = [];
      for (const image of referenceImages) {
        uploadItems.push({
          clientId: `${image.id}:original`,
          imageId: image.id,
          role: 'original',
          file: image.file,
          filename: image.filename,
          mimeType: image.mimeType,
          size: image.size,
        });
      }

      prepared = await prepareReferenceUploadRequest(
        apiBaseNormalized,
        health,
        uploadItems.map(({ clientId, role, filename, mimeType, size }) => ({ clientId, role, filename, mimeType, size })),
      );
      const uploadMap = new Map((prepared.uploads || []).map((upload) => [upload.clientId, upload]));

      await uploadReferenceFiles(uploadItems, uploadMap, activeReferenceUpload.platform.uploadConcurrency);

      const lifecycleUploads = (prepared.uploads || []).map((upload) => ({
        objectKey: upload.objectKey,
        uploadToken: upload.uploadToken,
        mimeType: upload.mimeType,
        size: upload.size,
        filename: upload.filename,
      }));
      await finalizeReferenceUploadRequest(apiBaseNormalized, health, lifecycleUploads);

      const references = [];
      for (const image of referenceImages) {
        const original = uploadMap.get(`${image.id}:original`);
        if (!original) throw new Error('参考图上传结果缺少原图记录。');
        const reference = {
          filename: image.filename,
          mimeType: image.mimeType,
          size: image.size,
          objectKey: original.objectKey,
          uploadToken: original.uploadToken,
        };
        references.push(reference);
      }

      return references;
    } catch (uploadError) {
      if (typeof prepared !== 'undefined' && prepared?.uploads?.length) {
        const lifecycleUploads = prepared.uploads.map((upload) => ({
          objectKey: upload.objectKey,
          uploadToken: upload.uploadToken,
          mimeType: upload.mimeType,
          size: upload.size,
          filename: upload.filename,
        }));
        await abortReferenceUploadRequest(apiBaseNormalized, health, lifecycleUploads).catch(() => {});
      }
      throw uploadError;
    } finally {
      setIsUploadingReferences(false);
    }
  }

  useEffect(() => {
    if (!refineJobId) return undefined;
    let cancelled = false;
    let timer;
    let failures = 0;
    async function poll() {
      try {
        const data = await getJobRequest(apiBaseNormalized, health, refineJobId);
        if (cancelled) return;
        failures = 0;
        setRefinePollError('');
        setRefineJob(data);
        if (shouldPollJob(data)) timer = setTimeout(poll, globalThis.document?.hidden ? 10000 : 3000);
        else if (currentUser) void loadUserJobs({ silent: true });
      } catch (error) {
        if (cancelled) return;
        setRefinePollError(error.message || '暂时无法获取精修状态，正在重试。');
        const delay = pollRetryDelay(error, ++failures, Boolean(globalThis.document?.hidden));
        if (delay === null) {
          setRefineJobId('');
          setRefineJob(null);
          if (shouldClearAuthForJobError(error)) authSession.clear();
        } else timer = setTimeout(poll, delay);
      }
    }
    void poll();
    return () => { cancelled = true; clearTimeout(timer); };
  }, [apiBaseNormalized, health, refineJobId]);

  useEffect(() => {
    refineRequestGeneration.current += 1;
    setRefineJobId('');
    setRefineJob(null);
    setRefinePollError('');
    setRefineError('');
    setInputOptimizationUndos(current => ({ ...current, editInstruction: null }));
    if (inputOptimizationDialog.target === 'editInstruction') closeInputOptimization();
  }, [refineSource.url]);

  async function loadReferenceLibrary(options = {}) {
    if (!options.silent) setReferenceLibraryError('');
    const sequence = referenceRequestRef.current.sequence + 1;
    referenceRequestRef.current.controller?.abort();
    const controller = new AbortController();
    referenceRequestRef.current = { sequence, controller };
    setIsLoadingReferenceLibrary(true);
    try {
      const request = buildReferencePageRequest(options);
      const data = await referenceLibraryRequest(apiBaseNormalized, health, { ...request, signal: controller.signal });
      if (options.cancelledRef?.() || referenceRequestRef.current.sequence !== sequence) return;
      setReferenceLibrary(data.references || []);
      setReferencePageInfo({
        page: data.page,
        pageSize: data.pageSize,
        totalItems: data.totalItems,
        totalPages: data.totalPages,
        facets: data.facets,
        corpusVersion: data.corpusVersion,
      });
    } catch (err) {
      if (options.cancelledRef?.() || err.name === 'AbortError' || referenceRequestRef.current.sequence !== sequence) return;
      setReferenceLibraryError(err.message);
    } finally {
      if (!options.cancelledRef?.() && referenceRequestRef.current.sequence === sequence) setIsLoadingReferenceLibrary(false);
    }
  }

  function toggleManualReference(id) {
    setManualReferenceIds((current) => {
      if (current.includes(id)) return current.filter((item) => item !== id);
      if (current.length >= 10) return current;
      return [...current, id];
    });
  }

  function handleConfigurationModeChange(nextMode) {
    if (nextMode === configurationMode) return;
    if (nextMode === 'advanced') setModelRoutes(simpleModelRoutes);
    if (nextMode === 'simple') setProvider(activeModelRoutes.main.accessProvider);
    arkProbeGenerationRef.current += 1;
    arkActiveProbeRequestRef.current = 0;
    setIsVerifyingArk(false);
    setArkVerification({});
    setArkProbePaidConfirmed(false);
    setArkVerificationError('');
    setConfigurationMode(nextMode);
  }

  function handleSimpleProviderChange(nextProvider) {
    setProvider(nextProvider);
    arkProbeGenerationRef.current += 1;
    arkActiveProbeRequestRef.current = 0;
    setIsVerifyingArk(false);
    setArkVerification({});
    setArkProbePaidConfirmed(false);
    setArkVerificationError('');
  }

  function handleModelRouteChange(role, route) {
    setModelRoutes((current) => ({ ...current, [role]: route }));
    arkProbeGenerationRef.current += 1;
    arkActiveProbeRequestRef.current = 0;
    setIsVerifyingArk(false);
    setArkVerification((current) => clearArkVerificationForRole(current, role));
    if (role === 'image') setArkProbePaidConfirmed(false);
    setArkVerificationError('');
  }

  function handleApiKeyChange(routeProvider, value) {
    setApiKeys((current) => ({ ...current, [regionApiKeySlot(routeProvider, providerRegions)]: value }));
    if (routeProvider === 'ark') {
      arkKeySnapshotRef.current = value;
      arkProbeGenerationRef.current += 1;
      arkActiveProbeRequestRef.current = 0;
      setIsVerifyingArk(false);
      setArkVerification({});
      setArkProbePaidConfirmed(false);
      setArkVerificationError('');
    }
  }

  async function verifySelectedArkModels() {
    const { probes, confirmPaidImageProbe } = nextArkVerificationBatch(activeArkProbes, arkVerification, arkProbePaidConfirmed);
    if (!probes.length || !apiKeys.ark?.trim()) return;
    const requestSnapshot = {
      generation: arkProbeGenerationRef.current + 1,
      arkKey: apiKeys.ark,
      selectedProbeRoutes: activeArkProbeSignature,
    };
    arkProbeGenerationRef.current = requestSnapshot.generation;
    arkActiveProbeRequestRef.current = requestSnapshot.generation;
    const requestedProbeKeys = new Set(probes.map(arkVerificationKey));
    const ownsBusyState = () => arkActiveProbeRequestRef.current === requestSnapshot.generation;
    const canApplyResult = () => ownsBusyState()
      && arkProbeGenerationRef.current === requestSnapshot.generation
      && arkKeySnapshotRef.current === requestSnapshot.arkKey
      && arkProbeRoutesSnapshotRef.current === requestSnapshot.selectedProbeRoutes;
    setIsVerifyingArk(true);
    setArkVerificationError('');
    try {
      const result = await providerAccountCatalogRequest(apiBaseNormalized, health, {
        provider: 'ark',
        apiKeys: { ark: apiKeys.ark },
        probes,
        confirmPaidImageProbe,
      });
      if (!canApplyResult()) return;
      setArkVerification((current) => ({
        ...current,
        ...Object.fromEntries((result.probeResults || [])
          .filter((probe) => requestedProbeKeys.has(arkVerificationKey(probe)))
          .map((probe) => [arkVerificationKey(probe), probe.state])),
      }));
    } catch (verificationError) {
      if (canApplyResult()) setArkVerificationError(verificationError?.message || String(verificationError));
    } finally {
      if (ownsBusyState()) {
        arkActiveProbeRequestRef.current = 0;
        setIsVerifyingArk(false);
      }
    }
  }

  function currentInputOptimizationContext() {
    const mainRoute = activeModelRoutes?.main;
    if (!mainRoute?.accessProvider
      || !mainRoute?.modelId
      || activeMainRegistryEntry?.selectable !== true
      || !activeMainRegistryEntry?.roles?.includes('main')) {
      setInputOptimizationCredentialProvider('');
      setInputOptimizationGuidance('请先在生成设置中选择一个可用的主模型，再优化输入。');
      setGenerationFocusSetting('main-model');
      setShowGenerationSettings(true);
      return null;
    }
    if (mainRoute.accessProvider === 'minimax' && minimaxRegion(providerRegions) === 'cn' && !modelRegistry?.providerRegionContractVersion) {
      setInputOptimizationGuidance('当前服务端尚未支持 MiniMax 国内区域，请等待服务端更新。');
      return null;
    }
    const apiKey = apiKeys[mainRoute.accessProvider]?.trim();
    if (!apiKey && !(mainRoute.accessProvider === 'tokendance' && tokenDance.connection.connected)) {
      setInputOptimizationCredentialProvider(mainRoute.accessProvider);
      setInputOptimizationGuidance('请先在生成设置中填写当前主模型接入渠道的密钥。');
      setGenerationFocusSetting('api-key');
      setShowGenerationSettings(true);
      return null;
    }
    return {
      mainRoute: { accessProvider: mainRoute.accessProvider, modelId: mainRoute.modelId },
      providerRegions: mainRoute.accessProvider === 'minimax' ? providerRegions : undefined,
      apiKey,
    };
  }

  async function runInputOptimization(target, inputs) {
    if (activeInputOptimizationRef.current) return;
    const context = currentInputOptimizationContext();
    if (!context) return;
    const requestId = inputOptimizationSequenceRef.current + 1;
    inputOptimizationSequenceRef.current = requestId;
    activeInputOptimizationRef.current = requestId;
    setIsOptimizingInput(true);
    setInputOptimizationGuidance('');
    setInputOptimizationDialog({
      open: true,
      target,
      original: inputs[target],
      candidate: '',
      inputs,
      status: 'loading',
      error: '',
    });
    try {
      const result = await optimizeInputsRequest(apiBaseNormalized, health, {
        target,
        inputs,
        mainRoute: context.mainRoute,
        providerRegions: context.providerRegions,
        apiKey: context.apiKey,
      });
      if (result.target !== target) throw new Error('优化结果与请求输入栏不一致。');
      if (inputOptimizationSequenceRef.current !== requestId) return;
      setInputOptimizationDialog((current) => ({
        ...current,
        candidate: String(result.optimizedText ?? ''),
        status: 'success',
        error: '',
      }));
    } catch (optimizationError) {
      if (inputOptimizationSequenceRef.current !== requestId) return;
      setInputOptimizationDialog((current) => ({
        ...current,
        candidate: '',
        status: 'error',
        error: optimizationError?.message || String(optimizationError),
      }));
    } finally {
      if (activeInputOptimizationRef.current === requestId) {
        activeInputOptimizationRef.current = 0;
        setIsOptimizingInput(false);
      }
    }
  }

  function requestInputOptimization(target) {
    const inputs = target === 'editInstruction'
      ? { methodContent: '', caption: '', negativePrompt: '', editInstruction: refineInstruction }
      : { methodContent, caption, negativePrompt };
    void runInputOptimization(target, inputs);
  }

  function closeInputOptimization() {
    inputOptimizationSequenceRef.current += 1;
    setInputOptimizationDialog((current) => ({
      ...current,
      open: false,
      candidate: '',
      inputs: null,
      error: '',
    }));
  }

  function retryInputOptimization() {
    if (!inputOptimizationDialog.inputs || activeInputOptimizationRef.current) return;
    void runInputOptimization(inputOptimizationDialog.target, inputOptimizationDialog.inputs);
  }

  function setInputValue(target, value) {
    if (target === 'methodContent') setMethodContent(value);
    else if (target === 'caption') setCaption(value);
    else if (target === 'editInstruction') setRefineInstruction(value);
    else setNegativePrompt(value);
  }

  function handleInputValueChange(target, value) {
    setInputValue(target, value);
    setInputIsDirty(true);
    setInputOptimizationUndos((current) => current[target] === null ? current : { ...current, [target]: null });
  }

  function adoptInputOptimization() {
    if (inputOptimizationDialog.status !== 'success') return;
    const { target, original, candidate } = inputOptimizationDialog;
    setInputValue(target, candidate);
    setInputOptimizationUndos((current) => ({ ...current, [target]: original }));
    setInputIsDirty(true);
    closeInputOptimization();
  }

  function restoreInputBeforeOptimization(target) {
    const snapshot = inputOptimizationUndos[target];
    if (snapshot === null) return;
    setInputValue(target, snapshot);
    setInputOptimizationUndos((current) => ({ ...current, [target]: null }));
    setInputIsDirty(true);
  }

  function clearInputOptimizationUndos() {
    setInputOptimizationUndos(emptyInputOptimizationUndos());
  }

  function inputOptimizationDisabledReason(target) {
    if (isOptimizingInput) return '已有输入正在优化，请等待当前请求完成。';
    if (target === 'editInstruction' && refineRunning) return '精修处理中，暂时不能优化指令。';
    if (target === 'editInstruction' && !refineInstruction.trim()) return '请先填写精修指令。';
    if (target === 'methodContent' && !methodContent.trim()) return '请先填写论文方法内容。';
    if (target === 'caption' && !caption.trim()) return '请先填写目标图注。';
    if (target === 'negativePrompt' && !methodContent.trim() && !caption.trim() && !negativePrompt.trim()) {
      return '请先填写三栏中的至少一栏。';
    }
    return '';
  }

  async function submitJob(event) {
    event.preventDefault();
    if (referenceInspectionRef.current) { setReferenceUploadError('正在检查参考图尺寸，请完成后再生成。'); return; }
    setError('');
    setErrorContext('');
    if (referenceSelectionIssue) { setReferenceUploadError(referenceSelectionIssue); return; }
    let modelSubmission;
    try {
      modelSubmission = buildModelSubmission({ configurationMode, modelRoutes: activeModelRoutes, registry: modelRegistry, providerRegions });
    } catch (routingError) {
      setGenerationFocusSetting('configuration-mode');
      setShowGenerationSettings(true);
      setError(routingError.message);
      setErrorContext('configuration');
      return;
    }
    if (activeImageRegistryEntry?.capabilities?.requiresSourceImage && outputFormat !== 'svg') {
      setError('当前型号仅支持图像编辑，请在精修中使用或更换生图模型。');
      return;
    }
    if (createRouteRoles.includes('image') && !generationAspectRatioOptions.some((option) => option.value === aspectRatio)) { setError('当前比例或清晰度不可用，请重新选择图像设置。'); setShowGenerationSettings(true); return; }
    const canMock = isAdvancedMode && mock && health?.mock_enabled;
    const missingSetting = firstMissingGenerationSetting({
      missingCredentialProviders: canMock ? [] : missingCredentialProviders,
      requiredRouteRoles: createRouteRoles,
      isAdvancedMode,
      retrievalSetting,
      manualReferenceIds,
      needsReferenceVisionModel,
      mainModelDirectUnsupported,
      outputFormat,
      mainEntry: activeMainRegistryEntry,
      imageEntry: activeImageRegistryEntry,
      visionEntry: activeVisionRegistryEntry,
    });
    if (missingSetting) {
      setGenerationFocusSetting(missingSetting.setting);
      setShowGenerationSettings(true);
      setError(missingSetting.message);
      setErrorContext('configuration');
      return;
    }
    if (methodContent.trim().length < 20 || caption.trim().length < 3) {
      setError(methodContent.trim().length < 20 ? '论文方法内容至少需要 20 个字符。' : '目标图注至少需要 3 个字符。');
      setErrorContext('input');
      return;
    }
    setIsSubmitting(true);
    setJob(null);
    latestJobRef.current = null;
    try {
      const uploadedReferenceImages = await uploadReferencesForJob();
      const scopedApiKeys = scopedApiKeysForRoles(activeModelRoutes, createRouteRoles, apiKeys);
      const payload = {
        ...modelSubmission,
        apiKeys: scopedApiKeys,
        taskName: effectiveTaskName,
        methodContent,
        negativePrompt,
        caption,
        infographicCategory: selectedInfographicCategory[1],
        outputFormat,
        imageSize,
        referenceImageMode: uploadedReferenceImages.length ? activeReferenceImageMode : undefined,
        referenceImages: uploadedReferenceImages,
        pipelineMode: effectivePipelineMode,
        // 上传参考图时以图为唯一风格来源，前端同步关闭检索（后端亦强制，二者一致）。
        retrievalSetting: effectiveRetrievalSetting,
        manualReferenceIds: isAdvancedMode && retrievalSetting === 'manual' && !uploadedReferenceImages.length ? manualReferenceIds : [],
        aspectRatio,
        numCandidates: isAdvancedMode ? Number(numCandidates) : 1,
        maxCriticRounds: isAdvancedMode ? Number(maxCriticRounds) : 1,
        mock: isAdvancedMode ? mock : false,
      };
      const created = await createJobRequest(apiBaseNormalized, health, payload);
      setCurrentJobId(created.id);
      if (currentUser) void loadUserJobs({ silent: true });
    } catch (err) {
      setError(err.message);
      setErrorContext('submit');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function loadUserJobs(options = {}) {
    if (!AUTH_ENABLED || !currentUser) return;
    if (!options.silent) setUserJobsError('');
    try {
      const data = await userJobsRequest(apiBaseNormalized, health);
      if (options.cancelledRef?.()) return;
      setUserJobs(data.jobs || []);
    } catch (err) {
      if (options.cancelledRef?.()) return;
      setUserJobsError(err.message);
    }
  }

  function applyFeaturedTemplate(template) {
    clearInputOptimizationUndos();
    setInfographicCategory(template.category);
    setMethodContent(template.methodContent);
    setCaption(template.caption);
    setNegativePrompt(template.negativePrompt);
    setInputIsDirty(false);
  }

  function clearPrivateWorkspace() {
    refineRequestGeneration.current += 1;
    clearInputOptimizationUndos();
    referenceImagesRef.current.forEach((image) => URL.revokeObjectURL(image.previewUrl));
    referenceImagesRef.current = [];
    setReferenceImages([]);
    setApiKeys({ openrouter: '', gemini: '', openai: '', bailian: '', ark: '' });
    arkKeySnapshotRef.current = '';
    arkProbeGenerationRef.current += 1;
    arkActiveProbeRequestRef.current = 0;
    setIsVerifyingArk(false);
    setArkVerification({});
    setArkProbePaidConfirmed(false);
    setArkVerificationError('');
    setMethodContent(SAMPLE_METHOD);
    setCaption('图 1：所提出的多智能体学术图示生成框架总览。');
    setNegativePrompt('');
    setInputIsDirty(false);
    setManualReferenceIds([]);
    setReferenceLibrary([]);
    setCurrentJobId('');
    latestJobRef.current = null;
    setJob(null);
    setUserJobs([]);
    setRefineSource({ url: '', objectKey: '' });
    setRefineJobId('');
    setRefineJob(null);
    closeInputOptimization();
    setRefineInstruction('');
    setRefineError('');
    setError('');
    setErrorContext('');
  }

  async function handleSignOut() {
    clearPrivateWorkspace();
    await authClient.signOut();
    await authSession.refresh();
    setShowAuthPanel(false);
    setShowAccountDialog(false);
    setAdminIdentity('');
    selectTab('generate');
  }

  async function handleAccountDeleted() {
    clearPrivateWorkspace();
    authSession.clear();
    setShowAccountDialog(false);
    setAdminIdentity('');
    selectTab('generate');
    try {
      await authSession.refresh();
    } catch {
      // The deletion is already committed. A transient session refresh failure
      // must not reverse the local signed-out state or report deletion as failed.
      authSession.clear();
    }
  }

  function openFeedbackDialog() {
    setFeedbackError('');
    setFeedbackSuccess(false);
    setShowFeedbackDialog(true);
  }

  function closeFeedbackDialog() {
    setShowFeedbackDialog(false);
    setFeedbackError('');
    setFeedbackSuccess(false);
  }

  async function handleSubmitFeedback(payload) {
    setFeedbackError('');
    setFeedbackSuccess(false);
    setIsSubmittingFeedback(true);
    try {
      await submitFeedbackRequest(apiBaseNormalized, health, {
        message: payload.message,
        category: payload.category,
        contact: payload.contact,
        platform: 'web',
        clientVersion: CLIENT_VERSION,
        jobId: currentJobId || latestJobRef.current?.id || '',
      });
      setFeedbackSuccess(true);
      return true;
    } catch (err) {
      setFeedbackError(err.message);
      return false;
    } finally {
      setIsSubmittingFeedback(false);
    }
  }

  function useResultForRefine(url, image) {
    if (refineRunning) { selectTab('refine'); return; }
    setRefineSource(normalizeRefineSource(url, image));
    setRefineInstruction('');
    setRefineError('');
    selectTab('refine');
  }

  async function submitRefine(event) {
    event.preventDefault();
    setRefineError('');
    if (refineSubmitLock.current) return;
    if (refineSubmitHint) { setRefineError(refineSubmitHint); return; }
    if (refineSource.uploaded) {
      try { validateRefineFile({ type: refineSource.mimeType, size: refineSource.size }, activeRefineUploadLimits); validateRefineDimensions(refineSource, activeRefineUploadLimits); }
      catch (error) { setRefineError(error.message); return; }
    }
    if (!refineAspectRatioOptions.some((option) => option.value === refineAspectRatio)) { setRefineError('当前精修比例不可用，请重新选择。'); return; }
    if (!refineResolutionOptions.length) {
      setRefineError('当前图像模型未声明可执行的精修清晰度，请更换模型后重试。');
      return;
    }
    if (!refineResolutionOptions.some(([value]) => value === refineImageSize)) {
      setRefineError('当前精修清晰度已不受所选模型支持，请重新选择。');
      return;
    }
    if (missingCredentialProviders.length) {
      setRefineError(`请先填写${missingCredentialProviders.map((item) => PROVIDERS[item]?.label || item).join('、')}接入密钥。`);
      setGenerationFocusSetting('api-key');
      setShowGenerationSettings(true);
      return;
    }
    const invalidRefineRoute = firstInvalidRequiredRoute({
      roles: refineRouteRoles,
      entries: { main: activeMainRegistryEntry, image: activeImageRegistryEntry, vision: activeVisionRegistryEntry },
      outputFormat: 'png',
    });
    if (invalidRefineRoute) {
      setRefineError(invalidRefineRoute.message);
      setGenerationFocusSetting(invalidRefineRoute.setting);
      setShowGenerationSettings(true);
      return;
    }
    let modelSubmission;
    try {
      modelSubmission = buildModelSubmission({ configurationMode, modelRoutes: activeModelRoutes, registry: modelRegistry, providerRegions });
    } catch (routingError) {
      setRefineError(routingError.message);
      setGenerationFocusSetting('configuration-mode');
      setShowGenerationSettings(true);
      return;
    }
    const requestGeneration = refineRequestGeneration.current;
    refineSubmitLock.current = true;
    setIsSubmittingRefine(true);
    setRefineJobId('');
    setRefineJob(null);
    setRefinePollError('');
    try {
      const scopedApiKeys = scopedApiKeysForRoles(activeModelRoutes, refineRouteRoles, apiKeys);
      const created = await refineImageRequest(apiBaseNormalized, health, {
        configurationMode: modelSubmission.configurationMode,
        provider: modelSubmission.provider,
        apiKeys: scopedApiKeys,
        modelRoutes: modelSubmission.modelRoutes,
        providerRegions: modelSubmission.providerRegions,
        mainModelName: modelSubmission.mainModelName,
        imageModelName: modelSubmission.imageGenModelName,
        referenceVisionModelName: modelSubmission.referenceVisionModelName,
        ...refineRequestSource(refineSource),
        editInstruction: refineInstruction,
        aspectRatio: refineAspectRatio,
        imageSize: refineImageSize,
      });
      if (requestGeneration !== refineRequestGeneration.current) return;
      setRefineJob({ id: created.id, status: created.status || 'queued', result_images: [] });
      setRefineJobId(created.id);
      if (currentUser) void loadUserJobs({ silent: true });
    } catch (refineRequestError) {
      if (requestGeneration !== refineRequestGeneration.current) return;
      setRefineError(refineRequestError?.message || String(refineRequestError));
    } finally {
      refineSubmitLock.current = false;
      setIsSubmittingRefine(false);
    }
  }

  function closeGenerationSettings() {
    setShowGenerationSettings(false);
    setInputOptimizationCredentialProvider('');
  }

  async function showResumedTask(id) {
    const resumed = await getJobRequest(apiBaseNormalized, health, id);
    if (resumed.refine_mode) {
      setRefineJobId('');
      setRefineJob(resumed);
      setRefineJobId(id);
      selectTab('refine');
    } else {
      setCurrentJobId(id);
      setJob(resumed);
      setPollRetryNonce(value => value + 1);
      selectTab('generate');
    }
    await loadUserJobs();
  }

  const settingsDrawer = (
    <GenerationSettingsDrawer open={showGenerationSettings} onClose={closeGenerationSettings} focusSetting={generationFocusSetting}>
      <ModelRoutingSettings
        configurationMode={configurationMode}
        onModeChange={handleConfigurationModeChange}
        simpleProvider={provider}
        onSimpleProviderChange={handleSimpleProviderChange}
        modelRoutes={activeModelRoutes}
        onRouteChange={handleModelRouteChange}
        modelRegistry={modelRegistry}
        providerConfigs={PROVIDERS}
        outputFormat={workspaceTab === 'refine' ? 'png' : outputFormat}
        executionRouteRoles={credentialRouteRoles}
        credentialProviders={settingsCredentialProviders}
        apiKeys={apiKeys}
        tokenDance={tokenDance}
        onOpenAccount={openAccount}
        onApiKeyChange={handleApiKeyChange}
        providerRegions={providerRegions}
        onMiniMaxRegionChange={(region) => {
          setProviderRegions({ minimax: region });
          // The China-only image variant cannot carry into the international region.
          if (region === 'global') setModelRoutes(current => current.image.accessProvider === 'minimax' && current.image.modelId === 'image-01-live'
            ? {...current, image: {accessProvider: 'minimax', modelId: 'image-01'}} : current);
        }}
        arkProbes={activeArkProbes}
        arkVerification={arkVerification}
        arkProbePaidConfirmed={arkProbePaidConfirmed}
        onArkProbePaidConfirmedChange={setArkProbePaidConfirmed}
        isVerifyingArk={isVerifyingArk}
        arkVerificationError={arkVerificationError}
        onVerifyArk={verifySelectedArkModels}
      />

      {workspaceTab === 'refine' ? (
        <div className="refine-settings-note" role="note">
          {refineResolutionOptions.length
            ? `精修固定输出 PNG；清晰度（${refineImageSize}）与目标比例（${refineAspectRatio}）请在精修面板设置。`
            : '精修固定输出 PNG；当前图像模型未声明可执行的精修清晰度，请更换模型。'}
        </div>
      ) : (<>
        <div className="output-format-field">
          <Select label="导出格式" value={outputFormat} onChange={setOutputFormat} options={OUTPUT_FORMATS} />
          {outputFormat === 'svg'
            ? <div className="plot-note svg-output-note">SVG 由主模型直接生成；图像路线仍保留在完整路由中，但本任务不会要求其 Key。</div>
            : <Select label="输出清晰度" value={imageSize} onChange={setImageSize} options={resolutionOptions} />}
        </div>
        <AspectRatioPicker label="画面比例" value={aspectRatio} onChange={setAspectRatio} options={generationAspectRatioOptions} compact />

        {!isAdvancedMode ? (
        <div className="default-summary" aria-label="默认生成配置">
          <span>主模型：{defaultMainModelLabel}</span>
          <span>图像：{defaultImageModelLabel}</span>
          <span>识别：{defaultVisionModelLabel}</span>
          <span>规划器 + 评审器</span>
          <span>{aspectRatio === 'auto' ? '自动比例' : aspectRatio}</span>
          <span>{formatOutputFormat(outputFormat)}</span>
        </div>
        ) : (
        <>
          {CUSTOM_API_BASE_ENABLED ? (
            <label className="field">
              <span>开发后端地址</span>
              <input value={apiBase} onChange={(event) => setApiBase(event.target.value)} placeholder="仅本地开发构建可修改" />
            </label>
          ) : (
            <div className="service-boundary-note"><ShieldCheck size={16} />已锁定图研官方后端，API 密钥不会发送到用户指定的第三方地址。</div>
          )}

          <div className="settings-grid">
            <Select label="生成流程" value={pipelineMode} onChange={setPipelineMode} options={[
              ['demo_planner_critic', '规划器 + 评审器'],
              ['demo_full', '完整流程'],
              ['vanilla', '基础生成'],
            ]} />
            <Select label="检索设置"
              value={referenceImages.length ? 'none' : retrievalSetting}
              onChange={setRetrievalSetting}
              disabled={referenceImages.length > 0}
              hint={referenceImages.length ? '已上传参考图，检索自动关闭（以参考图为唯一风格来源）' : ''}
              options={[
              ['none', '不使用检索'],
              ['auto', '自动检索'],
              ['random', '随机参考'],
              ['manual', '手动参考'],
            ]} />
            <label className="field compact">
              <span>候选图数量</span>
              <input type="number" min="1" max="3" value={numCandidates} onChange={(event) => setNumCandidates(event.target.value)} />
            </label>
            <label className="field compact">
              <span>评审轮数</span>
              <input type="number" min="0" max={INPUT_LIMITS.maxCriticRounds} value={maxCriticRounds} onChange={(event) => setMaxCriticRounds(event.target.value)} />
              <small>最多 {INPUT_LIMITS.maxCriticRounds} 轮；候选图与评审轮数会增加模型调用费用。</small>
            </label>
          </div>

          {selectedModelNotes.length ? (
            <div className="model-availability-notes" aria-label="模型可用性说明">
              {selectedModelNotes.map((model) => (
                <span key={`${model.id}-${model.protocol}`}><strong>{model.label}</strong>：{model.availabilityNotes || '服务端目录可用'} · {formatLifecycle(model.lifecycle)} · {formatVerification(model)}{model.entitlement ? ` · 权益：${model.entitlement}` : model.requiresEntitlement ? ' · 需开通模型权益' : ' · 无额外权益'}{model.roles?.includes('image') ? ` · ${modelRefinePresentation(model).label}` : ''}</span>
              ))}
            </div>
          ) : null}

          {referenceImages.length ? (
            <div className="reference-mode-panel">
              <span>参考图处理方式</span>
              <div className="reference-mode-switch">
                {REFERENCE_IMAGE_MODES.map(([id, label]) => (
                  <button
                    type="button"
                    key={id}
                    className={referenceImageMode === id ? 'active' : ''}
                    disabled={id === 'main_model' && !canSelectMainModelDirect}
                    onClick={() => setReferenceImageMode(id)}
                  >
                    {label}
                  </button>
                ))}
              </div>
              {referenceCapabilityNote ? <p>{referenceCapabilityNote}</p> : null}
            </div>
          ) : null}

          {health?.mock_enabled ? (
            <label className="mock-switch">
              <input type="checkbox" checked={mock} onChange={(event) => setMock(event.target.checked)} />
              <span>模拟模式</span>
            </label>
          ) : null}

          {retrievalSetting === 'manual' && !referenceImages.length ? (
            <div data-focus-setting="manual-reference" tabIndex={-1}>
              <Suspense fallback={<div className="loading-card"><Loader2 className="spin" size={18} />正在载入参考图库</div>}>
                <ReferenceLibraryPanel
                  references={referenceLibrary}
                  selectedIds={manualReferenceIds}
                  pageInfo={referencePageInfo}
                  isLoading={isLoadingReferenceLibrary}
                  error={referenceLibraryError}
                  onToggle={toggleManualReference}
                  onClear={() => setManualReferenceIds([])}
                  onRequest={loadReferenceLibrary}
                />
              </Suspense>
            </div>
          ) : null}
        </>
        )}
      </>)}
    </GenerationSettingsDrawer>
  );

  return (
    <main className={`app-shell${activeTab === 'account' ? ' account-view' : ''}`}>
      {LOCAL_CONSUMPTION_TEST && <section className="tokendance-panel" aria-label="本地消费测试"><strong>已连接正式图研账号服务 · 观猹 TokenDance 消费预览</strong><p>使用你已有的图研账号登录，再连接观猹 TokenDance。生成、精修和优化输入会使用真实观猹 TokenDance 余额。</p><small>本次预览的任务、图片和渠道授权保存在本机，线上历史记录可在<a href="https://www.paperbanana.asia/" target="_blank" rel="noreferrer">正式图研</a>查看。初始为 1 张候选图、0 轮评审。</small></section>}
      <header className="paper-header">
        <div className="brand">
          <img className="brand-logo" src={logoUrl} alt="图研Tuyan 标志" />
          <div>
            <h1>图研Tuyan工作台</h1>
          </div>
        </div>
        <div className="header-links">
          {BENCH_ENABLED ? <a href={appPath('/leaderboard')}><BarChart3 size={16} /> 排行榜</a> : null}
          <a href="https://openacad.xyz/" target="_blank" rel="noreferrer">OpenAcad</a>
          <button type="button" className="contact-author-button" onClick={() => setShowContactDialog(true)}>
            <QrCode size={16} /> 联系作者
          </button>
          <button type="button" className="header-feedback-button" onClick={openFeedbackDialog}>
            <MessageSquare size={16} /> 意见反馈
          </button>
          <a href="https://huggingface.co/papers/2601.23265" target="_blank" rel="noreferrer">
            <FileText size={16} /> 论文
          </a>
          <a href="https://github.com/yrjmdqmmx/Tuyan-clients" target="_blank" rel="noreferrer">
            <Github size={16} /> GitHub
          </a>
          <a href="https://github.com/yrjmdqmmx/Tuyan-clients/tree/main/apps/miniprogram" target="_blank" rel="noreferrer">
            <MessageCircle size={16} /> 微信小程序
          </a>
          <a href="/privacy-policy.html" target="_blank" rel="noreferrer">隐私政策</a>
          <a href="/terms-of-service.html" target="_blank" rel="noreferrer">服务条款</a>
          {AUTH_UI_ENABLED ? (
            currentUser ? (
              <div className="auth-user">
                <ShieldCheck size={16} />
                <span title={currentUser.email}>{currentUser.email}</span>
                <button type="button" onClick={handleSignOut}>退出</button>
              </div>
            ) : (
              <button type="button" className="auth-entry-button" onClick={() => setShowAuthPanel(true)}>
                <ShieldCheck size={16} /> 登录 / 注册
              </button>
            )
          ) : null}
        </div>
      </header>

      {activeTab !== 'account' && (tokenDance.notice || tokenDance.error) && <div className="service-alert" role="status">{tokenDance.error || tokenDance.notice}<button type="button" className="account-button" onClick={openAccount}>查看账户</button></div>}
      {healthError ? (
        <div className="service-alert" role="status"><AlertTriangle size={16} />后端连接异常：{formatErrorMessage(healthError)}</div>
      ) : null}
      {modelRegistryError ? (
        <div className="service-alert" role="status">
          <AlertTriangle size={16} />部分模型目录暂不可用：{formatErrorMessage(modelRegistryError)}
          <button type="button" className="inline-retry" onClick={() => setModelRegistryRetryNonce((value) => value + 1)}>重试目录</button>
        </div>
      ) : null}
      {authSession.error ? (
        <div className="service-alert" role="status"><AlertTriangle size={16} />登录状态检查失败：{formatErrorMessage(authSession.error.message || String(authSession.error))}</div>
      ) : null}

      {showAccountDialog && currentUser ? (
        <Suspense fallback={null}>
          <AccountSettingsDialog
            apiBase={apiBaseNormalized}
            productionPreview={LOCAL_CONSUMPTION_TEST}
            email={currentUser.email || ''}
            onClose={() => setShowAccountDialog(false)}
            onDeleted={handleAccountDeleted}
          />
        </Suspense>
      ) : null}

      <FeedbackDialog
        open={showFeedbackDialog}
        isSubmitting={isSubmittingFeedback}
        error={feedbackError}
        success={feedbackSuccess}
        onClose={closeFeedbackDialog}
        onSubmit={handleSubmitFeedback}
      />

      {settingsDrawer}

      <InputOptimizationDialog
        open={inputOptimizationDialog.open}
        target={inputOptimizationDialog.target}
        targetLabel={INPUT_OPTIMIZATION_TARGET_LABELS[inputOptimizationDialog.target]}
        original={inputOptimizationDialog.original}
        candidate={inputOptimizationDialog.candidate}
        status={inputOptimizationDialog.status}
        error={inputOptimizationDialog.error}
        onClose={closeInputOptimization}
        onRetry={retryInputOptimization}
        onAdopt={adoptInputOptimization}
      />

      {showContactDialog ? (
        <div className="feedback-dialog-backdrop" onClick={() => setShowContactDialog(false)}>
          <section className="contact-dialog" role="dialog" aria-modal="true" aria-labelledby="contact-dialog-title" onClick={(event) => event.stopPropagation()}>
            <button ref={contactCloseRef} type="button" className="contact-dialog-close" aria-label="关闭" onClick={() => setShowContactDialog(false)}>
              <X size={18} />
            </button>
            <h2 id="contact-dialog-title">联系作者</h2>
            <p>使用中有任何问题、建议或合作意向，欢迎扫码添加作者微信。</p>
            {contactQrFailed ? (
              <div className="contact-qr-fallback">二维码即将上线，可先点顶栏「意见反馈」联系作者。</div>
            ) : (
              <img className="contact-qr" src="/contact-qr.png" alt="作者微信二维码（赵）" onError={() => setContactQrFailed(true)} />
            )}
          </section>
        </div>
      ) : null}

      <nav className="paper-tabs" aria-label="主导航">
        {WORKSPACE_TABS.map(([tab, label]) => (
          <button key={tab} type="button" className={activeTab === tab ? 'active' : ''} aria-current={activeTab === tab ? 'page' : undefined} onClick={() => selectTab(tab)}>{label}</button>
        ))}
        {isAdmin ? (
          <button type="button" className={activeTab === 'admin' ? 'active' : ''} aria-current={activeTab === 'admin' ? 'page' : undefined} onClick={() => selectTab('admin')}>站长</button>
        ) : null}
      </nav>

      {AUTH_REQUIRED && authSession.isPending ? (
        <section className="auth-panel">
          <Loader2 className="spin" size={24} />
          <p>正在检查登录状态</p>
        </section>
      ) : AUTH_REQUIRED && !currentUser ? (
        <AuthPanel onAuthenticated={authSession.refresh} />
      ) : (
        <>
      {AUTH_UI_ENABLED && showAuthPanel && !currentUser ? (
        AUTH_ENABLED ? (
          <AuthPanel
            onAuthenticated={async () => {
              await authSession.refresh();
              setShowAuthPanel(false);
              if (activeTab !== 'account') selectTab('records');
            }}
            onCancel={() => setShowAuthPanel(false)}
          />
        ) : (
          <AuthUnavailablePanel onCancel={() => setShowAuthPanel(false)} />
        )
      ) : null}

      {['generate', 'refine'].includes(activeTab) && Object.values(activeModelRoutes).some(route => route?.accessProvider === 'tokendance') && <TokenDanceStatus controller={tokenDance} onOpenAccount={openAccount} />}

      {activeTab === 'account' && (
        <AccountPage user={currentUser} controller={tokenDance} onReturn={returnFromAccount} returnLabel={accountReturn.current.tab === 'refine' ? '返回精修图片' : accountReturn.current.tab === 'records' ? '返回任务记录' : '返回工作台'} onManageAccount={() => setShowAccountDialog(true)} onSignOut={handleSignOut} onSignIn={() => setShowAuthPanel(true)} />
      )}
      <div style={{ display: activeTab === 'account' ? 'none' : 'contents' }} aria-hidden={activeTab === 'account' ? true : undefined}>
      {workspaceTab === 'generate' ? (
        <section className="workspace">
        <FeaturedTemplateStudio templates={featuredTemplates} isDirty={inputIsDirty} onApply={applyFeaturedTemplate} />
        <form className="generation-form" onSubmit={submitJob}>
          <section className="generation-settings-summary" role="region" aria-label="当前生成设置">
            <div className="generation-settings-summary-head">
              <div><span>当前生成设置</span><strong>路由与输出一眼确认</strong></div>
              <button type="button" className="generation-settings-trigger" onClick={() => { setGenerationFocusSetting(''); setShowGenerationSettings(true) }}><Settings2 size={18} /><span>打开完整设置</span></button>
            </div>
            <div className="generation-settings-facts">
              <div><span>主模型</span><strong>{activeMainRegistryEntry?.label || activeMainModelName}</strong></div>
              <div><span>图像模型</span><strong>{activeImageRegistryEntry?.label || activeImageGenModelName}</strong></div>
              <div><span>识图模型</span><strong>{activeVisionRegistryEntry?.label || activeReferenceVisionModelName}</strong></div>
              <div><span>画面比例</span><strong>{aspectRatio === 'auto' ? '自动' : aspectRatio}</strong></div>
              <div><span>输出</span><strong>{outputFormat === 'svg' ? 'SVG' : `${imageSize} · PNG`}</strong></div>
            </div>
            <button className="primary-button" type="submit" disabled={isSubmitting || isUploadingReferences || isInspectingReferences}>
              {isSubmitting ? <Loader2 className="spin" size={18} /> : <Send size={18} />}{isInspectingReferences ? '检查参考图' : isUploadingReferences ? '上传参考图' : '生成候选图'}
            </button>
          </section>

          {error ? (
            <div className="error-line">
              <AlertTriangle size={16} /> {formatErrorMessage(error, errorContext)}
              {errorContext === 'poll-stopped' ? (
                <button type="button" className="inline-retry" onClick={() => setPollRetryNonce((value) => value + 1)}>重新刷新</button>
              ) : null}
            </div>
          ) : null}
        </form>

        <section className="input-results">
          <div className="input-col">
            <div className="section-head">
              <FileText size={20} />
              <div>
                <h2>输入内容</h2>
                <p>选择信息图类别，再粘贴论文方法部分和目标图注。</p>
              </div>
            </div>

            <div className="input-options">
              <Select
                label="信息图类别"
                value={infographicCategory}
                onChange={setInfographicCategory}
                options={INFOGRAPHIC_CATEGORIES.map(([id, label]) => [id, label])}
              />
              <p>{selectedInfographicCategory[2]}</p>
            </div>
            {isPlotCategory ? (
              <div className="plot-note">
                统计图由独立渲染服务生成，可能稍慢。
              </div>
            ) : null}

            <ReferenceUploadPanel
              images={referenceImages}
              error={referenceSelectionIssue || referenceUploadError}
              policy={activeReferenceUpload}
              disabled={isSubmitting || isInspectingReferences}
              isInspecting={isInspectingReferences}
              isUploading={isUploadingReferences}
              retrievalBlocked={isAdvancedMode && retrievalSetting !== 'none'}
              onAddFiles={addReferenceFiles}
              onRemove={removeReferenceImage}
            />

            {inputOptimizationGuidance ? (
              <div className="input-optimization-guidance" role="alert"><AlertTriangle size={16} />{inputOptimizationGuidance}</div>
            ) : null}

            <div className="two-col input-copy">
              <div className="field">
                <div className="input-field-head">
                  <label htmlFor="method-content">论文方法内容</label>
                  {inputOptimizationSupported ? (
                    <InputOptimizationFieldActions
                      target="methodContent"
                      disabledReason={inputOptimizationDisabledReason('methodContent')}
                      hasUndo={inputOptimizationUndos.methodContent !== null}
                      onOptimize={requestInputOptimization}
                      onRestore={restoreInputBeforeOptimization}
                    />
                  ) : null}
                </div>
                <textarea id="method-content" value={methodContent} onChange={(event) => handleInputValueChange('methodContent', event.target.value)} rows={12} maxLength={INPUT_LIMITS.methodContent} />
                <small>{methodContent.length.toLocaleString()} / {INPUT_LIMITS.methodContent.toLocaleString()} 字符</small>
              </div>

              <div className="field">
                <div className="input-field-head">
                  <label htmlFor="target-caption">目标图注</label>
                  {inputOptimizationSupported ? (
                    <InputOptimizationFieldActions
                      target="caption"
                      disabledReason={inputOptimizationDisabledReason('caption')}
                      hasUndo={inputOptimizationUndos.caption !== null}
                      onOptimize={requestInputOptimization}
                      onRestore={restoreInputBeforeOptimization}
                    />
                  ) : null}
                </div>
                <textarea id="target-caption" value={caption} onChange={(event) => handleInputValueChange('caption', event.target.value)} rows={12} maxLength={INPUT_LIMITS.caption} />
                <small>{caption.length.toLocaleString()} / {INPUT_LIMITS.caption.toLocaleString()} 字符</small>
              </div>
            </div>
            <div className="field negative-prompt-field">
              <div className="input-field-head">
                <label htmlFor="negative-prompt">负向提示词（可选）</label>
                {inputOptimizationSupported ? (
                  <InputOptimizationFieldActions
                    target="negativePrompt"
                    disabledReason={inputOptimizationDisabledReason('negativePrompt')}
                    hasUndo={inputOptimizationUndos.negativePrompt !== null}
                    onOptimize={requestInputOptimization}
                    onRestore={restoreInputBeforeOptimization}
                  />
                ) : null}
              </div>
              <textarea id="negative-prompt" value={negativePrompt} onChange={(event) => handleInputValueChange('negativePrompt', event.target.value)} rows={4} maxLength={INPUT_LIMITS.negativePrompt} placeholder="例如：避免文字拥挤、模糊箭头、装饰性背景。" />
              <small>{negativePrompt.length.toLocaleString()} / {INPUT_LIMITS.negativePrompt.toLocaleString()} 字符</small>
            </div>
          </div>

          <div className="results-col">
            <div className="section-head results-head">
              <ImageIcon size={20} />
              <div>
                <h2>生成结果</h2>
                <p>{currentJobId ? `任务编号 ${currentJobId}` : '提交任务后显示生成结果。'}</p>
              </div>
            </div>
            <TokenDanceRecovery job={job} controller={tokenDance} onOpenAccount={openAccount} onResumed={showResumedTask} />
            <JobStatus job={job} apiBase={apiBaseNormalized} onUseForRefine={useResultForRefine} />
          </div>
        </section>
        </section>
      ) : workspaceTab === 'refine' ? (
        <Suspense fallback={<div className="loading-card"><Loader2 className="spin" size={18} />正在载入精修工具</div>}>
          <TokenDanceRecovery job={refineJob} controller={tokenDance} onOpenAccount={openAccount} onResumed={showResumedTask} />
          <RefinePanel
            source={refineSource}
            upload={{ ...refineUpload, error: refineSourcePolicyIssue || refineUpload.error }}
            uploadLimits={activeRefineUploadLimits}
            uploadEnabled={modelRegistry?.refineUpload?.version >= 1}
            onUpload={selectRefineFiles}
            onRetryUpload={retryRefineUpload}
            onRemoveSource={() => setRefineSource({ url: '', objectKey: '' })}
            onOpenRecords={() => setActiveTab('records')}
            onOpenGenerate={() => setActiveTab('generate')}
            onUseForRefine={useResultForRefine}
            optimizationSupported={refineOptimizationSupported}
            optimizationDisabledReason={inputOptimizationDisabledReason('editInstruction')}
            optimizationHasUndo={inputOptimizationUndos.editInstruction !== null}
            optimizationGuidance={inputOptimizationGuidance}
            onOptimize={requestInputOptimization}
            onRestore={restoreInputBeforeOptimization}
            capability={refineCapability}
            instruction={refineInstruction}
            imageSize={refineImageSize}
            resolutionOptions={refineResolutionOptions}
            aspectRatio={refineAspectRatio}
            aspectRatioOptions={refineAspectRatioOptions}
            settingsSummary={refineConfigSummary}
            canSubmit={!refineSubmitHint}
            submitHint={refineSubmitHint}
            isSubmitting={isSubmittingRefine}
            error={refineError}
            job={refineJob}
            pollError={refinePollError}
            apiBase={apiBaseNormalized}
            onInstructionChange={(value) => handleInputValueChange('editInstruction', value)}
            onImageSizeChange={setRefineImageSize}
            onAspectRatioChange={setRefineAspectRatio}
            onOpenSettings={() => {
              setGenerationFocusSetting(isAdvancedMode ? 'image-model' : 'api-key');
              setShowGenerationSettings(true);
            }}
            onSubmit={submitRefine}
          />
        </Suspense>
      ) : workspaceTab === 'admin' ? (
        isAdmin && currentUser ? <Suspense fallback={<p role="status">正在加载站长后台…</p>}><AdminWorkspace key={currentUser?.id} apiBase={apiBaseNormalized} health={health} /><TokenDancePricing apiBase={apiBaseNormalized} /></Suspense>
          : <section className="card"><h2>站长运营后台</h2><p role="status">{authSession.isPending ? '正在确认登录状态…' : '需要已登录的站长账号才能访问，后台接口会再次校验权限。'}</p>{!currentUser && <button onClick={() => setShowAuthPanel(true)}>登录账号</button>}</section>
      ) : workspaceTab === 'guide' ? (
        <GuidePanel
          onStart={() => selectTab('generate')}
          onContact={() => setShowContactDialog(true)}
          registryVersion={modelRegistry?.registryVersion || '等待服务端目录'}
          providerLabels={Object.keys(modelRegistry?.providers || {}).map((id) => PROVIDERS[id]?.label || id)}
          routeSummary={{
            main: activeMainRegistryEntry?.label || activeMainModelName,
            image: activeImageRegistryEntry?.label || activeImageGenModelName,
            vision: activeVisionRegistryEntry?.label || activeReferenceVisionModelName,
          }}
        />
      ) : (
        <TaskRecordsPanel
          authEnabled={AUTH_ENABLED}
          currentUser={currentUser}
          isPending={authSession.isPending}
          jobs={userJobs}
          error={userJobsError}
          apiBase={apiBaseNormalized}
          onLogin={() => setShowAuthPanel(true)}
          onRefresh={() => loadUserJobs()}
          onUseForRefine={useResultForRefine}
          renderRecovery={item => <TokenDanceRecovery job={item} controller={tokenDance} onOpenAccount={openAccount} onResumed={showResumedTask} />}
        />
      )}
      </div>
        </>
      )}
    </main>
  );
}

function normalizeReferenceMimeType(file) {
  const mimeType = (file.type || '').toLowerCase();
  if (mimeType === 'image/jpg') return 'image/jpeg';
  if (mimeType) return mimeType;
  const name = (file.name || '').toLowerCase();
  if (name.endsWith('.png')) return 'image/png';
  if (name.endsWith('.jpg') || name.endsWith('.jpeg')) return 'image/jpeg';
  if (name.endsWith('.webp')) return 'image/webp';
  if (name.endsWith('.svg')) return 'image/svg+xml';
  return '';
}

function extensionForMimeType(mimeType) {
  if (mimeType === 'image/png') return 'png';
  if (mimeType === 'image/jpeg') return 'jpg';
  if (mimeType === 'image/webp') return 'webp';
  if (mimeType === 'image/svg+xml') return 'svg';
  return 'png';
}

function findModelLabel(options, value) {
  const option = options.find(([id]) => id === value);
  return option ? option[1] : value;
}

function formatLifecycle(value) {
  if (value === 'stable') return '稳定版';
  if (value === 'preview') return '预览版';
  if (value === 'legacy') return '旧版维护';
  if (value === 'invite-only') return '邀请制';
  if (value === 'deprecated') return '即将下线';
  return '状态未知';
}

function formatVerification(model) {
  if (model.verificationState === 'catalog') return '官方目录';
  if (model.verificationState === 'account-visible') return '账号目录可见';
  if (model.verificationState === 'inference-verified') return '真实调用已验证';
  if (model.verificationState === 'registry') return '静态注册信息';
  return model.verified === true ? '注册表已确认' : '模型目录';
}

function firstMissingGenerationSetting({
  missingCredentialProviders,
  requiredRouteRoles,
  isAdvancedMode,
  retrievalSetting,
  manualReferenceIds,
  needsReferenceVisionModel,
  mainModelDirectUnsupported,
  outputFormat,
  mainEntry,
  imageEntry,
  visionEntry,
}) {
  if (missingCredentialProviders.length) return { setting: 'api-key', message: `请填写${missingCredentialProviders.map((item) => PROVIDERS[item]?.label || item).join('、')}接入密钥。` };
  const invalidRoute = firstInvalidRequiredRoute({
    roles: requiredRouteRoles,
    entries: { main: mainEntry, image: imageEntry, vision: visionEntry },
    outputFormat,
  });
  if (invalidRoute) return invalidRoute;
  if (isAdvancedMode && retrievalSetting === 'manual' && !manualReferenceIds.length) return { setting: 'manual-reference', message: '手动参考模式至少需要选用一个案例。' };
  if (needsReferenceVisionModel && !visionEntry) return { setting: 'vision-model', message: '请选择参考图识别模型。' };
  if (mainModelDirectUnsupported) return { setting: 'main-model', message: '当前主模型不能直接读取参考图，请更换模型或处理方式。' };
  return null;
}

function describeReferenceCapability(capability) {
  if (!capability || capability.status === 'loading') return '正在检查当前主模型是否支持直接理解参考图。';
  if (capability.status === 'supported') return '当前主模型支持直接理解参考图，可使用主模型直读。';
  if (capability.status === 'unsupported') return '当前主模型不支持直接理解参考图，请使用独立识别模型或更换主模型。';
  return '当前主模型的参考图能力无法确认；可以尝试主模型直读，失败时请改用独立识别模型或更换主模型。';
}
