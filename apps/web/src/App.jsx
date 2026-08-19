import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  Apple,
  BookOpen,
  Eye,
  FileText,
  Github,
  Image as ImageIcon,
  KeyRound,
  Loader2,
  MessageCircle,
  MessageSquare,
  MonitorDown,
  QrCode,
  RefreshCcw,
  Send,
  Settings2,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Users,
  X,
} from 'lucide-react';
import {
  adminFeedbackRequest,
  adminJobsRequest,
  adminStatusRequest,
  adminUsersRequest,
  abortReferenceUploadRequest,
  createJobRequest,
  fetchBackendHealth,
  getJobRequest,
  modelCapabilityRequest,
  modelRegistryRequest,
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
  CLIENT_VERSION,
  CUSTOM_API_BASE_ENABLED,
  authClient,
  logoUrl,
} from './config';
import {
  INFOGRAPHIC_CATEGORIES,
  OUTPUT_FORMATS,
  PROVIDERS,
  QUICK_START_EXAMPLES,
  REFERENCE_IMAGE_MODES,
  REFERENCE_IMAGE_LIMITS,
  RESOLUTION_OPTIONS,
  SAMPLE_METHOD,
  mainModelCanReadImages,
  supportedResolutions,
} from './constants';
import ApiKeyGuide from './components/ApiKeyGuide';
import AdminFeedbackTable from './components/AdminFeedbackTable';
import AdminUsersTable from './components/AdminUsersTable';
import AuthPanel from './components/AuthPanel';
import AuthUnavailablePanel from './components/AuthUnavailablePanel';
import ExampleTemplates from './components/ExampleTemplates';
import FeedbackDialog from './components/FeedbackDialog';
import GenerationSettingsDrawer from './components/GenerationSettingsDrawer';
import GuidePanel from './components/GuidePanel';
import JobStatus from './components/JobStatus';
import JobTable from './components/JobTable';
import ModelPicker from './components/ModelPicker';
import ReferenceUploadPanel from './components/ReferenceUploadPanel';
import Select from './components/Select';
import TaskRecordsPanel from './components/TaskRecordsPanel';
import { useAuthSession } from './hooks/useAuthSession';
import { formatErrorMessage, formatOutputFormat, pollRetryDelay, shouldClearAuthForJobError } from './utils';
import { INPUT_LIMITS, officialApiBase, shouldPollJob, validateApiBase } from './lib/runtimePolicy';
import { mergeProviderRegistry, modelRefinePresentation, uniqueRegistryModels } from './lib/modelRegistry';
import { buildReferencePageRequest } from './lib/referenceGallery';
import { normalizeRefineSource, refineRequestSource } from './lib/refineSource';

const AccountSettingsDialog = lazy(() => import('./components/AccountSettingsDialog'));
const ReferenceLibraryPanel = lazy(() => import('./components/ReferenceLibraryPanel'));
const RefinePanel = lazy(() => import('./components/RefinePanel'));

export default function App() {
  const authSession = useAuthSession();
  const [activeTab, setActiveTab] = useState('generate');
  const [showContactDialog, setShowContactDialog] = useState(false);
  const contactCloseRef = useRef(null);
  const [contactQrFailed, setContactQrFailed] = useState(false);
  const [showAuthPanel, setShowAuthPanel] = useState(false);
  const [showAccountDialog, setShowAccountDialog] = useState(false);
  const [showGenerationSettings, setShowGenerationSettings] = useState(false);
  const [generationFocusSetting, setGenerationFocusSetting] = useState('');
  const [apiBase, setApiBase] = useState(() => API_BASE_DEFAULT || officialApiBase(globalThis.location?.origin));
  const [configurationMode, setConfigurationMode] = useState('simple');
  const [provider, setProvider] = useState('bailian');
  const [apiKeys, setApiKeys] = useState({ openrouter: '', gemini: '', openai: '', bailian: '' });
  const [methodContent, setMethodContent] = useState(SAMPLE_METHOD);
  const [caption, setCaption] = useState('图 1：所提出的多智能体学术图示生成框架总览。');
  const [infographicCategory, setInfographicCategory] = useState('method_framework');
  const [outputFormat, setOutputFormat] = useState('png');
  const [imageSize, setImageSize] = useState('1K');
  const [mainModelName, setMainModelName] = useState(PROVIDERS.bailian.mainModel);
  const [imageGenModelName, setImageGenModelName] = useState(PROVIDERS.bailian.imageModel);
  const [referenceVisionModelName, setReferenceVisionModelName] = useState(PROVIDERS.bailian.visionModel);
  const [referenceImageMode, setReferenceImageMode] = useState('vision_model');
  const [referenceImages, setReferenceImages] = useState([]);
  const [mainModelCapability, setMainModelCapability] = useState(null);
  const referenceImagesRef = useRef([]);
  const [referenceUploadError, setReferenceUploadError] = useState('');
  const [isUploadingReferences, setIsUploadingReferences] = useState(false);
  const [pipelineMode, setPipelineMode] = useState('demo_planner_critic');
  const [retrievalSetting, setRetrievalSetting] = useState('none');
  const [manualReferenceIds, setManualReferenceIds] = useState([]);
  const [referenceLibrary, setReferenceLibrary] = useState([]);
  const [referencePageInfo, setReferencePageInfo] = useState({ page: 1, pageSize: 12, totalItems: 0, totalPages: 1, facets: { visualCategories: [], researchDomains: [] }, corpusVersion: '' });
  const referenceRequestRef = useRef({ sequence: 0, controller: null });
  const [referenceLibraryError, setReferenceLibraryError] = useState('');
  const [isLoadingReferenceLibrary, setIsLoadingReferenceLibrary] = useState(false);
  const [aspectRatio, setAspectRatio] = useState('16:9');
  const [numCandidates, setNumCandidates] = useState(1);
  const [maxCriticRounds, setMaxCriticRounds] = useState(1);
  const [health, setHealth] = useState(null);
  const [healthError, setHealthError] = useState('');
  const [modelRegistry, setModelRegistry] = useState(null);
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
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminJobs, setAdminJobs] = useState([]);
  const [adminUsers, setAdminUsers] = useState([]);
  const [adminFeedback, setAdminFeedback] = useState([]);
  const [adminError, setAdminError] = useState('');
  const [adminUsersError, setAdminUsersError] = useState('');
  const [adminFeedbackError, setAdminFeedbackError] = useState('');
  const [userJobs, setUserJobs] = useState([]);
  const [userJobsError, setUserJobsError] = useState('');
  const [showFeedbackDialog, setShowFeedbackDialog] = useState(false);
  const [feedbackError, setFeedbackError] = useState('');
  const [feedbackSuccess, setFeedbackSuccess] = useState(false);
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);
  const [refineSource, setRefineSource] = useState({ url: '', objectKey: '' });
  const [refineInstruction, setRefineInstruction] = useState('');
  const [refineImageSize, setRefineImageSize] = useState('2K');
  const [refineAspectRatio, setRefineAspectRatio] = useState('16:9');
  const [refineError, setRefineError] = useState('');
  const [isSubmittingRefine, setIsSubmittingRefine] = useState(false);
  const currentUser = AUTH_ENABLED ? authSession.session?.user : null;
  const authReady = !AUTH_REQUIRED || Boolean(!authSession.isPending && currentUser);
  const modelRegistryReady = Boolean(modelRegistry?.providers?.[provider]);
  const providerConfig = mergeProviderRegistry(PROVIDERS[provider], modelRegistry?.providers?.[provider]);
  const selectedKey = apiKeys[providerConfig.keyName] || '';
  const apiBaseNormalized = useMemo(() => {
    try {
      return validateApiBase(apiBase, CUSTOM_API_BASE_ENABLED);
    } catch {
      return officialApiBase(globalThis.location?.origin);
    }
  }, [apiBase]);
  const selectedInfographicCategory = INFOGRAPHIC_CATEGORIES.find(([id]) => id === infographicCategory) || INFOGRAPHIC_CATEGORIES[0];
  const isAdvancedMode = configurationMode === 'advanced';
  const isPlotCategory = infographicCategory === 'data_stat';
  const defaultMainModelLabel = findModelLabel(providerConfig.mainModels, providerConfig.mainModel);
  const defaultImageModelLabel = findModelLabel(providerConfig.imageModels, providerConfig.imageModel);
  const defaultVisionModelLabel = findModelLabel(providerConfig.visionModels || [], providerConfig.visionModel);
  const activeMainModelName = isAdvancedMode ? mainModelName : providerConfig.mainModel;
  const activeImageGenModelName = isAdvancedMode ? imageGenModelName : providerConfig.imageModel;
  const selectedModelNotes = providerConfig.registryModels
    ? uniqueRegistryModels([activeMainModelName, ...(outputFormat === 'svg' ? [] : [activeImageGenModelName]), isAdvancedMode ? referenceVisionModelName : providerConfig.visionModel]
        .map((id) => providerConfig.registryModels.find((model) => model.id === id))
        .filter(Boolean))
    : [];
  // 输出清晰度可选项随 provider/图像生成模型变化（自动精修由清晰度档位驱动）。
  const activeImageRegistryEntry = providerConfig.registryModels?.find((model) => model.id === activeImageGenModelName);
  const refineCapability = modelRefinePresentation(activeImageRegistryEntry);
  const resolutionValues = activeImageRegistryEntry?.capabilities?.resolutions?.length
    ? activeImageRegistryEntry.capabilities.resolutions
    : supportedResolutions(provider, activeImageGenModelName);
  const resolutionOptions = RESOLUTION_OPTIONS.filter(([value]) => resolutionValues.includes(value));
  // 有参考图时以后端能力目录为权威；能力未知时默认走独立识别，避免把文本模型误当视觉模型。
  const mainModelCanRead = referenceImages.length
    ? mainModelCapability?.status === 'supported' && mainModelCapability?.supportsReferenceImages !== false
    : mainModelCanReadImages(provider, activeMainModelName);
  const activeReferenceImageMode = isAdvancedMode
    ? referenceImageMode
    : (mainModelCanRead ? 'main_model' : 'vision_model');
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
  const generationConfigSummary = outputFormat === 'svg'
    ? `${providerConfig.label} · ${findModelLabel(providerConfig.mainModels, activeMainModelName)} · SVG 由主模型生成`
    : `${providerConfig.label} · ${findModelLabel(providerConfig.imageModels, activeImageGenModelName)} · ${isAdvancedMode ? `${aspectRatio} / ${imageSize}` : `16:9 / ${imageSize}`} · ${formatOutputFormat(outputFormat)}`;

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
        setModelRegistry(registry);
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
    const latest = mergeProviderRegistry(PROVIDERS[provider], modelRegistry?.providers?.[provider]);
    setMainModelName(latest.mainModel);
    setImageGenModelName(latest.imageModel);
    setReferenceVisionModelName(latest.visionModel);
  }, [provider, modelRegistry?.registryVersion]);

  useEffect(() => {
    if (modelRegistry && !modelRegistry.providers?.[provider]) setProvider('bailian');
  }, [modelRegistry, provider]);

  // provider / 图像生成模型变化时，若当前清晰度不再被支持则收敛到第一档。
  useEffect(() => {
    const supported = activeImageRegistryEntry?.capabilities?.resolutions?.length
      ? activeImageRegistryEntry.capabilities.resolutions
      : supportedResolutions(provider, activeImageGenModelName);
    if (!supported.includes(imageSize)) setImageSize(supported[0]);
  }, [provider, activeImageGenModelName, imageSize, activeImageRegistryEntry]);

  // 参考图模式按固定能力派生：主模型能直读→主模型直读，否则→独立识别模型。
  // provider/主模型变化时重算（之后用户仍可手动切换两种模式）。
  useEffect(() => {
    setReferenceImageMode(mainModelCanReadImages(provider, mainModelName) ? 'main_model' : 'vision_model');
  }, [provider, mainModelName]);

  useEffect(() => {
    if (!referenceImages.length) {
      setMainModelCapability(null);
      return undefined;
    }

    let cancelled = false;
    setMainModelCapability({ status: 'loading', reason: '正在检查主模型能力。' });
    modelCapabilityRequest(apiBaseNormalized, health, provider, activeMainModelName)
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
  }, [apiBaseNormalized, health, provider, activeMainModelName, referenceImages.length]);

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
      setIsAdmin(false);
      return undefined;
    }

    adminStatusRequest(apiBaseNormalized, health)
      .then((data) => {
        if (!cancelled) setIsAdmin(Boolean(data.isAdmin));
      })
      .catch(() => {
        if (!cancelled) setIsAdmin(false);
      });

    return () => {
      cancelled = true;
    };
  }, [apiBaseNormalized, authSession.isPending, currentUser?.id, currentUser?.email, health]);

  useEffect(() => {
    if (!isAdmin && activeTab === 'admin') setActiveTab('generate');
  }, [activeTab, isAdmin]);

  useEffect(() => {
    if (!isAdmin) return undefined;
    let cancelled = false;
    loadAdminOverview({ silent: true, cancelledRef: () => cancelled });
    return () => {
      cancelled = true;
    };
  }, [apiBaseNormalized, health, isAdmin]);

  function addReferenceFiles(files) {
    setReferenceUploadError('');
    if (!files.length) return;
    if (isAdvancedMode && retrievalSetting !== 'none') {
      setReferenceUploadError('请先将检索设置切换为“不使用检索”，再上传参考图。');
      return;
    }

    const availableSlots = REFERENCE_IMAGE_LIMITS.maxCount - referenceImages.length;
    if (availableSlots <= 0) {
      setReferenceUploadError(`最多只能上传 ${REFERENCE_IMAGE_LIMITS.maxCount} 张参考图。`);
      return;
    }

    const accepted = [];
    for (const file of files.slice(0, availableSlots)) {
      const mimeType = normalizeReferenceMimeType(file);
      if (!REFERENCE_IMAGE_LIMITS.mimeTypes.includes(mimeType)) {
        setReferenceUploadError('参考图仅支持 PNG、JPG、WebP 或 SVG。');
        continue;
      }
      if (file.size > REFERENCE_IMAGE_LIMITS.maxBytes) {
        setReferenceUploadError('单张参考图不能超过 5MB。');
        continue;
      }
      accepted.push({
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        file,
        filename: file.name || `reference-${referenceImages.length + accepted.length + 1}.${extensionForMimeType(mimeType)}`,
        mimeType,
        size: file.size,
        previewUrl: URL.createObjectURL(file),
      });
    }

    if (files.length > availableSlots) {
      setReferenceUploadError(`最多只能上传 ${REFERENCE_IMAGE_LIMITS.maxCount} 张参考图，已忽略多余文件。`);
    }

    if (accepted.length) {
      setReferenceImages((current) => [...current, ...accepted]);
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

      await Promise.all(uploadItems.map(async (item) => {
        const upload = uploadMap.get(item.clientId);
        if (!upload?.uploadUrl) throw new Error('参考图上传地址创建失败。');
        const response = await fetch(upload.uploadUrl, {
          method: 'PUT',
          headers: { 'Content-Type': item.mimeType },
          body: item.file,
        });
        if (!response.ok) throw new Error(`参考图上传失败：HTTP ${response.status}`);
      }));

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

  async function submitJob(event) {
    event.preventDefault();
    setError('');
    setErrorContext('');
    const missingSetting = firstMissingGenerationSetting({
      modelRegistryReady,
      selectedKey,
      canMock: isAdvancedMode && mock && health?.mock_enabled,
      isAdvancedMode,
      retrievalSetting,
      manualReferenceIds,
      needsReferenceVisionModel,
      referenceVisionModelName: isAdvancedMode ? referenceVisionModelName : providerConfig.visionModel,
      mainModelDirectUnsupported,
      activeMainModelName,
      activeImageGenModelName,
      outputFormat,
      registryModels: providerConfig.registryModels,
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
      const scopedApiKeys = {
        openrouter: '',
        gemini: '',
        openai: '',
        bailian: '',
        [providerConfig.keyName]: selectedKey,
      };
      const payload = {
        configurationMode,
        provider,
        apiKeys: scopedApiKeys,
        taskName: isPlotCategory ? 'plot' : 'diagram',
        methodContent,
        caption,
        infographicCategory: selectedInfographicCategory[1],
        outputFormat,
        imageSize,
        mainModelName: isAdvancedMode ? mainModelName : providerConfig.mainModel,
        imageGenModelName: isAdvancedMode ? imageGenModelName : providerConfig.imageModel,
        referenceVisionModelName: isAdvancedMode ? referenceVisionModelName : providerConfig.visionModel,
        referenceImageMode: uploadedReferenceImages.length ? activeReferenceImageMode : undefined,
        referenceImages: uploadedReferenceImages,
        pipelineMode: isAdvancedMode ? pipelineMode : 'demo_planner_critic',
        // 上传参考图时以图为唯一风格来源，前端同步关闭检索（后端亦强制，二者一致）。
        retrievalSetting: isAdvancedMode && !uploadedReferenceImages.length ? retrievalSetting : 'none',
        manualReferenceIds: isAdvancedMode && retrievalSetting === 'manual' && !uploadedReferenceImages.length ? manualReferenceIds : [],
        aspectRatio: isAdvancedMode ? aspectRatio : '16:9',
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

  async function loadAdminOverview(options = {}) {
    if (!isAdmin) return;
    if (!options.silent) {
      setAdminError('');
      setAdminUsersError('');
      setAdminFeedbackError('');
    }
    const [jobsResult, usersResult, feedbackResult] = await Promise.allSettled([
      adminJobsRequest(apiBaseNormalized, health),
      adminUsersRequest(apiBaseNormalized, health),
      adminFeedbackRequest(apiBaseNormalized, health, { limit: 50 }),
    ]);

    if (options.cancelledRef?.()) return;

    if (jobsResult.status === 'fulfilled') {
      setAdminJobs(jobsResult.value.jobs || []);
    } else {
      setAdminError(jobsResult.reason?.message || String(jobsResult.reason));
    }

    if (usersResult.status === 'fulfilled') {
      setAdminUsers(usersResult.value.users || []);
    } else {
      setAdminUsersError(usersResult.reason?.message || String(usersResult.reason));
    }

    if (feedbackResult.status === 'fulfilled') {
      setAdminFeedback(feedbackResult.value.feedback || []);
    } else {
      setAdminFeedbackError(feedbackResult.reason?.message || String(feedbackResult.reason));
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

  function applyQuickStartExample(example) {
    setInfographicCategory(example.category);
    setMethodContent(example.methodContent);
    setCaption(example.caption);
  }

  function clearPrivateWorkspace() {
    referenceImagesRef.current.forEach((image) => URL.revokeObjectURL(image.previewUrl));
    referenceImagesRef.current = [];
    setReferenceImages([]);
    setApiKeys({ openrouter: '', gemini: '', openai: '', bailian: '' });
    setMethodContent(SAMPLE_METHOD);
    setCaption('图 1：所提出的多智能体学术图示生成框架总览。');
    setManualReferenceIds([]);
    setReferenceLibrary([]);
    setCurrentJobId('');
    latestJobRef.current = null;
    setJob(null);
    setUserJobs([]);
    setRefineSource({ url: '', objectKey: '' });
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
    setIsAdmin(false);
    setActiveTab('generate');
  }

  async function handleAccountDeleted() {
    clearPrivateWorkspace();
    authSession.clear();
    setShowAccountDialog(false);
    setIsAdmin(false);
    setActiveTab('generate');
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
    setRefineSource(normalizeRefineSource(url, image));
    setRefineInstruction('');
    setRefineError('');
    setActiveTab('refine');
  }

  async function submitRefine(event) {
    event.preventDefault();
    setRefineError('');
    setIsSubmittingRefine(true);
    setJob(null);
    latestJobRef.current = null;
    try {
      const scopedApiKeys = { openrouter: '', gemini: '', openai: '', bailian: '', [providerConfig.keyName]: selectedKey };
      const created = await refineImageRequest(apiBaseNormalized, health, {
        provider,
        apiKeys: scopedApiKeys,
        mainModelName: activeMainModelName,
        imageModelName: activeImageGenModelName,
        referenceVisionModelName: isAdvancedMode ? referenceVisionModelName : providerConfig.visionModel,
        ...refineRequestSource(refineSource),
        editInstruction: refineInstruction,
        aspectRatio: refineAspectRatio,
        imageSize: refineImageSize,
      });
      setCurrentJobId(created.id);
      if (currentUser) void loadUserJobs({ silent: true });
    } catch (refineRequestError) {
      setRefineError(refineRequestError?.message || String(refineRequestError));
    } finally {
      setIsSubmittingRefine(false);
    }
  }

  return (
    <main className="app-shell">
      <header className="paper-header">
        <div className="brand">
          <img className="brand-logo" src={logoUrl} alt="PaperBanana 标志" />
          <div>
            <h1>PaperBanana 工作台</h1>
            <div className="brand-tags">
              <span>多智能体</span>
              <span>学术图示生成</span>
            </div>
          </div>
        </div>
        <div className="header-links">
          <button type="button" className="contact-author-button" onClick={() => setShowContactDialog(true)}>
            <QrCode size={16} /> 联系作者
          </button>
          <a href="https://huggingface.co/papers/2601.23265" target="_blank" rel="noreferrer">
            <FileText size={16} /> 论文
          </a>
          <a href="https://github.com/zdywrnm/PaperBanana-clients" target="_blank" rel="noreferrer">
            <Github size={16} /> GitHub
          </a>
          <a href="https://github.com/zdywrnm/PaperBanana-clients/releases/tag/windows-native-v0.1.2" target="_blank" rel="noreferrer">
            <MonitorDown size={16} /> Windows 版
          </a>
          <a href="https://github.com/zdywrnm/PaperBanana-clients/releases/tag/android-preview-0.1.3" target="_blank" rel="noreferrer">
            <Smartphone size={16} /> Android 版
          </a>
          <a href="https://github.com/zdywrnm/PaperBanana-clients/releases/tag/macos-v0.1.0" target="_blank" rel="noreferrer">
            <Apple size={16} /> Mac 版
          </a>
          <a href="https://github.com/zdywrnm/PaperBanana-clients/tree/main/apps/miniprogram" target="_blank" rel="noreferrer">
            <MessageCircle size={16} /> 微信小程序
          </a>
          <a href="/privacy-policy.html" target="_blank" rel="noreferrer">隐私政策</a>
          <a href="/terms-of-service.html" target="_blank" rel="noreferrer">服务条款</a>
          {AUTH_UI_ENABLED ? (
            currentUser ? (
              <div className="auth-user">
                <ShieldCheck size={16} />
                <span title={currentUser.email}>{currentUser.email}</span>
                <button type="button" onClick={() => setShowAccountDialog(true)}>账号</button>
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

      {showContactDialog ? (
        <div className="feedback-dialog-backdrop" onClick={() => setShowContactDialog(false)}>
          <section className="contact-dialog" role="dialog" aria-modal="true" aria-labelledby="contact-dialog-title" onClick={(event) => event.stopPropagation()}>
            <button ref={contactCloseRef} type="button" className="contact-dialog-close" aria-label="关闭" onClick={() => setShowContactDialog(false)}>
              <X size={18} />
            </button>
            <h2 id="contact-dialog-title">联系作者</h2>
            <p>使用中有任何问题、建议或合作意向，欢迎扫码添加作者微信。</p>
            {contactQrFailed ? (
              <div className="contact-qr-fallback">二维码即将上线，可先点右下角「意见反馈」联系作者。</div>
            ) : (
              <img className="contact-qr" src="/contact-qr.png" alt="作者微信二维码（赵）" onError={() => setContactQrFailed(true)} />
            )}
          </section>
        </div>
      ) : null}

      <button type="button" className="feedback-fab" onClick={openFeedbackDialog}>
        <MessageSquare size={18} />
        <span>意见反馈</span>
      </button>

      <nav className="paper-tabs">
        <button type="button" className={activeTab === 'generate' ? 'active' : ''} onClick={() => setActiveTab('generate')}>生成候选图</button>
        <button type="button" className={activeTab === 'records' ? 'active' : ''} onClick={() => setActiveTab('records')}>任务记录</button>
        <button type="button" className={activeTab === 'refine' ? 'active' : ''} onClick={() => setActiveTab('refine')}>精修图片</button>
        <button type="button" className={activeTab === 'guide' ? 'active' : ''} onClick={() => setActiveTab('guide')}>使用教程</button>
        {isAdmin ? (
          <button type="button" className={activeTab === 'admin' ? 'active' : ''} onClick={() => setActiveTab('admin')}>站长</button>
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
              setActiveTab('records');
            }}
            onCancel={() => setShowAuthPanel(false)}
          />
        ) : (
          <AuthUnavailablePanel onCancel={() => setShowAuthPanel(false)} />
        )
      ) : null}

      {activeTab === 'generate' ? (
        <section className="workspace">
        <form className="generation-form" onSubmit={submitJob}>
          <div className="generation-toolbar">
            <button type="button" className="generation-settings-trigger" onClick={() => { setGenerationFocusSetting(''); setShowGenerationSettings(true) }}><Settings2 size={18} /><span>生成设置</span></button>
            <div className="generation-config-summary" aria-label="当前生成配置"><span>当前配置</span><strong>{generationConfigSummary}</strong></div>
            <button className="primary-button" type="submit" disabled={isSubmitting || isUploadingReferences}>
              {isSubmitting ? <Loader2 className="spin" size={18} /> : <Send size={18} />}{isUploadingReferences ? '上传参考图' : '生成候选图'}
            </button>
          </div>

          <GenerationSettingsDrawer open={showGenerationSettings} onClose={() => setShowGenerationSettings(false)} focusSetting={generationFocusSetting}>

          <div className="field" data-focus-setting="configuration-mode" tabIndex={-1}>
            <span>使用模式</span>
            <div className="mode-switch" role="tablist" aria-label="使用模式">
              <button
                type="button"
                className={!isAdvancedMode ? 'active' : ''}
                onClick={() => setConfigurationMode('simple')}
              >
                <Sparkles size={16} />
                <span>普通模式</span>
                <small>平台 + Key</small>
              </button>
              <button
                type="button"
                className={isAdvancedMode ? 'active' : ''}
                onClick={() => setConfigurationMode('advanced')}
              >
                <Settings2 size={16} />
                <span>专业模式</span>
                <small>模型与流程</small>
              </button>
            </div>
          </div>

          <div className="field" data-focus-setting="provider" tabIndex={-1}>
            <span>{isAdvancedMode ? '模型接口' : '模型平台'}</span>
            <div className="segmented">
              {Object.entries(PROVIDERS).map(([id, item]) => (
                <button
                  type="button"
                  key={id}
                  className={provider === id ? 'active' : ''}
                  disabled={Boolean(modelRegistry && !modelRegistry.providers?.[id])}
                  title={modelRegistry?.unavailableProviders?.[id] || ''}
                  onClick={() => setProvider(id)}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          <div className="output-format-field">
            <Select label="导出格式" value={outputFormat} onChange={setOutputFormat} options={OUTPUT_FORMATS} />
            {outputFormat === 'svg'
              ? <div className="plot-note svg-output-note">SVG 由主模型直接生成；图像生成模型和输出清晰度不参与本次任务。</div>
              : <Select label="输出清晰度" value={imageSize} onChange={setImageSize} options={resolutionOptions} />}
          </div>

          <details className="api-keys-panel" data-focus-setting="api-key" open>
            <summary><KeyRound size={17} /> API 密钥</summary>
            <p>不需要填写全部密钥，只填当前选中的模型接口即可。</p>
            <label className="field">
              <span>{providerConfig.label} API 密钥</span>
              <div className="key-input">
                <KeyRound size={18} />
                <input
                  type="password"
                  value={selectedKey}
                  onChange={(event) => setApiKeys({ ...apiKeys, [providerConfig.keyName]: event.target.value })}
                  placeholder={providerConfig.keyPlaceholder}
                  autoComplete="off"
                />
              </div>
            </label>
            <ApiKeyGuide providerConfig={providerConfig} />
          </details>

          {!isAdvancedMode ? (
            <div className="default-summary" aria-label="默认生成配置">
              <span>{defaultMainModelLabel}</span>
              <span>{outputFormat === 'svg' ? 'SVG 由主模型直接生成' : defaultImageModelLabel}</span>
              <span>{defaultVisionModelLabel}</span>
              <span>规划器 + 评审器</span>
              <span>16:9</span>
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
                <div className="service-boundary-note"><ShieldCheck size={16} />已锁定 PaperBanana 官方后端，API 密钥不会发送到用户指定的第三方地址。</div>
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
                <Select label="画面比例" value={aspectRatio} onChange={setAspectRatio} options={[
                  ['16:9', '16:9'],
                  ['21:9', '21:9'],
                  ['3:2', '3:2'],
                  ['1:1', '1:1'],
                ]} />
                <label className="field compact">
                  <span>候选图数量</span>
                  {/* max 与后端 PAPERBANANA_MAX_CANDIDATES 默认值 (3) 对齐，避免用户选到被后端静默 clamp 的值。 */}
                  <input type="number" min="1" max="3" value={numCandidates} onChange={(event) => setNumCandidates(event.target.value)} />
                </label>
                <label className="field compact">
                  <span>评审轮数</span>
                  <input type="number" min="0" max={INPUT_LIMITS.maxCriticRounds} value={maxCriticRounds} onChange={(event) => setMaxCriticRounds(event.target.value)} />
                  <small>最多 {INPUT_LIMITS.maxCriticRounds} 轮；候选图与评审轮数会增加模型调用费用。</small>
                </label>
              </div>

              <div className="model-grid">
                <ModelPicker label="主模型" role="main" provider={provider} models={providerConfig.registryModels || []} value={mainModelName} onChange={setMainModelName} focusSetting="main-model" />
                {outputFormat === 'svg'
                  ? <div className="plot-note svg-output-note" data-focus-setting="image-model">SVG 模式不使用图像生成模型。</div>
                  : <ModelPicker label="图像生成模型" role="image" provider={provider} models={providerConfig.registryModels || []} value={imageGenModelName} outputFormat={outputFormat} onChange={setImageGenModelName} focusSetting="image-model" />}
                {referenceImages.length && referenceImageMode === 'main_model' ? null : (
                  <ModelPicker label="参考图识别模型" role="vision" provider={provider} models={providerConfig.registryModels || []} value={referenceVisionModelName} onChange={setReferenceVisionModelName} focusSetting="vision-model" />
                )}
              </div>
              {selectedModelNotes.length ? (
                <div className="model-availability-notes" aria-label="模型可用性说明">
                  {selectedModelNotes.map((model) => (
                    <span key={`${model.id}-${model.protocol}`}><strong>{model.label}</strong>：{model.availabilityNotes || '服务端目录可用'} · {formatLifecycle(model.lifecycle)}{model.requiresEntitlement ? ` · 权益：${model.entitlement || '需开通'}` : ' · 无额外权益'}{model.roles?.includes('image') ? ` · ${modelRefinePresentation(model).label}` : ''}</span>
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
          </GenerationSettingsDrawer>
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

            <ExampleTemplates examples={QUICK_START_EXAMPLES} onApply={applyQuickStartExample} />

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
              error={referenceUploadError}
              disabled={isSubmitting}
              isUploading={isUploadingReferences}
              retrievalBlocked={isAdvancedMode && retrievalSetting !== 'none'}
              onAddFiles={addReferenceFiles}
              onRemove={removeReferenceImage}
            />

            <div className="two-col input-copy">
              <label className="field">
                <span>论文方法内容</span>
                <textarea value={methodContent} onChange={(event) => setMethodContent(event.target.value)} rows={12} maxLength={INPUT_LIMITS.methodContent} />
                <small>{methodContent.length.toLocaleString()} / {INPUT_LIMITS.methodContent.toLocaleString()} 字符</small>
              </label>

              <label className="field">
                <span>目标图注</span>
                <textarea value={caption} onChange={(event) => setCaption(event.target.value)} rows={12} maxLength={INPUT_LIMITS.caption} />
                <small>{caption.length.toLocaleString()} / {INPUT_LIMITS.caption.toLocaleString()} 字符</small>
              </label>
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
            <JobStatus job={job} apiBase={apiBaseNormalized} onUseForRefine={useResultForRefine} />
          </div>
        </section>
        </section>
      ) : activeTab === 'refine' ? (
        <Suspense fallback={<div className="loading-card"><Loader2 className="spin" size={18} />正在载入精修工具</div>}>
          <RefinePanel
            sourceUrl={refineSource.url}
            sourceObjectKey={refineSource.objectKey}
            capability={refineCapability}
            instruction={refineInstruction}
            imageSize={refineImageSize}
            aspectRatio={refineAspectRatio}
            canSubmit={authReady && Boolean(selectedKey.trim()) && Boolean(refineSource.objectKey || refineSource.url) && refineInstruction.trim().length >= 3 && !isSubmittingRefine && refineCapability.mode !== 'none'}
            isSubmitting={isSubmittingRefine}
            error={refineError}
            job={job}
            apiBase={apiBaseNormalized}
            onInstructionChange={setRefineInstruction}
            onImageSizeChange={setRefineImageSize}
            onAspectRatioChange={setRefineAspectRatio}
            onSubmit={submitRefine}
          />
        </Suspense>
      ) : activeTab === 'admin' && isAdmin ? (
        <section className="admin-panel">
          <div className="section-head">
            <Eye size={20} />
            <div>
              <h2>站长观察面板</h2>
              <p>已通过登录账号识别管理员身份，可查看账号、反馈和最近任务。</p>
            </div>
          </div>
          <div className="admin-controls admin-controls-single">
            <button type="button" onClick={() => loadAdminOverview()}><RefreshCcw size={17} />刷新</button>
          </div>
          <div className="admin-section">
            <div className="admin-section-title">
              <Users size={17} />
              <strong>账号记录</strong>
              <span>{adminUsers.length ? `${adminUsers.length} 个账号` : '注册/登录后会出现在这里'}</span>
            </div>
            {adminUsersError ? <div className="error-line"><AlertTriangle size={16} /> {formatErrorMessage(adminUsersError)}</div> : null}
            <AdminUsersTable users={adminUsers} />
          </div>
          <div className="admin-section">
            <div className="admin-section-title">
              <MessageSquare size={17} />
              <strong>用户反馈</strong>
              <span>{adminFeedback.length ? `${adminFeedback.length} 条反馈` : '暂无反馈数据'}</span>
            </div>
            {adminFeedbackError ? <div className="error-line"><AlertTriangle size={16} /> {formatErrorMessage(adminFeedbackError)}</div> : null}
            <AdminFeedbackTable feedback={adminFeedback} />
          </div>
          <div className="admin-section">
            <div className="admin-section-title">
              <FileText size={17} />
              <strong>最近任务</strong>
              <span>{adminJobs.length ? `${adminJobs.length} 条任务` : '暂无任务数据'}</span>
            </div>
            {adminError ? <div className="error-line"><AlertTriangle size={16} /> {formatErrorMessage(adminError)}</div> : null}
            <JobTable jobs={adminJobs} showUser apiBase={apiBaseNormalized} />
          </div>
        </section>
      ) : activeTab === 'guide' ? (
        <GuidePanel onStart={() => setActiveTab('generate')} onContact={() => setShowContactDialog(true)} />
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
        />
      )}
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
  if (value === 'preview') return '预览版';
  if (value === 'legacy') return '旧版维护';
  if (value === 'invite-only') return '邀请制';
  if (value === 'deprecated') return '即将下线';
  return '稳定版';
}

function firstMissingGenerationSetting({
  modelRegistryReady,
  selectedKey,
  canMock,
  isAdvancedMode,
  retrievalSetting,
  manualReferenceIds,
  needsReferenceVisionModel,
  referenceVisionModelName,
  mainModelDirectUnsupported,
  activeMainModelName,
  activeImageGenModelName,
  outputFormat,
  registryModels,
}) {
  if (!modelRegistryReady) return { setting: 'provider', message: '模型目录尚未就绪，请重试后选择模型平台。' };
  if (!selectedKey.trim() && !canMock) return { setting: 'api-key', message: '请填写当前模型平台的 API 密钥。' };
  const main = registryModels?.find((model) => model.id === activeMainModelName);
  if (!main || main.selectable === false || !main.roles?.includes('main')) return { setting: 'main-model', message: main?.disabledReason || '请选择可用的主模型。' };
  if (outputFormat !== 'svg') {
    const image = registryModels?.find((model) => model.id === activeImageGenModelName);
    if (!image || image.selectable === false || !image.roles?.includes('image')) return { setting: 'image-model', message: image?.disabledReason || '请选择可用的图像生成模型。' };
    if (image.capabilities?.outputFormats?.length && !image.capabilities.outputFormats.includes(outputFormat)) return { setting: 'image-model', message: `当前图像模型不支持 ${outputFormat.toUpperCase()} 输出。` };
  }
  if (isAdvancedMode && retrievalSetting === 'manual' && !manualReferenceIds.length) return { setting: 'manual-reference', message: '手动参考模式至少需要选用一个案例。' };
  if (needsReferenceVisionModel && !referenceVisionModelName?.trim()) return { setting: 'vision-model', message: '请选择参考图识别模型。' };
  if (mainModelDirectUnsupported) return { setting: 'main-model', message: '当前主模型不能直接读取参考图，请更换模型或处理方式。' };
  return null;
}

function describeReferenceCapability(capability) {
  if (!capability || capability.status === 'loading') return '正在检查当前主模型是否支持直接理解参考图。';
  if (capability.status === 'supported') return '当前主模型支持直接理解参考图，可使用主模型直读。';
  if (capability.status === 'unsupported') return '当前主模型不支持直接理解参考图，请使用独立识别模型或更换主模型。';
  return '当前主模型的参考图能力无法确认；可以尝试主模型直读，失败时请改用独立识别模型或更换主模型。';
}
