import { useGoogle } from './hooks/useGoogle.js';
import { useGithub } from './hooks/useGithub.js';
import { useWechat } from './hooks/useWechat.js';
import useProviderCatalogs from './hooks/useProviderCatalogs.js';
import JournalRulePicker from './components/JournalRulePicker.jsx';
import RefineSourceContext from './components/RefineSourceContext.jsx';
import {loadJournalSelection,saveJournalSelection,admitJournal,journalSelectionForFigure,JOURNAL_VERSION} from '../../../packages/api/src/journal-rules.js';
import useTaskMaterials from './hooks/useTaskMaterials.js';
import FigureReferencePreferences from './components/FigureReferencePreferences.jsx';
import FigureTypePicker from './components/FigureTypePicker.jsx';
import {parseMaterial,validateMaterialSet,isImageMaterial,checkOriginalMaterial,splitMaterialPayload} from './lib/materials.js';
import MaterialUploadPanel from './components/MaterialUploadPanel';
import {getFigureType, TAXONOMY_VERSION} from '../../../packages/figure-taxonomy/src/index.js';
import {loadFigureSettings, saveFigureSettings, restoreFigureTask} from './lib/figureSettings.js';
import { useAppLocale } from './components/BenchmarkLocale.jsx'
import { WORKFLOW_LIMITS, workflowModelVisionStatus, workflowNativeVector } from './lib/workflow.js';
import { loadWorkflowSettings, saveWorkflowSettings, loadGenerationPipeline, normalizeGenerationPipeline, workflowPreflight, VISION_ASSIST_NOTICE } from './lib/workflowSettings.js';
import WorkflowOptions from './components/WorkflowOptions.jsx';
import GenerationWorkspace, { GenerationInputPanel } from './components/GenerationWorkspace';
import useRefineReferences from './hooks/useRefineReferences';
import { refineInputIssue } from './lib/refineControls';
import { refineMaskFile } from './components/RefineMaskEditor';
import useCompactLayout from './hooks/useCompactLayout';
import WorkbenchHeader from './components/WorkbenchHeader';
import PageNavigation from './components/PageNavigation';
import GenerationSummaryDetails from './components/GenerationSummaryDetails';
import useVisualViewport from './hooks/useVisualViewport';
import useBackendRegistry from './hooks/useBackendRegistry';
import { registryReadinessMessage } from './lib/modelRouting.js';
import {copyUniversalConnection} from './lib/universalPresentation.js';
import UniversalApiSettings from './components/UniversalApiSettings.jsx';
import {loadUniversalDrafts,saveUniversalDrafts,universalRoutes,universalDraftEntry,universalKeyEnvelope,bindUniversalKey,updateUniversalDraft,missingUniversalKeys,universalDraftFeedback,UNIVERSAL_PROTOCOL_OPTIONS,UNIVERSAL_PROVIDER} from './lib/universalApi.js';
import { activeReferenceUploadPolicy, referenceUploadSelectionError, referenceModelDimensionsError } from './lib/referenceUploadPolicy';
import { uploadReferenceFiles } from './lib/referenceUpload';
import { useTokenDance } from './hooks/useTokenDance';
import { useWatcha } from './hooks/useWatcha';
import { TokenDanceRecovery, TokenDanceStatus } from './components/TokenDancePanel';
import AccountPage from './components/AccountPage';
import TokenDancePricing from './components/admin/TokenDancePricing';
import { workspaceEntry, selectWorkspaceEntry } from './lib/adminEntry';
import { orderModelChannels } from './lib/modelPresentation'
import { minimaxRegion, regionApiKeySlot, selectRegionApiKeys, registryForRegions } from './lib/providerRegions'
import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  FileText,
  Image as ImageIcon,
  Loader2,
  Send,
  Settings2,
  ShieldCheck,
  Sparkles,
  Undo2,
} from 'lucide-react';
import {
  materialFileRequest,
  uploadMaterialFileRequest,
  adminStatusRequest,
  abortReferenceUploadRequest,
  createJobRequest,
  getJobRequest,
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
  AUTH_BASE_DEFAULT,
  AUTH_REQUIRED,
  AUTH_UI_ENABLED,
  CLIENT_VERSION,
  CUSTOM_API_BASE_ENABLED,
  LOCAL_CONSUMPTION_TEST,
  authClient,
} from './config';
import {
  INFOGRAPHIC_CATEGORIES,
  OUTPUT_FORMATS,
  PROVIDERS,
  REFERENCE_IMAGE_LIMITS,
  RESOLUTION_OPTIONS,
  SAMPLE_METHOD,
  supportedResolutions,
} from './constants';
import AspectRatioPicker from './components/AspectRatioPicker';
import AuthPanel from './components/AuthPanel';
import AuthUnavailablePanel from './components/AuthUnavailablePanel';
import FeaturedTemplateStudio from './components/FeaturedTemplateStudio';
import FeedbackDialog from './components/FeedbackDialog';
import MiniProgramDialog from './components/MiniProgramDialog';
import ContactDialog from './components/ContactDialog';
import AgentConnectionDialog from './components/AgentConnectionDialog';
import GenerationSettingsDrawer from './components/GenerationSettingsDrawer';
import GuidePanel from './components/GuidePanel';
import InputOptimizationDialog from './components/InputOptimizationDialog';
import InputOptimizationFieldActions from './components/InputOptimizationFieldActions';
import useRefineUpload from './hooks/useRefineUpload';
import { refineUploadLimits, validateRefineDimensions, validateRefineFile, readImageDimensions } from './lib/refineUpload';
import JobStatus from './components/JobStatus';
import SvgResultWorkspace from './components/SvgResultWorkspace.jsx';
import {useSvgWorkspace} from './lib/svgGeneration.js';
import ModelRoutingSettings from './components/ModelRoutingSettings';
import ThinkingSettings from './components/ThinkingSettings';
import {thinkingIdentities, reconcileThinkingSettings, rememberThinkingSettings, readThinkingSettings, saveThinkingSettings, buildThinkingSubmission} from './lib/thinkingSettings';
import ReferenceUploadPanel from './components/ReferenceUploadPanel';
import Select from './components/Select';
import TaskRecordsPanel from './components/TaskRecordsPanel';
import { useAuthSession } from './hooks/useAuthSession';
import { formatErrorMessage, formatOutputFormat, pollRetryDelay, shouldClearAuthForJobError } from './utils';
import { INPUT_LIMITS, officialApiBase, shouldPollJob, validateApiBase } from './lib/runtimePolicy';
import { buildAspectRatioOptions, normalizeSelectedAspectRatio } from './lib/aspectRatios';
import { attachFeaturedTemplateImages, featuredTemplateRequest } from './lib/featuredTemplates';
import { mergeProviderRegistry, modelRefinePresentation } from './lib/modelRegistry';
import { buildReferencePageRequest } from './lib/referenceGallery';
import { normalizeRefineSource, refineRequestSource,refineTaskContext,refineSourceIssue } from './lib/refineSource';
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
  scopedApiKeysForRoles, loadRoutingSelection, saveRoutingSelection, mergeProfessionalRoutes,
  uniqueProvidersForRoles,
} from './lib/modelRouting';
import { isLoginEntry } from './appPaths';

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
  const { t } = useAppLocale()
  useVisualViewport();
  const compactLayout = useCompactLayout();
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
  const [showMiniProgramDialog, setShowMiniProgramDialog] = useState(false);
  const [showAgentConnection, setShowAgentConnection] = useState(false);
  const [showAuthPanel, setShowAuthPanel] = useState(() => isLoginEntry(window.location.search));
  const [showAccountDialog, setShowAccountDialog] = useState(false);
  const [showGenerationSettings, setShowGenerationSettings] = useState(false);
  const [generationFocusSetting, setGenerationFocusSetting] = useState('');
  const [inputOptimizationCredentialProvider, setInputOptimizationCredentialProvider] = useState('');
  const [apiBase, setApiBase] = useState(() => API_BASE_DEFAULT || officialApiBase(globalThis.location?.origin));
  const apiBaseNormalized = useMemo(() => {
    try {
      return validateApiBase(apiBase, CUSTOM_API_BASE_ENABLED);
    } catch {
      return officialApiBase(globalThis.location?.origin);
    }
  }, [apiBase]);
  const [restoredRouting] = useState(() => loadRoutingSelection(providerDefaultRoutes(DEFAULT_WEB_PROVIDER, null, PROVIDERS), loadUniversalDrafts()));
  const [configurationMode, setConfigurationMode] = useState(LOCAL_CONSUMPTION_TEST ? 'advanced' : restoredRouting.mode);
  const [routingSaveFailed, setRoutingSaveFailed] = useState(false);
  const professionalInitialized = useRef(restoredRouting.hasProfessionalSelection);

  const [provider, setProvider] = useState(DEFAULT_WEB_PROVIDER);
  const [universalDrafts,setUniversalDrafts] = useState(loadUniversalDrafts);
  const [universalKeys,setUniversalKeys] = useState({});
  const customRoutes = useMemo(()=>universalRoutes(universalDrafts),[universalDrafts]);
  const customEntries = useMemo(()=>Object.fromEntries(Object.entries(universalDrafts).map(([role,d])=>[role,universalDraftEntry(d)])),[universalDrafts]);
  const customEnvelope = useMemo(()=>universalKeyEnvelope(universalDrafts,universalKeys),[universalDrafts,universalKeys]);
  const [apiKeyRing, setApiKeys] = useState(() => Object.fromEntries(Object.keys(PROVIDERS).map((id) => [id, ''])));
  const [restoredFigure] = useState(loadFigureSettings);
  const [methodContent, setMethodContent] = useState(restoredFigure.methodContent ?? SAMPLE_METHOD);
  const [caption, setCaption] = useState(restoredFigure.caption ?? '图 1：所提出的多智能体学术图示生成框架总览。');
  const [negativePrompt, setNegativePrompt] = useState(restoredFigure.negativePrompt ?? '');
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
  const [savedJournalSelection,setJournalSelection]=useState(()=>loadJournalSelection(window.localStorage));
  const [journalSaveFailed,setJournalSaveFailed]=useState(false);
  const [infographicCategory, setInfographicCategory] = useState(restoredFigure.figureTypeId);
  // Resolve only new figure-bound choices. Historical/manual choices retain their recorded meaning.
  const generationJournalSelection=useMemo(()=>{
    try{return journalSelectionForFigure(savedJournalSelection,infographicCategory);}
    catch{return savedJournalSelection;}
  },[savedJournalSelection,infographicCategory]);
  useEffect(()=>{
    if(generationJournalSelection!==savedJournalSelection)setJournalSelection(generationJournalSelection);
    setJournalSaveFailed(!saveJournalSelection(window.localStorage,generationJournalSelection));
  },[generationJournalSelection,savedJournalSelection]);
  const [figureDrafts, setFigureDrafts] = useState(restoredFigure.figureDrafts);
  const currentFigureDraft = figureDrafts[infographicCategory] || {};
  const [figureSaveFailed,setFigureSaveFailed] = useState(false);
  const [outputFormat, setOutputFormat] = useState(restoredFigure.outputFormat);
  const [imageSize, setImageSize] = useState(restoredFigure.imageSize || '1K');
  const [savedThinking, setSavedThinking] = useState(readThinkingSettings);
  const [thinkingSaveState, setThinkingSaveState] = useState('idle');
  const [modelRoutes, setModelRoutes] = useState(restoredRouting.routes);
  const configurationSaveStatus = routingSaveFailed ? '配置自动保存失败，当前页面配置仍保留。' : '配置已自动保存；Key 与验证结果不保存。';
  useEffect(() => {
    // Leave the first professional selection seeded from the current simple preset.
    if (configurationMode !== 'advanced' && !professionalInitialized.current) return;
    const draftsSaved = saveUniversalDrafts(universalDrafts);
    const routesSaved = saveRoutingSelection(configurationMode, modelRoutes);
    setRoutingSaveFailed(!draftsSaved || !routesSaved);
  }, [configurationMode, modelRoutes, universalDrafts]);
  const [restoredWorkflow] = useState(loadWorkflowSettings);
  const [professionalVisionMode, setVisionMode] = useState(restoredWorkflow.visionMode);
  const [referenceImages, setReferenceImages] = useState([]);
  const referenceImagesRef = useRef([]);
  const [referenceUploadError, setReferenceUploadError] = useState('');
  const [isUploadingReferences, setIsUploadingReferences] = useState(false);
  const [isInspectingReferences, setIsInspectingReferences] = useState(false);
  const referenceInspectionRef = useRef(false);
  const [pipelineMode, setPipelineMode] = useState(loadGenerationPipeline);
  const [retrievalSetting, setRetrievalSetting] = useState(restoredFigure.retrievalSetting || 'auto');
  const [manualReferenceIds, setManualReferenceIds] = useState([]);
  const [referenceLibrary, setReferenceLibrary] = useState([]);
  const [featuredTemplates, setFeaturedTemplates] = useState(() => attachFeaturedTemplateImages([]));
  const [referencePageInfo, setReferencePageInfo] = useState({ page: 1, pageSize: 12, totalItems: 0, totalPages: 1, facets: { visualCategories: [], researchDomains: [] }, corpusVersion: '' });
  const referenceRequestRef = useRef({ sequence: 0, controller: null });
  const [referenceLibraryError, setReferenceLibraryError] = useState('');
  const [isLoadingReferenceLibrary, setIsLoadingReferenceLibrary] = useState(false);
  const [aspectRatio, setAspectRatio] = useState(restoredFigure.aspectRatio || '16:9');
  const [numCandidates, setNumCandidates] = useState(restoredWorkflow.numCandidates);
  const [maxCriticRounds, setMaxCriticRounds] = useState(Math.max(1,restoredWorkflow.maxCriticRounds));
  const [workflowSaveError, setWorkflowSaveError] = useState(false);
  useEffect(() => {
    setWorkflowSaveError(!saveWorkflowSettings({numCandidates, maxCriticRounds, visionMode: professionalVisionMode, pipelineMode}));
  }, [numCandidates, maxCriticRounds, professionalVisionMode, pipelineMode]);
  const { health, healthError, registry: rawModelRegistry, registryStatus, retry: retryModelRegistry } = useBackendRegistry(apiBaseNormalized);
  const [providerRegions, setProviderRegions] = useState({ minimax: 'global' });
  const apiKeys = useMemo(() => ({...selectRegionApiKeys(apiKeyRing, providerRegions), custom:customEnvelope}), [apiKeyRing, providerRegions, customEnvelope]);
  const providerCatalogs = useProviderCatalogs({apiBase:apiBaseNormalized,health,registry:rawModelRegistry,apiKeys,providerRegions,identity:AUTH_ENABLED ? authSession.session?.user?.id || '' : ''});
  const modelRegistry = useMemo(() => registryForRegions(providerCatalogs.registry, providerRegions), [providerCatalogs.registry, providerRegions]);
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
  const [refinePollNonce, setRefinePollNonce] = useState(0);
  const [refineJob, setRefineJob] = useState(null);
  const [refinePollError, setRefinePollError] = useState('');
  const refineSubmitLock = useRef(false);
  const refineRequestGeneration = useRef(0);
  const [refineInstruction, setRefineInstruction] = useState('');
  const [refineImageSize, setRefineImageSize] = useState('2K');
  const [refineAspectRatio, setRefineAspectRatio] = useState('16:9');
  const [refineMask,setRefineMask] = useState(null);
  const [refineStructuredEnabled,setRefineStructuredEnabled] = useState(false);
  const [refineStructured,setRefineStructured] = useState({object:'',attributes:'',relationship:'',preserve:''});
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
  const generationMaterials=useTaskMaterials({apiBase:apiBaseNormalized,health,ownerId:currentUser?.id,version:modelRegistry?.materialFileVersion,kind:'generate'});
  const refinementMaterials=useTaskMaterials({apiBase:apiBaseNormalized,health,ownerId:currentUser?.id,version:modelRegistry?.materialFileVersion,kind:'refine'});
  const {materials:sourceMaterials,setMaterials:setSourceMaterials}=generationMaterials;
  const figureRestoreState = useRef({ownerId:currentUser?.id || '',apiBase:apiBaseNormalized,sequence:0});
  if(figureRestoreState.current.ownerId !== (currentUser?.id || '') || figureRestoreState.current.apiBase !== apiBaseNormalized) {
    figureRestoreState.current={ownerId:currentUser?.id || '',apiBase:apiBaseNormalized,sequence:figureRestoreState.current.sequence+1};
  }
  useEffect(()=>()=>{figureRestoreState.current.sequence+=1},[]);
  const isAdmin = Boolean(currentUser?.id && adminIdentity === currentUser.id);
  const authReady = !AUTH_REQUIRED || Boolean(!authSession.isPending && currentUser);
  const tokenDance = useTokenDance(apiBaseNormalized, currentUser?.id, !authSession.isPending);
  const wechat = useWechat(AUTH_BASE_DEFAULT, currentUser?.id, AUTH_ENABLED && !LOCAL_CONSUMPTION_TEST, async () => {await authSession.refresh();setShowAuthPanel(false);});
  const github = useGithub(AUTH_BASE_DEFAULT, currentUser?.id, AUTH_ENABLED && !LOCAL_CONSUMPTION_TEST, async () => {await authSession.refresh();setShowAuthPanel(false);});
  const google = useGoogle(AUTH_BASE_DEFAULT, currentUser?.id, AUTH_ENABLED && !LOCAL_CONSUMPTION_TEST, async () => {await authSession.refresh();setShowAuthPanel(false);});
  const watcha = useWatcha(AUTH_BASE_DEFAULT, currentUser?.id, AUTH_ENABLED && !LOCAL_CONSUMPTION_TEST, async () => {
    await authSession.refresh();
    setShowAuthPanel(false);
  });
  async function handleEmailAuthenticated() {
    await authSession.refresh();
    setShowAuthPanel(false);
    if (watcha.status.pending) openAccount();
    else if (activeTab !== 'account') selectTab('records');
  }
  const selectedFigureType = getFigureType(infographicCategory);
  const selectedInfographicCategory = [infographicCategory, selectedFigureType?.label || '历史数据统计图', selectedFigureType?.definition || '请选择具体图型。'];
  const isAdvancedMode = configurationMode === 'advanced';
  const isPlotCategory = selectedFigureType?.kind === 'data' || infographicCategory === 'data_stat';
  const isCompositeFigure = selectedFigureType?.kind === 'composite';
  useEffect(() => { setFigureSaveFailed(!saveFigureSettings({retrievalSetting,figureTypeId:infographicCategory,figureDrafts,outputFormat,methodContent,caption,negativePrompt,imageSize,aspectRatio})); }, [infographicCategory,figureDrafts,outputFormat,methodContent,caption,negativePrompt,imageSize,aspectRatio,retrievalSetting]);
  const [simpleModelRoutes, setSimpleModelRoutes] = useState(() => providerDefaultRoutes(DEFAULT_WEB_PROVIDER, null, PROVIDERS));
  const preferredSimpleMain = providerDefaultRoutes(provider, modelRegistry, PROVIDERS)?.main;
  const preferredSimpleMainEntry = modelRegistry?.providers?.[provider]?.models?.find(model => model.id === preferredSimpleMain?.modelId);
  // Refresh only the main-model preference; a catalog outage must not switch the image model.
  const resolvedSimpleRoutes = workflowModelVisionStatus(preferredSimpleMainEntry) === 'supported'
    ? {...simpleModelRoutes, main: preferredSimpleMain} : simpleModelRoutes;
  useEffect(() => {
    if (workflowModelVisionStatus(preferredSimpleMainEntry) !== 'supported') return;
    setSimpleModelRoutes(current => current.main.modelId === preferredSimpleMain.modelId
      ? current : {...current, main: preferredSimpleMain});
  }, [provider, preferredSimpleMain?.modelId, preferredSimpleMainEntry]);
  const activeModelRoutes = isAdvancedMode ? mergeProfessionalRoutes(modelRoutes, customRoutes) : resolvedSimpleRoutes;
  const hasCustomRoutes = Object.values(activeModelRoutes).some(route => route.accessProvider === 'custom');
  const providerConfig = activeModelRoutes.main.accessProvider === 'custom' ? UNIVERSAL_PROVIDER : mergeProviderRegistry(PROVIDERS[activeModelRoutes.main.accessProvider], modelRegistry?.providers?.[activeModelRoutes.main.accessProvider]);
  const imageProviderConfig = activeModelRoutes.image.accessProvider === 'custom' ? UNIVERSAL_PROVIDER : mergeProviderRegistry(PROVIDERS[activeModelRoutes.image.accessProvider], modelRegistry?.providers?.[activeModelRoutes.image.accessProvider]);
  const activeMainModelName = activeModelRoutes.main.modelId;
  const activeImageGenModelName = activeModelRoutes.image.modelId;
  const activeReferenceVisionModelName = activeModelRoutes.vision.modelId;
  const activeMainRegistryEntry = activeModelRoutes.main.accessProvider === 'custom' ? customEntries.main : modelRegistry?.providers?.[activeModelRoutes.main.accessProvider]?.models?.find((model) => model.id === activeMainModelName);
  const activeImageRegistryEntry = activeModelRoutes.image.accessProvider === 'custom' ? customEntries.image : modelRegistry?.providers?.[activeModelRoutes.image.accessProvider]?.models?.find((model) => model.id === activeImageGenModelName);
  const activeVisionRegistryEntry = activeModelRoutes.vision.accessProvider === 'custom' ? customEntries.vision : modelRegistry?.providers?.[activeModelRoutes.vision.accessProvider]?.models?.find((model) => model.id === activeReferenceVisionModelName);
  const mainVisionStatus = workflowModelVisionStatus(activeMainRegistryEntry);
  const visionStatus = workflowModelVisionStatus(activeVisionRegistryEntry);
  const visionMode = isAdvancedMode ? professionalVisionMode : mainVisionStatus === 'supported' ? 'none' : 'assist';
  const thinkingIdentity = thinkingIdentities(activeModelRoutes, {main:activeMainRegistryEntry, vision:activeVisionRegistryEntry, image:activeImageRegistryEntry}, providerRegions);
  const thinkingIdentityKey = JSON.stringify(thinkingIdentity);
  const thinkingSettings = reconcileThinkingSettings(savedThinking, thinkingIdentity);
  useEffect(() => {
    if (!modelRegistry) return;
    setSavedThinking(current => {
      const next = rememberThinkingSettings(reconcileThinkingSettings(current, JSON.parse(thinkingIdentityKey)), current);
      return next;
    });
  }, [thinkingIdentityKey, Boolean(modelRegistry)]);
  useEffect(() => {
    if (savedThinking) setThinkingSaveState(saveThinkingSettings(savedThinking) ? 'saved' : 'error');
  }, [savedThinking]);
  function retryThinkingSave() {
    setThinkingSaveState(saveThinkingSettings(savedThinking) ? 'saved' : 'error');
  }
  function changeThinking(role, selection) {
    const next = rememberThinkingSettings({...thinkingSettings, roles:{...thinkingSettings.roles,[role]:selection}}, savedThinking);
    setSavedThinking(next);
  }
  const refineCapability = modelRefinePresentation(activeImageRegistryEntry);
  const refineObserverRole = visionMode === 'none' ? 'main' : 'vision';
  const activeRefineUploadLimits = refineUploadLimits(modelRegistry?.refineUpload, activeModelRoutes[refineObserverRole].accessProvider === 'custom' && !customEntries[refineObserverRole].selectable ? undefined : activeModelRoutes[refineObserverRole], 'generation');
  const { source: refineSource, setSource: setRefineSource,beginSelection:beginRefineSelection,captureSelection:captureRefineSelection,updateSettings:updateRefineSettings, upload: refineUpload, selectFiles: selectRefineFiles, retry: retryRefineUpload,prepareSource:prepareRefineSource,restoreOriginal:restoreRefineOriginal } = useRefineUpload({
    apiBase: apiBaseNormalized, health, limits: activeRefineUploadLimits, authReady, materialVersion:modelRegistry?.materialFileVersion, ownerId: currentUser?.id || '',
    onSelectionChange:resetRefineTaskForSource,
  });
  const journalSelection=workspaceTab==='refine'?(refineSource.journalSelection??null):generationJournalSelection;
  const refineNatureIssue=refineSourceIssue(refineSource);
  function changeRefineContent(contentType){
    const selection=refineSource.journalSelection;
    const {contentSource,figureTypeId,...manual}=selection||{};
    updateRefineSettings(refineSource.identity,{contentType,journalSelection:selection?{...manual,contentType}:null});
  }
  const refineControls = Number(modelRegistry?.refineControlsContractVersion) >= 1 ? activeImageRegistryEntry?.capabilities?.refineControls : null;
  const refineReferencePolicy = activeReferenceUploadPolicy(modelRegistry?.referenceUpload,activeModelRoutes.image.accessProvider === 'custom' && !customEntries.image.selectable ? undefined : activeModelRoutes.image,'refine');
  refineReferencePolicy.maxCount = Math.min(refineReferencePolicy.platform.maxCount,Math.max(0,(refineControls?.maxImages || 1)-1));
  const refineReferences = useRefineReferences({apiBase:apiBaseNormalized,health,ownerId:currentUser?.id || '',policy:refineReferencePolicy});
  const refineInputDraft = {version:1,references:refineReferences.images.map(image=>({objectKey:image.id,purpose:image.purpose,note:image.note})),...(refineMask?.strokes?.length ? {mask:{objectKey:'pending-mask'}} : {}),...(refineStructuredEnabled ? {structured:refineStructured} : {})};
  const hasRefineControls = Boolean(refineControls || refineInputDraft.references.length || refineInputDraft.mask || refineInputDraft.structured);
  const refineControlsIssue = refineMask?.strokes?.length && refineMask.sourceId !== refineSource.url ? '原图已更换，旧遮罩仍保留；请清除旧遮罩并重新标记。'
    : refineInputIssue(refineControls, hasRefineControls ? refineInputDraft : undefined,refineAspectRatio,refineImageSize)
      || referenceUploadSelectionError(refineReferences.images,refineReferencePolicy)
      || [...(hasRefineControls ? [refineSource] : []),...refineReferences.images].some(image=>image.width>refineReferencePolicy.submission.maxDimension || image.height>refineReferencePolicy.submission.maxDimension || image.width*image.height>refineReferencePolicy.submission.maxPixels) && '当前型号的输入尺寸超限；已保留图片，请裁剪、导出或切换模型，不会自动缩小。';
  useEffect(()=>{setRefineMask(null);setRefineStructuredEnabled(false);setRefineStructured({object:'',attributes:'',relationship:'',preserve:''});},[currentUser?.id,apiBaseNormalized]);
  const inputOptimizationSupported = Number(modelRegistry?.inputOptimizationContractVersion) >= 1;
  const refineOptimizationSupported = inputOptimizationSupported && modelRegistry?.inputOptimizationTargets?.includes('editInstruction');
  const selectedCatalogIssues = [...new Set([activeMainRegistryEntry, ...(workspaceTab==='refine'||outputFormat!=='svg'?[activeImageRegistryEntry]:[]), ...(visionMode === 'assist' ? [activeVisionRegistryEntry] : [])].filter(entry => entry?.selectable === false).map(entry => `${entry.label || entry.id}：${entry.disabledReason || '暂不可用'}`))];
  // 输出清晰度可选项随 provider/图像生成模型变化（自动精修由清晰度档位驱动）。
  const resolutionValues = outputFormat==='svg' ? ['1K'] : activeImageRegistryEntry?.capabilities?.resolutions?.length
    ? activeImageRegistryEntry.capabilities.resolutions
    : supportedResolutions(activeModelRoutes.image.accessProvider, activeImageGenModelName);
  const resolutionOptions = RESOLUTION_OPTIONS.filter(([value]) => resolutionValues.includes(value));
  const generationAspectRatioOptions = buildAspectRatioOptions({
    capabilities: outputFormat==='svg' ? {aspectRatios:['auto','1:1','3:2','2:3','4:3','3:4','16:9','9:16']} : activeImageRegistryEntry?.capabilities,
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
  const directBasicReference = false; // model-v1 always honors the selected optional vision role.
  const activeReferenceImageMode = visionMode === 'none' || directBasicReference ? 'main_model' : 'vision_model';
  const referenceRole = activeReferenceImageMode === 'main_model' ? 'main' : 'vision';
  const activeReferenceUpload = activeReferenceUploadPolicy(modelRegistry?.referenceUpload, activeModelRoutes[referenceRole].accessProvider === 'custom' && !customEntries[referenceRole].selectable ? undefined : activeModelRoutes[referenceRole]);
  const referenceSelectionIssue = referenceUploadSelectionError(referenceImages, activeReferenceUpload);
  const mainModelDirectUnsupported = referenceImages.length > 0 && visionMode === 'none' && mainVisionStatus !== 'supported';
  const needsReferenceVisionModel = referenceImages.length > 0 && activeReferenceImageMode === 'vision_model';
  const referenceCapabilityNote = activeReferenceImageMode === 'vision_model'
    ? '视觉模型先分析参考图，主模型再结合分析制定完整方案。'
    : '由主模型直接读取参考图；提交前会确认其图片理解能力。';
  const effectivePipelineMode = pipelineMode;
  const effectiveRetrievalSetting = retrievalSetting;
  const effectiveTaskName = 'diagram';
  const createWorkflowBody = {
    action: 'createJob', generationPath:'model-v1', visionMode: directBasicReference ? 'none' : visionMode,
    numCandidates: isAdvancedMode ? numCandidates : 1,
    maxCriticRounds: isAdvancedMode ? maxCriticRounds : 1,
    modelRoutes: activeModelRoutes,
    taskName: effectiveTaskName,
    figureTypeId: getFigureType(infographicCategory)?.id,

    outputFormat,
    pipelineMode: effectivePipelineMode === 'demo_planner_critic' ? 'planner_critic' : effectivePipelineMode === 'demo_full' ? 'full' : effectivePipelineMode,
    retrievalSetting: effectiveRetrievalSetting,
    imageSize,
    imageRefineMode: refineCapability.mode,
    referenceImages,
    referenceImageMode: activeReferenceImageMode,
  };
  const createRouteRoles = requiredCreateRouteRoles(createWorkflowBody, createWorkflowBody.maxCriticRounds);
  const refineWorkflowBody = {action: 'refineImage', visionMode, refineMode: refineCapability.mode, modelRoutes: activeModelRoutes};
  const refineRouteRoles = requiredRefineRouteRoles(refineWorkflowBody);
  const createWorkflowIssue = workflowPreflight(createWorkflowBody, modelRegistry, registryStatus, mainVisionStatus, visionStatus);
  const refineWorkflowIssue = workflowPreflight(refineWorkflowBody, modelRegistry, registryStatus, mainVisionStatus, visionStatus);
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
  const missingCredentialProviders = credentialProviders.filter(routeProvider => routeProvider === 'custom'
    ? missingUniversalKeys(activeModelRoutes, credentialRouteRoles.filter(role => activeModelRoutes[role].accessProvider === 'custom'), customEnvelope).length > 0
    : routeProvider === 'tokendance' ? !tokenDance.connection.connected : !apiKeys[routeProvider]?.trim());
  const refineConfigSummary = `${imageProviderConfig.label} · ${activeImageRegistryEntry?.label || activeImageGenModelName}`;
  const refineRunning = isSubmittingRefine || refineJob?.status === 'queued' || refineJob?.status === 'running';
  const refineSourcePolicyIssue = (activeRefineUploadLimits?.submissionPolicy
    ? referenceModelDimensionsError(refineSource, activeRefineUploadLimits.submissionPolicy) : '')
    || (refineCapability.mode === 'direct-edit' ? referenceModelDimensionsError(refineSource, refineReferencePolicy) : '');
  const refineSubmitHint = !authReady ? '请先登录，再提交精修。'
    : refineWorkflowIssue ? refineWorkflowIssue
    : refineRunning ? '正在处理当前精修，请等待完成。'
    : ['loading','validating', 'uploading', 'checking'].includes(refineUpload.status) ? '请等待原图读取、上传与校验完成。'
    : refineReferences.busy || refinementMaterials.busy ? '请等待文件保存完成。'
    : refineControlsIssue ? refineControlsIssue
    : refineSourcePolicyIssue ? refineSourcePolicyIssue
    : !refineSource.browserSource && !Object.keys(refineRequestSource(refineSource)).length ? '请先选择并上传一张原图。'
    : refineNatureIssue ? refineNatureIssue
    : refineCapability.mode === 'none' ? '请在精修设置中选择支持精修的图像模型。'
    : !refineResolutionValues.includes(refineImageSize) || !refineResolutionOptions.length || !refineAspectRatioOptions.some(option => option.value === refineAspectRatio) ? '请在精修设置中选择可用模型和参数。'
    : missingCredentialProviders.length ? '请在精修设置中填写所需接入密钥。'
    : refineInstruction.trim().length < 3 ? '请填写至少 3 个字符的精修指令。'
    : refineInstruction.length > 2000 ? '精修指令不能超过 2000 个字符。' : '';

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



  // provider / 图像生成模型变化时，若当前清晰度不再被支持则收敛到第一档。
  useEffect(() => {
    if (outputFormat==='svg' || activeModelRoutes.image.accessProvider === 'custom' || !activeImageRegistryEntry || activeImageRegistryEntry.selectable === false) return;
    const supported = activeImageRegistryEntry?.capabilities?.resolutions?.length
      ? activeImageRegistryEntry.capabilities.resolutions
      : supportedResolutions(activeModelRoutes.image.accessProvider, activeImageGenModelName);
    if (!supported.includes(imageSize)) setImageSize(supported[0]);
  }, [activeModelRoutes.image.accessProvider, activeImageGenModelName, imageSize, activeImageRegistryEntry, outputFormat]);

  useEffect(() => {
    if (activeModelRoutes.image.accessProvider === 'custom' || !activeImageRegistryEntry || activeImageRegistryEntry.selectable === false) return;
    const normalized = normalizeSelectedAspectRatio(aspectRatio, generationAspectRatioOptions);
    if (normalized !== aspectRatio) setAspectRatio(normalized);
  }, [activeModelRoutes.image.accessProvider, activeImageGenModelName, activeImageRegistryEntry, aspectRatio, imageSize, isPlotCategory]);

  // Preserve refinement inputs across route/catalog changes; admission explains incompatibilities.

  useEffect(() => {
    setInputOptimizationCredentialProvider('');
  }, [activeModelRoutes.main.accessProvider, activeMainModelName]);

  useEffect(() => {
    referenceImagesRef.current = referenceImages;
  }, [referenceImages]);

  useEffect(() => () => {
    referenceImagesRef.current.forEach((image) => URL.revokeObjectURL(image.previewUrl));
  }, []);


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
          void generationMaterials.remember(data);
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
    if (retrievalSetting !== 'manual') return undefined;
    let cancelled = false;
    loadReferenceLibrary({ silent: true, cancelledRef: () => cancelled, page: 1 });
    return () => {
      cancelled = true;
    };
  }, [apiBaseNormalized, health, retrievalSetting]);

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

  const storeOriginalMaterial=generationMaterials.store;
  async function addReferenceFiles(files) {
    if (referenceInspectionRef.current || isSubmitting || isUploadingReferences) return;
    const generation=refineRequestGeneration.current;
    const reportError=message=>{if(generation===refineRequestGeneration.current)setReferenceUploadError(previous=>[previous,message].filter(Boolean).join(' '));};
    if (!files.length) return;

    const availableSlots = activeReferenceUpload.platform.maxCount - referenceImages.length;
    if (availableSlots <= 0) {
      reportError(`最多只能上传 ${activeReferenceUpload.platform.maxCount} 张参考图。`);
      return;
    }

    referenceInspectionRef.current = true;
    setIsInspectingReferences(true);
    try {
      const accepted = [];
      for (const file of files.slice(0, availableSlots)) {
        const mimeType = normalizeReferenceMimeType(file);
        if (!activeReferenceUpload.platform.mimeTypes.includes(mimeType)) {
          reportError('参考图仅支持 PNG、JPG、WebP 或 SVG。');
          continue;
        }
        if (!file.size || file.size > activeReferenceUpload.platform.maxBytes) {
          reportError(`单张原图须大于 0 且不超过 ${activeReferenceUpload.platform.maxBytes / 1024 / 1024}MiB。`);
          continue;
        }
        const previewUrl = URL.createObjectURL(file);
        let dimensions;
        try {
          dimensions = await readImageDimensions(previewUrl);
          validateRefineDimensions(dimensions, activeReferenceUpload.platform);
        } catch (error) { URL.revokeObjectURL(previewUrl); reportError(error.message); continue; }
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
        reportError(`最多只能上传 ${activeReferenceUpload.platform.maxCount} 张参考图，已忽略多余文件。`);
      }

      if(generation!==refineRequestGeneration.current){accepted.forEach(image=>URL.revokeObjectURL(image.previewUrl));return;}
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
        void refinementMaterials.remember(data);
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
  }, [apiBaseNormalized, health, refineJobId, refinePollNonce]);

  function resetRefineTaskForSource() {
    refineRequestGeneration.current += 1;
    setRefineJobId('');
    setRefineJob(null);
    setRefinePollError('');
    setRefineError('');
    setInputOptimizationUndos(current => ({ ...current, editInstruction: null }));
    if (inputOptimizationDialog.target === 'editInstruction') closeInputOptimization();
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

  function handleConfigurationModeChange(nextMode) {
    if (nextMode === configurationMode) return;
    // Seed professional mode once from the current ordinary preset; subsequent switches restore it.
    if (nextMode === 'advanced' && !professionalInitialized.current) {
      setModelRoutes(resolvedSimpleRoutes);
      professionalInitialized.current = true;
    }
    if (nextMode === 'simple') {
      const defaults = providerDefaultRoutes(activeModelRoutes.main.accessProvider, modelRegistry, PROVIDERS);
      // A text-only channel cannot supply a simple preset; retain the previous complete preset.
      if (defaults) {
        setProvider(activeModelRoutes.main.accessProvider);
        setSimpleModelRoutes(defaults);
      }
    }
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
    setSimpleModelRoutes(providerDefaultRoutes(nextProvider, modelRegistry, PROVIDERS));
    arkProbeGenerationRef.current += 1;
    arkActiveProbeRequestRef.current = 0;
    setIsVerifyingArk(false);
    setArkVerification({});
    setArkProbePaidConfirmed(false);
    setArkVerificationError('');
  }

  function handleModelRouteChange(role, route) {
    professionalInitialized.current = true;
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
      setInputOptimizationGuidance('当前服务端尚未支持 稀宇科技国内区域，请等待服务端更新。');
      return null;
    }
    const apiKey = scopedApiKeysForRoles(activeModelRoutes, ['main'], apiKeys)[mainRoute.accessProvider]?.trim();
    const missingCustomKey = mainRoute.accessProvider === 'custom' && missingUniversalKeys(activeModelRoutes, ['main'], apiKey).length > 0;
    if ((missingCustomKey || !apiKey) && !(mainRoute.accessProvider === 'tokendance' && tokenDance.connection.connected)) {
      setInputOptimizationCredentialProvider(mainRoute.accessProvider);
      setInputOptimizationGuidance('请先在生成设置中填写当前主模型接入渠道的密钥。');
      setGenerationFocusSetting('api-key');
      setShowGenerationSettings(true);
      return null;
    }
    return {
      mainRoute: { ...mainRoute },
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
    if (generationMaterials.busy) { setError('请等待文件保存完成。'); setErrorContext('input'); return; }
    let typedFigure;
    try {
      if(modelRegistry?.figureTaxonomyVersion !== TAXONOMY_VERSION)throw new Error('当前服务尚未接入这版图型规范，请更新后端并连接支持这版规范的 Core。不会把具体图型降为通用图提交。');
      if(modelRegistry?.materialWorkflowVersion!==1)throw new Error('当前后端尚未升级到文件与模型绘图流程，请连接新版 Core；不会退回程序绘图。');
      if(journalSelection&&modelRegistry?.journalRuleVersion!==JOURNAL_VERSION)throw new Error('当前后端未支持这版期刊规则，暂不能按期刊提交；选择不指定期刊可使用通用流程。');
      admitJournal(journalSelection,outputFormat);
      validateMaterialSet(sourceMaterials);
      typedFigure={figureTypeId:selectedFigureType.id,generationPath:'model-v1',...splitMaterialPayload(sourceMaterials),figureAnalysis:{referencePreferences:currentFigureDraft.analysis?.referencePreferences||{}}};
    } catch(error) { setError(error.message); setErrorContext('input'); return; }
    if (createWorkflowIssue) {
      setError(createWorkflowIssue);
      setErrorContext('configuration');
      setGenerationFocusSetting('workflow-preflight');
      setShowGenerationSettings(true);
      return;
    }
    if (referenceSelectionIssue) { setReferenceUploadError(referenceSelectionIssue); return; }
    let modelSubmission;
    try {
      modelSubmission = buildModelSubmission({ configurationMode, modelRoutes: activeModelRoutes, registry: modelRegistry, registryStatus, providerRegions, requiredRoles: createRouteRoles });
      Object.assign(modelSubmission, buildThinkingSubmission(thinkingSettings, modelRegistry, createRouteRoles, 'generation'));
    } catch (routingError) {
      setGenerationFocusSetting('configuration-mode');
      setShowGenerationSettings(true);
      setError(routingError.message);
      setErrorContext('configuration');
      return;
    }
    if (createRouteRoles.includes('image') && activeImageRegistryEntry?.capabilities?.requiresSourceImage && outputFormat !== 'svg') {
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
    if (!sourceMaterials.length && !referenceImages.length && (methodContent.trim().length < 20 || caption.trim().length < 3)) {
      setError(methodContent.trim().length < 20 ? '论文方法内容至少需要 20 个字符。' : '目标图注至少需要 3 个字符。');
      setErrorContext('input');
      return;
    }
    setIsSubmitting(true);
    setJob(null);
    latestJobRef.current = null;
    let stagedMaterials=[];
    try {
      stagedMaterials=await generationMaterials.prepare();
      const uploadedReferenceImages = await uploadReferencesForJob();
      const scopedApiKeys = scopedApiKeysForRoles(activeModelRoutes, createRouteRoles, apiKeys);
      const payload = {
        ...modelSubmission,
        apiKeys: scopedApiKeys,
        taskName: effectiveTaskName,
        methodContent,
        negativePrompt,
        caption,
        journalSelection,
        infographicCategory: selectedInfographicCategory[1],
        ...typedFigure,
        materialFiles:stagedMaterials,
        figureSpecVersion: TAXONOMY_VERSION,
        outputFormat,
        imageSize,
        visionMode: createWorkflowBody.visionMode,
        referenceImageMode: uploadedReferenceImages.length ? activeReferenceImageMode : undefined,
        referenceImages: uploadedReferenceImages,
        pipelineMode: effectivePipelineMode,
        // User materials and library retrieval are independent inputs.
        retrievalSetting: effectiveRetrievalSetting,
        manualReferenceIds: retrievalSetting === 'manual' ? manualReferenceIds : [],
        aspectRatio,
        numCandidates: isAdvancedMode ? Number(numCandidates) : 1,
        maxCriticRounds: isAdvancedMode ? Number(maxCriticRounds) : 1,
        mock: isAdvancedMode ? mock : false,
      };
      const created = await createJobRequest(apiBaseNormalized, health, payload);
      void generationMaterials.remember({id:created.id,status:created.status,materialFiles:stagedMaterials});
      stagedMaterials=[];
      setCurrentJobId(created.id);
      if (currentUser) void loadUserJobs({ silent: true });
    } catch (err) {
      await generationMaterials.discard(stagedMaterials);
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
    setInfographicCategory(template.category === 'data_stat' ? 'bar' : template.category);
    setMethodContent(template.methodContent);
    setCaption(template.caption);
    setNegativePrompt(template.negativePrompt);
    setInputIsDirty(false);
  }

  function clearPrivateWorkspace() {
    figureRestoreState.current.sequence += 1;
    refineRequestGeneration.current += 1;
    clearInputOptimizationUndos();
    referenceImagesRef.current.forEach((image) => URL.revokeObjectURL(image.previewUrl));
    referenceImagesRef.current = [];
    setReferenceImages([]);
    // Account-scoped browser originals and drafts are managed by useTaskMaterials.

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
    setFigureDrafts({});
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

  async function useResultForRefine(url, image) {
    if (image.outputFormat==='svg' || /svg/.test(image.mime_type||image.mimeType||'')) {
      const generation=refineRequestGeneration.current;
      try {
        const key=image.object_key||image.objectKey||'';
        if(!key)throw Error('这份 SVG 没有可恢复的任务记录，请下载后作为文件上传，并选择 SVG。');
        const saved=await getJobRequest(apiBaseNormalized,health,key.split('/')[0]);
        const response=await fetch(url,{credentials:'omit'});
        if(!response.ok)throw Error('SVG 源码读取失败，请重试。');
        const blob=await response.blob();
        const material=await storeOriginalMaterial(new File([blob],'待修改的SVG源码.txt',{type:'text/plain'}));
        if(generation!==refineRequestGeneration.current)return;
        await restoreSavedFigureInput(saved,{additionalMaterials:[material],forcedFormat:'svg'});
      } catch(error) {if(generation===refineRequestGeneration.current){setError(error.message);setErrorContext('input');selectTab('generate');}}
      return;
    }
    if (refineRunning) { selectTab('refine'); return; }
    const ticket=beginRefineSelection();
    selectTab('refine');
    try {
      const key=image.object_key||image.objectKey||'';
      const saved=key?await getJobRequest(apiBaseNormalized,health,key.split('/')[0]):null;
      const materials=saved?await refinementMaterials.restore(saved):[];
      if(!ticket.isCurrent())return;
      const taskContext=saved?refineTaskContext(saved):null;
      if(!setRefineSource({...normalizeRefineSource(url,image),taskContext,journalSelection:taskContext?.journalSelection??null,contentType:taskContext?.contentType??null},ticket))return;
      await refinementMaterials.setMaterials(materials);
      if(!ticket.isCurrent())return;
      setRefineInstruction('');setRefineError('');
    }catch(error){if(ticket.isCurrent())setRefineError(error.message);}
  }

  async function submitRefine(event) {
    event.preventDefault();
    setRefineError('');
    try {
      if(refineNatureIssue)throw new Error(refineNatureIssue);
      if(journalSelection&&modelRegistry?.journalRuleVersion!==JOURNAL_VERSION)throw new Error('当前后端未支持这版期刊规则，暂不能按期刊精修。');
      admitJournal(journalSelection,'png','model-v1',undefined,'generative-refine');
    }catch(error){setRefineError(error.message);return;}
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
      setRefineError(`请先填写${missingCredentialProviders.map((item) => (item === 'custom' ? '通用 API' : PROVIDERS[item]?.label || item)).join('、')}接入密钥。`);
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
      modelSubmission = buildModelSubmission({ configurationMode, modelRoutes: activeModelRoutes, registry: modelRegistry, registryStatus, providerRegions, requiredRoles: refineRouteRoles });
      Object.assign(modelSubmission, buildThinkingSubmission(thinkingSettings, modelRegistry, refineRouteRoles, 'editing'));
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
    let stagedMaterials=[],stagedSource;
    try {
      const preparedSource=await prepareRefineSource();stagedSource=preparedSource.material;
      stagedMaterials=await refinementMaterials.prepare();
      const maskFile = await refineMaskFile(refineMask);
      const refineInputs = hasRefineControls ? {version:1,...await refineReferences.prepare(maskFile),...(refineStructuredEnabled ? {structured:{...refineStructured}} : {})} : undefined;
      if (requestGeneration !== refineRequestGeneration.current) return;
      const scopedApiKeys = scopedApiKeysForRoles(activeModelRoutes, refineRouteRoles, apiKeys);
      const created = await refineImageRequest(apiBaseNormalized, health, {
        journalSelection,
        sourceContentType:refineSource.contentType,
        sourceTaskId:refineSource.sourceTaskId,
        visionMode,
        configurationMode: modelSubmission.configurationMode,
        provider: modelSubmission.provider,
        apiKeys: scopedApiKeys,
        modelRoutes: modelSubmission.modelRoutes,
        providerRegions: modelSubmission.providerRegions,
        thinkingConfig: modelSubmission.thinkingConfig,
        mainModelName: modelSubmission.mainModelName,
        imageModelName: modelSubmission.imageGenModelName,
        referenceVisionModelName: modelSubmission.referenceVisionModelName,
        ...refineRequestSource(preparedSource.source),
        refineInputs,
        materialFiles:stagedMaterials,
        editInstruction: refineInstruction,
        aspectRatio: refineAspectRatio,
        imageSize: refineImageSize,
      });
      if (requestGeneration !== refineRequestGeneration.current) return;
      void refinementMaterials.remember({id:created.id,status:created.status,materialFiles:stagedMaterials,taskSourceMaterial:stagedSource});
      stagedSource=null;
      stagedMaterials=[];
      setRefineJob({ id: created.id, status: created.status || 'queued', result_images: [] });
      setRefineJobId(created.id);
      if (currentUser) void loadUserJobs({ silent: true });
    } catch (refineRequestError) {
      await refinementMaterials.discard([...stagedMaterials,...(stagedSource?[stagedSource]:[])]);
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

  async function restoreSavedFigureInput(savedJob,{additionalMaterials=[],forcedFormat}={}) {
    const sequence=++figureRestoreState.current.sequence;
    const {ownerId,apiBase}=figureRestoreState.current;
    const isCurrent=()=>figureRestoreState.current.sequence===sequence && figureRestoreState.current.ownerId===ownerId && figureRestoreState.current.apiBase===apiBase;
    const restoredImages=[];
    try {
      const saved=restoreFigureTask(savedJob);
      const original={...savedJob,...savedJob.generationContext};
      const originalFiles=await generationMaterials.restore(savedJob);
      const restoredMaterials=[...originalFiles,...(original.sourceMaterials||[])];
      const legacyData={figureData:original.figureData,figurePanels:original.figurePanels};
      const restored=restoredMaterials.length?restoredMaterials:legacyData.figureData||legacyData.figurePanels?[await generationMaterials.store(new File([JSON.stringify(legacyData)],'历史任务数据.json',{type:'application/json'}))]:[];
      const materials=[...restored,...additionalMaterials];
      validateMaterialSet(materials);
      const savedImages=original.referenceImages||original.reference_images||[];
      if(savedImages.length>activeReferenceUpload.platform.maxCount)throw Error('历史任务图片超过当前上传上限，请下载所需图片后重新提供。');
      for(const savedImage of savedImages){
        if(!savedImage.url)throw Error('历史任务图片没有可用下载地址，请重新上传原文件。');
        const response=await fetch(savedImage.url,{credentials:'omit'});
        if(!response.ok)throw Error(`无法恢复图片 ${savedImage.filename}，请重新上传原文件。`);
        const blob=await response.blob(),mimeType=savedImage.mime_type||savedImage.mimeType||blob.type;
        if(!blob.size||blob.size>activeReferenceUpload.platform.maxBytes||!activeReferenceUpload.platform.mimeTypes.includes(mimeType))throw Error(`图片 ${savedImage.filename} 不符合当前上传限制，请重新上传。`);
        const file=new File([blob],savedImage.filename,{type:mimeType}),previewUrl=URL.createObjectURL(file);
        const restored={id:crypto.randomUUID(),file,filename:file.name,mimeType,size:file.size,previewUrl};
        restoredImages.push(restored);
        materials.push(await generationMaterials.store(file));
        Object.assign(restored,await readImageDimensions(previewUrl));validateRefineDimensions(restored,activeReferenceUpload.platform);
      }
      if(!isCurrent()){restoredImages.forEach(image=>URL.revokeObjectURL(image.previewUrl));return;}
      referenceImagesRef.current.forEach(image=>URL.revokeObjectURL(image.previewUrl));
      validateMaterialSet(materials);
      restoredImages.forEach(image=>URL.revokeObjectURL(image.previewUrl));
      setReferenceImages([]);
      clearInputOptimizationUndos();
      setJournalSelection(original.journalSelection??null);
      setInfographicCategory(saved.figureTypeId);
      setFigureDrafts(current=>({...current,[saved.figureTypeId]:saved.draft}));
      setSourceMaterials(materials);
      setRetrievalSetting(original.retrievalSetting||original.retrieval_setting||'none');
      setPipelineMode(normalizeGenerationPipeline(original.pipelineMode||original.pipeline_mode));
      setManualReferenceIds(original.manualReferenceIds||original.manual_reference_ids||[]);
      setMethodContent(saved.methodContent);setCaption(saved.caption);setNegativePrompt(saved.negativePrompt);
      setOutputFormat(forcedFormat||saved.outputFormat);if(saved.imageSize)setImageSize(saved.imageSize);if(saved.aspectRatio)setAspectRatio(saved.aspectRatio);
      setInputIsDirty(true);setError('');selectTab('generate');
    } catch(error) {restoredImages.forEach(image=>URL.revokeObjectURL(image.previewUrl));if(isCurrent()){setError(error.message);setErrorContext('input');}}
  }

  async function restoreSavedFigureRecord(id) {
    const sequence=++figureRestoreState.current.sequence;
    const ownerId=figureRestoreState.current.ownerId,apiBase=figureRestoreState.current.apiBase;
    const isCurrent=()=>figureRestoreState.current.sequence===sequence && figureRestoreState.current.ownerId===ownerId && figureRestoreState.current.apiBase===apiBase;
    const sourceRequest=captureRefineSelection();
    let ticket;
    try {
      const saved=await getJobRequest(apiBaseNormalized,health,id);
      if(!isCurrent()||!sourceRequest.isCurrent())return;
      if(saved.refine_mode){
        ticket=beginRefineSelection();
        const materials=await refinementMaterials.restore(saved);
        if(!isCurrent()||!ticket.isCurrent())return;
        const taskContext=refineTaskContext(saved);
        if(saved.taskSourceMaterial){if(!await restoreRefineOriginal(saved.taskSourceMaterial,taskContext,ticket))return;}
        else {const image=saved.result_images?.[0];if(!image)throw Error('这份任务没有可恢复的原图，请重新选择。');setRefineSource({...normalizeRefineSource(image.url,image),taskContext,journalSelection:taskContext.journalSelection,contentType:taskContext.contentType},ticket);}
        if(!isCurrent()||!ticket.isCurrent())return;
        await refinementMaterials.setMaterials(materials);
        if(!isCurrent()||!ticket.isCurrent())return;
        setRefineInstruction(saved.method_content||'');setRefineJob(saved);selectTab('refine');
      }else restoreSavedFigureInput(saved);
    } catch(error) {if(isCurrent()&&(ticket?ticket.isCurrent():sourceRequest.isCurrent()))setUserJobsError(error.message);}
  }

  async function showResumedTask(id) {
    const generation = refineRequestGeneration.current;
    const resumed = await getJobRequest(apiBaseNormalized, health, id);
    if (generation !== refineRequestGeneration.current) return;
    if (resumed.refine_mode) {
      setRefineJob(resumed);
      setRefineJobId(id);
      setRefinePollNonce(value => value + 1);
      selectTab('refine');
    } else {
      setCurrentJobId(id);
      setJob(resumed);
      setPollRetryNonce(value => value + 1);
      selectTab('generate');
    }
    await loadUserJobs({cancelledRef: () => generation !== refineRequestGeneration.current});
  }

  const renderThinkingSettings = role => <ThinkingSettings role={role} settings={thinkingSettings} registry={modelRegistry} operation={workspaceTab === 'refine' ? 'editing' : 'generation'} onChange={changeThinking} saveState={thinkingSaveState} onRetrySave={retryThinkingSave} />;

  const settingsDrawer = (
    <GenerationSettingsDrawer open={showGenerationSettings} onClose={closeGenerationSettings} focusSetting={generationFocusSetting}>
      {(workspaceTab === 'refine' ? refineWorkflowIssue : createWorkflowIssue) ? <p className="notice warning" role="status" data-focus-setting="workflow-preflight" tabIndex={-1}>{workspaceTab === 'refine' ? refineWorkflowIssue : createWorkflowIssue}</p> : null}
      <ModelRoutingSettings
        catalogControls={{states:providerCatalogs.states,onLoad:providerCatalogs.load,onInvalidate:providerCatalogs.invalidate,apiKeys,onApiKeyChange:handleApiKeyChange,providerRegions}}
        configurationMode={configurationMode}
        visionMode={visionMode}
        onVisionModeChange={setVisionMode}
        visionNotice={isAdvancedMode && !directBasicReference && visionMode === 'assist' && mainVisionStatus === 'supported' ? VISION_ASSIST_NOTICE : ''}
        renderThinkingSettings={renderThinkingSettings}
        universalSummaries={Object.fromEntries(Object.entries(universalDrafts).map(([role,draft]) => [role, [
          UNIVERSAL_PROTOCOL_OPTIONS.find(([id]) => id === draft.custom.protocol)?.[1] || draft.custom.protocol,
          universalDraftFeedback(draft,role).tone === 'success' ? '结构完整' : '待完善配置',
          universalKeys[role]?.apiKey?.trim() ? '密钥已填写 · 未验证' : '未填写密钥',
        ].join(' · ')]))}
        renderUniversalSettings={role => <UniversalApiSettings renderThinkingSettings={renderThinkingSettings} thinkingSettings={thinkingSettings} onImportThinking={changeThinking} savedStatus={configurationSaveStatus} onOpenLogin={()=>{setShowGenerationSettings(false);setShowAuthPanel(true)}} selectedRoles={[role]} compact canCopyMain={activeModelRoutes.main.accessProvider === 'custom'} drafts={universalDrafts} keys={universalKeys} apiBase={apiBaseNormalized} health={health} registryStatus={registryStatus} onRetryRegistry={retryModelRegistry} contractSupported={modelRegistry?.universalApiContractVersion >= 1}
          onChange={(role,patch)=>{const update=updateUniversalDraft(universalDrafts[role],patch);setUniversalDrafts(current=>({...current,[role]:update.draft}));if(update.clearKey)setUniversalKeys(current=>({...current,[role]:undefined}));}}
          onKeyChange={(role,key)=>setUniversalKeys(current=>({...current,[role]:bindUniversalKey(universalDrafts[role],key)}))}
          onCopy={(role,source,includeKey)=>{const result=copyUniversalConnection(universalDrafts[role],universalDrafts[source],universalKeys[source],includeKey);setUniversalDrafts(current=>({...current,[role]:result.draft}));if(includeKey||result.clearKey)setUniversalKeys(current=>({...current,[role]:result.copiedKey}));}}
          onSave={()=>saveUniversalDrafts(universalDrafts)}/> }
        onModeChange={handleConfigurationModeChange}
        simpleProvider={provider}
        onSimpleProviderChange={handleSimpleProviderChange}
        modelRoutes={activeModelRoutes}
        onRouteChange={handleModelRouteChange}
        modelRegistry={modelRegistry}
        registryStatus={registryStatus}
        onRetryRegistry={retryModelRegistry}
        providerConfigs={PROVIDERS}
        operation={workspaceTab === 'refine' ? 'editing' : 'generation'}
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
      {routingSaveFailed ? <p className="notice warning" role="status">{t(configurationSaveStatus)}</p> : null}

      <JournalRulePicker key={workspaceTab==='refine'?refineSource.identity:'generation'} value={journalSelection}
        onChange={workspaceTab==='refine'?value=>updateRefineSettings(refineSource.identity,{journalSelection:value}):setJournalSelection}
        figureTypeId={workspaceTab==='refine'?undefined:infographicCategory}
        refineContext={workspaceTab==='refine'?{...refineSource.taskContext,contentType:refineSource.contentType,hasSource:Boolean(refineSource.url)}:undefined}
        outputFormat={workspaceTab==='refine'?'png':outputFormat} saveFailed={workspaceTab==='refine'?false:journalSaveFailed}/>
      {workspaceTab !== 'refine' ? <FigureTypePicker value={infographicCategory} onChange={setInfographicCategory} /> : null}


      {workspaceTab === 'refine' ? (
        <div className="refine-settings-note" role="note">
          {t(refineResolutionOptions.length
            ? t('精修固定输出 PNG；清晰度（{size}）与目标比例（{ratio}）请在精修面板设置。', {size: refineImageSize, ratio: refineAspectRatio})
            : '精修固定输出 PNG；当前图像模型未声明可执行的精修清晰度，请更换模型。')}
        </div>
      ) : (<>
        <div className="output-format-field">
          <Select label={t("导出格式")} value={outputFormat} onChange={setOutputFormat} options={OUTPUT_FORMATS} />
          {outputFormat === 'svg'
            ? <div className="plot-note svg-output-note">主模型规划、编写和修改 SVG；程序负责渲染、检查与导出。</div>
            : <Select label={t("输出清晰度")} value={imageSize} onChange={setImageSize} options={resolutionOptions} />}
        </div>
        <AspectRatioPicker emptyMessage={t(registryReadinessMessage(registryStatus) || (activeModelRoutes.image.accessProvider === 'custom' ? !universalDrafts.image.modelId.trim() ? '配置图像模型后可选择画面比例。' : '确认图像模型的能力与尺寸映射后可选择画面比例。' : undefined))} label={t("画面比例")} value={aspectRatio} onChange={setAspectRatio} options={generationAspectRatioOptions} compact />

        <div className="settings-grid">
            <Select label={t("检索设置")}
              value={retrievalSetting}
              onChange={setRetrievalSetting}
              options={[
              ['none', '不使用检索'],
              ['auto', '自动检索'],
              ['random', '随机参考'],
              ['manual', '手动参考'],
            ]} />
            <FigureReferencePreferences mode={effectiveRetrievalSetting} draft={currentFigureDraft} onChange={draft=>setFigureDrafts(current=>({...current,[infographicCategory]:draft}))} />
              {effectiveRetrievalSetting === 'manual' ? (
                <div data-focus-setting="manual-reference" tabIndex={-1}>
                  <Suspense fallback={<div className="loading-card"><Loader2 className="spin" size={18} />{t("正在载入参考图库")}</div>}>
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
        </div>
          <WorkflowOptions value={pipelineMode} onChange={setPipelineMode} body={createWorkflowBody} />
        {!isAdvancedMode ? (
        <div className="default-summary" aria-label={t("默认生成配置")}>
          <span>{t(pipelineMode === 'full' ? '完整生成' : '快速生成')}</span>
          <span>{t(aspectRatio === 'auto' ? '自动比例' : aspectRatio)}</span>
          <span>{t(formatOutputFormat(outputFormat))}</span>
        </div>
        ) : (
        <>
          {CUSTOM_API_BASE_ENABLED ? (
            <label className="field">
              <span>{t("开发后端地址")}</span>
              <input value={apiBase} onChange={(event) => setApiBase(event.target.value)} placeholder={t("仅本地开发构建可修改")} />
            </label>
          ) : (
            <div className="service-boundary-note"><ShieldCheck size={16} />{t(hasCustomRoutes ? '请求经图研后端转发至你明确配置并通过安全校验的模型服务地址；密钥仅用于对应接入。' : '已锁定图研官方后端，API 密钥不会发送到用户指定的第三方地址。')}</div>
          )}

          <div className="settings-grid">
            <label className="field compact" data-focus-setting="candidate-count" tabIndex={-1}>
              <span>{t("候选图数量")}</span>
              <input type="number" aria-label={t("候选图数量")} min="1" max={WORKFLOW_LIMITS.maxCandidates} step="1" inputMode="numeric" value={numCandidates} onChange={(event) => setNumCandidates(event.target.value === '' ? '' : event.target.valueAsNumber)} />
              <small>{t("1–6 张；数量不代表并发数，更多候选会增加调用与等待。")}</small>
            </label>
            <label className="field compact" data-focus-setting="review-count" tabIndex={-1}>
              <span>{t("评审轮数")}</span>
              <input type="number" aria-label={t("评审轮数")} min="1" max={WORKFLOW_LIMITS.maxCriticRounds} step="1" inputMode="numeric" value={maxCriticRounds} onChange={(event) => setMaxCriticRounds(event.target.value === '' ? '' : event.target.valueAsNumber)} />
              <small>{t("最多 ")}{WORKFLOW_LIMITS.maxCriticRounds}{t(" 轮。每轮评审一次、必要时修改一次；通过即提前结束。最后一轮修改后结束，不自动追加复审。")}</small>
            </label>
          </div>

          {workflowSaveError ? <p role="status">{t('浏览器存储不可用，工作流设置仅保留在当前页面。')}</p> : null}

          {referenceImages.length ? (
            <div className="reference-mode-panel">
              <span>{t("参考图处理方式")}</span>
              <p>{t(visionMode === 'none' ? '主模型直读（视觉模型：无）' : '独立视觉模型分析')}</p>
              {referenceCapabilityNote ? <p>{referenceCapabilityNote}</p> : null}
            </div>
          ) : null}

          {health?.mock_enabled ? (
            <label className="mock-switch">
              <input type="checkbox" checked={mock} onChange={(event) => setMock(event.target.checked)} />
              <span>{t("模拟模式")}</span>
            </label>
          ) : null}

        </>
        )}
      </>)}
    </GenerationSettingsDrawer>
  );

  return (
    <main className={`app-shell${activeTab === 'account' ? ' account-view' : ''}`}>
      {LOCAL_CONSUMPTION_TEST && <section className="tokendance-panel" aria-label={t("本地消费测试")}><strong>{t("已连接正式图研账号服务 · 观猹 TokenDance 消费预览")}</strong><p>{t("使用你已有的图研账号登录，再连接观猹 TokenDance。生成、精修和优化输入会使用真实观猹 TokenDance 余额。")}</p><small>{t("本次预览的任务、图片和渠道授权保存在本机，线上历史记录可在")}<a href="https://www.paperbanana.asia/" target="_blank" rel="noreferrer">{t("正式图研")}</a>{t("查看。初始为 1 张候选图、0 轮评审。")}</small></section>}
      <WorkbenchHeader currentUser={currentUser} onGuide={() => selectTab('guide')} onAdmin={isAdmin ? () => selectTab('admin') : undefined} onContact={() => setShowContactDialog(true)} onFeedback={openFeedbackDialog}
        onMiniProgram={() => setShowMiniProgramDialog(true)} onAgentConnection={() => setShowAgentConnection(true)}
        onSignOut={handleSignOut} onSignIn={() => setShowAuthPanel(true)} onAccount={openAccount} />

      {activeTab !== 'account' && (tokenDance.notice || tokenDance.error) && <div className="service-alert" role="status">{tokenDance.error || tokenDance.notice}<button type="button" className="account-button" onClick={openAccount}>{t("查看账户")}</button></div>}
      {healthError ? (
        <div className="service-alert" role="status"><AlertTriangle size={16} />{t("后端连接异常：")}{formatErrorMessage(healthError)}</div>
      ) : null}
      {selectedCatalogIssues.length > 0 && <div className="notice warning" role="status">{t("已保留所选模型：")}{selectedCatalogIssues.join('；')} {t(hasCustomRoutes ? '输入内容保持不变，请打开完整设置补充或修正当前接入配置。' : '输入内容保持不变，可等待目录恢复或打开完整设置主动选择其他模型。')}</div>}
      {authSession.error ? (
        <div className="service-alert" role="status"><AlertTriangle size={16} />{t("登录状态检查失败：")}{formatErrorMessage(authSession.error.message || String(authSession.error))}</div>
      ) : null}

      {showAccountDialog && currentUser ? (
        <Suspense fallback={null}>
          <AccountSettingsDialog
            apiBase={apiBaseNormalized}
            productionPreview={LOCAL_CONSUMPTION_TEST}
            watcha={watcha} wechat={wechat} github={github} google={google}
            userId={currentUser.id}
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

      <MiniProgramDialog open={showMiniProgramDialog} onClose={() => setShowMiniProgramDialog(false)} />
      <AgentConnectionDialog open={showAgentConnection} onClose={() => setShowAgentConnection(false)} />

      <ContactDialog open={showContactDialog} onClose={() => setShowContactDialog(false)} />

      <PageNavigation activeId={activeTab} onSelect={selectTab} items={[
        ...WORKSPACE_TABS.filter(([tab]) => !compactLayout || !['account', 'guide'].includes(tab)).map(([id, label]) => ({ id, label })),
        ...(isAdmin && !compactLayout ? [{ id: 'admin', label: '站长' }] : []),
      ]} />

      {AUTH_REQUIRED && authSession.isPending ? (
        <section className="auth-panel">
          <Loader2 className="spin" size={24} />
          <p>{t("正在检查登录状态")}</p>
        </section>
      ) : AUTH_REQUIRED && !currentUser ? (
        <AuthPanel watcha={watcha} wechat={wechat} github={github} google={google} onAuthenticated={handleEmailAuthenticated} />
      ) : (
        <>
      {AUTH_UI_ENABLED && showAuthPanel && !currentUser ? (
        AUTH_ENABLED ? (
          <AuthPanel
            watcha={watcha} wechat={wechat} github={github} google={google}
            onAuthenticated={handleEmailAuthenticated}
            onCancel={() => setShowAuthPanel(false)}
          />
        ) : (
          <AuthUnavailablePanel onCancel={() => setShowAuthPanel(false)} />
        )
      ) : null}

      {['generate', 'refine'].includes(activeTab) && !(compactLayout && activeTab === 'generate') && Object.values(activeModelRoutes).some(route => route?.accessProvider === 'tokendance') && <TokenDanceStatus controller={tokenDance} onOpenAccount={openAccount} />}

      {activeTab === 'account' && (
        <AccountPage user={currentUser} controller={tokenDance} watcha={watcha} wechat={wechat} github={github} google={google} onReturn={returnFromAccount} returnLabel={t(accountReturn.current.tab === 'refine' ? '返回精修图片' : accountReturn.current.tab === 'records' ? '返回任务记录' : '返回工作台')} onManageAccount={() => setShowAccountDialog(true)} onSignOut={handleSignOut} onSignIn={() => setShowAuthPanel(true)} />
      )}
      <div style={{ display: activeTab === 'account' ? 'none' : 'contents' }} aria-hidden={activeTab === 'account' ? true : undefined}>
      {workspaceTab === 'generate' ? (
        <GenerationWorkspace
          compact={compactLayout}
          preserveResults={useSvgWorkspace(job, outputFormat)}
          jobId={currentJobId}
          template={<FeaturedTemplateStudio templates={featuredTemplates} isDirty={inputIsDirty} onApply={applyFeaturedTemplate} />}
          connection={AUTH_UI_ENABLED && Object.values(activeModelRoutes).some(route => route?.accessProvider === 'tokendance') ? <TokenDanceStatus controller={tokenDance} onOpenAccount={openAccount} /> : null}
          controls={<form className="generation-form" onSubmit={submitJob}>
          <section className="generation-settings-summary" role="region" aria-label={t("当前生成设置")}>
            <div className="generation-settings-summary-head">
              <div><span>{t("当前生成设置")}</span><strong>{t("路由与输出一眼确认")}</strong></div>
              <button type="button" className="generation-settings-trigger" onClick={() => { setGenerationFocusSetting(''); setShowGenerationSettings(true) }}><Settings2 size={18} /><span>{t("打开完整设置")}</span></button>
            </div>
            <GenerationSummaryDetails outputLabel={`${outputFormat === 'svg' ? 'SVG' : `${imageSize} · PNG`} · ${aspectRatio === 'auto' ? '自动比例' : aspectRatio}`}>
            <div className="generation-settings-facts">
              <div><span>{t("主模型")}</span><strong>{activeMainRegistryEntry?.label || activeMainModelName}</strong></div>
              {outputFormat!=='svg'?<div><span>{t("图像模型")}</span><strong>{activeImageRegistryEntry?.label || activeImageGenModelName}</strong></div>:null}
              <div><span>{t("视觉模型")}</span><strong>{visionMode === 'none' ? t(isAdvancedMode ? '无' : '由主模型理解图片') : activeVisionRegistryEntry?.label || activeReferenceVisionModelName}</strong></div>
              <div><span>{t("画面比例")}</span><strong>{t(aspectRatio === 'auto' ? '自动' : aspectRatio)}</strong></div>
              <div><span>{t("输出")}</span><strong>{outputFormat === 'svg' ? 'SVG' : `${imageSize} · PNG`}</strong></div>
            </div>
            </GenerationSummaryDetails>
            <button className="primary-button" type="submit" disabled={isSubmitting || isUploadingReferences || isInspectingReferences || generationMaterials.busy}>
              {isSubmitting ? <Loader2 className="spin" size={18} /> : <Send size={18} />}{t(isInspectingReferences ? '检查参考图' : isUploadingReferences ? '上传参考图' : '生成候选图')}
            </button>
          </section>

          {error ? (
            <div className="error-line" role="alert">
              <AlertTriangle size={16} /> {formatErrorMessage(error, errorContext)}
              {errorContext === 'poll-stopped' ? (
                <button type="button" className="inline-retry" onClick={() => setPollRetryNonce((value) => value + 1)}>{t("重新刷新")}</button>
              ) : null}
            </div>
          ) : null}
        </form>}
          input={<GenerationInputPanel
            compact={compactLayout}
            hasSupplement={Boolean(negativePrompt)}
            supplementError={Boolean(referenceSelectionIssue || referenceUploadError)}
            heading={<div className="section-head">
              <FileText size={20} />
              <div>
                <h2>{t("输入内容")}</h2>
                <p>{t("在生成设置中选择图型，再提供研究内容、必要数据和目标图注。")}</p>
              </div>
            </div>}
            category={<>
              {figureSaveFailed ? <p className="notice warning" role="status">草稿未写入浏览器，存储空间不足或访问受限；当前输入仍保留在本页，刷新前请另行保存。</p> : null}

            </>}
            reference={<MaterialUploadPanel {...generationMaterials.panel} disabled={isSubmitting || generationMaterials.busy} />}
            guidance={<>{inputOptimizationGuidance ? (
              <div className="input-optimization-guidance" role="alert"><AlertTriangle size={16} />{inputOptimizationGuidance}</div>
            ) : null}</>}
            fields={<div className="two-col input-copy">
              <div className="field">
                <div className="input-field-head">
                  <label htmlFor="method-content">{t("论文方法内容")}</label>
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
                <small>{methodContent.length.toLocaleString()} / {INPUT_LIMITS.methodContent.toLocaleString()}{t(" 字符")}</small>
              </div>

              <div className="field">
                <div className="input-field-head">
                  <label htmlFor="target-caption">{t("目标图注")}</label>
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
                <small>{caption.length.toLocaleString()} / {INPUT_LIMITS.caption.toLocaleString()}{t(" 字符")}</small>
              </div>
            </div>}
            extras={<div className="field negative-prompt-field">
              <div className="input-field-head">
                <label htmlFor="negative-prompt">{t("负向提示词（可选）")}</label>
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
              <textarea id="negative-prompt" value={negativePrompt} onChange={(event) => handleInputValueChange('negativePrompt', event.target.value)} rows={4} maxLength={INPUT_LIMITS.negativePrompt} placeholder={t("例如：避免文字拥挤、模糊箭头、装饰性背景。")} />
              <small>{negativePrompt.length.toLocaleString()} / {INPUT_LIMITS.negativePrompt.toLocaleString()}{t(" 字符")}</small>
            </div>}
          />}
          results={<div className="results-col">
            <div className="section-head results-head">
              <ImageIcon size={20} />
              <div>
                <h2>{t("生成结果")}</h2>
                <p>{t(currentJobId ? `任务编号 ${currentJobId}` : '提交任务后显示生成结果。')}</p>
              </div>
            </div>
            <TokenDanceRecovery customKeys={Object.values(universalKeys).some(x=>x?.apiKey) ? customEnvelope : undefined} job={job} onBeforeResume={generationMaterials.beforeResume} controller={tokenDance} onOpenAccount={openAccount} onResumed={showResumedTask} />
            {useSvgWorkspace(job, outputFormat) ? <>
              <SvgResultWorkspace job={job} apiBase={apiBaseNormalized} owner={currentUser?.id} aspectRatio={aspectRatio} isSubmitting={isSubmitting} onUseForRefine={useResultForRefine} onOpenTask={saved=>{setJob(saved);latestJobRef.current=saved;setCurrentJobId(saved.id);}} />
              {job && <details className="svg-original-task-record"><summary>原始任务与评审记录（不适用于手工稿）</summary>
                <JobStatus job={job} onRestoreInput={restoreSavedFigureInput} apiBase={apiBaseNormalized} />
              </details>}
            </> : <JobStatus job={job} onRestoreInput={restoreSavedFigureInput} apiBase={apiBaseNormalized} onUseForRefine={useResultForRefine} />}
          </div>}
        />
      ) : workspaceTab === 'refine' ? (
        <Suspense fallback={<div className="loading-card"><Loader2 className="spin" size={18} />{t("正在载入精修工具")}</div>}>
          <TokenDanceRecovery customKeys={Object.values(universalKeys).some(x=>x?.apiKey) ? customEnvelope : undefined} job={refineJob} onBeforeResume={refinementMaterials.beforeResume} controller={tokenDance} onOpenAccount={openAccount} onResumed={showResumedTask} />
          <RefinePanel
            materialPanel={<MaterialUploadPanel {...refinementMaterials.panel} disabled={refineRunning || refinementMaterials.busy} />}
            controls={refineControls} references={refineReferences} referencePolicy={refineReferencePolicy} controlsIssue={refineControlsIssue}
            mask={refineMask} onMaskChange={setRefineMask} structuredEnabled={refineStructuredEnabled} onStructuredEnabledChange={setRefineStructuredEnabled} structured={refineStructured} onStructuredChange={setRefineStructured}
            source={refineSource}
            sourceContext={<RefineSourceContext source={refineSource} onChange={changeRefineContent} disabled={refineRunning}/>}
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
        isAdmin && currentUser ? <Suspense fallback={<p role="status">{t("正在加载站长后台…")}</p>}><AdminWorkspace key={currentUser?.id} apiBase={apiBaseNormalized} health={health} /><TokenDancePricing apiBase={apiBaseNormalized} /></Suspense>
          : <section className="card"><h2>{t("站长运营后台")}</h2><p role="status">{t(authSession.isPending ? '正在确认登录状态…' : '需要已登录的站长账号才能访问，后台接口会再次校验权限。')}</p>{!currentUser && <button onClick={() => setShowAuthPanel(true)}>{t("登录账号")}</button>}</section>
      ) : workspaceTab === 'guide' ? (
        <GuidePanel
          onStart={() => selectTab('generate')}
          onContact={() => setShowContactDialog(true)}
          registryVersion={modelRegistry?.registryVersion || '等待服务端目录'}
          providerLabels={orderModelChannels(Object.keys(modelRegistry?.providers || {})).map((id) => PROVIDERS[id]?.label || id)}
          routeSummary={{
            main: activeMainRegistryEntry?.label || activeMainModelName,
            image: activeImageRegistryEntry?.label || activeImageGenModelName,
            vision: visionMode === 'none' ? t(isAdvancedMode ? '无' : '由主模型理解图片') : activeVisionRegistryEntry?.label || activeReferenceVisionModelName,
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
          onOpenTask={showResumedTask}
          onUseForRefine={useResultForRefine}
          renderRecovery={item => <><button type="button" onClick={()=>restoreSavedFigureRecord(item.id)}>恢复图型与完整输入</button><TokenDanceRecovery customKeys={Object.values(universalKeys).some(x=>x?.apiKey) ? customEnvelope : undefined} job={item} onBeforeResume={async()=>generationMaterials.beforeResume(await getJobRequest(apiBaseNormalized,health,item.id))} controller={tokenDance} onOpenAccount={openAccount} onResumed={showResumedTask} /></>}
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
  if (missingCredentialProviders.length) return { setting: 'api-key', message: `请填写${missingCredentialProviders.map((item) => (item === 'custom' ? '通用 API' : PROVIDERS[item]?.label || item)).join('、')}接入密钥。` };
  const invalidRoute = firstInvalidRequiredRoute({
    roles: requiredRouteRoles,
    entries: { main: mainEntry, image: imageEntry, vision: visionEntry },
    outputFormat,
  });
  if (invalidRoute) return invalidRoute;
  if (retrievalSetting === 'manual' && !manualReferenceIds.length) return { setting: 'manual-reference', message: '手动参考模式至少需要选用一个案例。' };
  if (needsReferenceVisionModel && !visionEntry) return { setting: 'vision-model', message: '请选择视觉模型。' };
  if (mainModelDirectUnsupported) return { setting: 'main-model', message: '当前主模型不能直接读取参考图，请更换模型或处理方式。' };
  return null;
}
