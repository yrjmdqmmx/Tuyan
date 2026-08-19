import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  StatusBar as NativeStatusBar,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import {
  AlertTriangle,
  FileText,
  Image as ImageIcon,
  KeyRound,
  Loader2,
  LogIn,
  RefreshCw,
  Send,
  Settings2,
  ShieldCheck,
  Sparkles,
  UserRound,
  X,
} from 'lucide-react-native';

import {
  createJobRequest,
  fetchBackendHealth,
  formatDate,
  formatErrorMessage,
  getJobRequest,
  getSession,
  normalizeApiBase,
  resolveImageUrl,
  signInEmail,
  signOut,
  signUpEmail,
  userJobsRequest,
} from './src/api';
import {
  API_BASE_DEFAULT,
  ASPECT_RATIO_OPTIONS,
  CANDIDATE_OPTIONS,
  CRITIC_ROUND_OPTIONS,
  INFOGRAPHIC_CATEGORIES,
  PIPELINE_OPTIONS,
  PROVIDER_ORDER,
  PROVIDERS,
  QUICK_START_EXAMPLES,
  RETRIEVAL_OPTIONS,
  STATUS_LABELS,
} from './src/constants';
import type { AuthMode, ConfigurationMode, CurrentUser, HealthInfo, Job, ModelOption, ProviderId, QuickStartExample } from './src/types';
import { formatClientPlatform } from './src/client-platform';

const EMPTY_KEYS: Record<ProviderId, string> = {
  bailian: '',
  openrouter: '',
  gemini: '',
  openai: '',
};

const DEFAULT_CATEGORY = INFOGRAPHIC_CATEGORIES[0]!;
const DEFAULT_PROVIDER = PROVIDERS.bailian;
const WARM_PRIMARY = '#6f4b3d';
const WARM_PRIMARY_DARK = '#51382f';
const WARM_PRIMARY_SOFT = '#f3ebe3';
const WARM_PRIMARY_BORDER = '#d9c7b7';
const WARM_ACCENT = '#c66b4f';

type TabId = 'generate' | 'records';

export default function App() {
  const [activeTab, setActiveTab] = useState<TabId>('generate');
  const [apiBase, setApiBase] = useState(API_BASE_DEFAULT);
  const [health, setHealth] = useState<HealthInfo | null>(null);
  const [healthError, setHealthError] = useState('');
  const [healthLoading, setHealthLoading] = useState(false);

  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [sessionPending, setSessionPending] = useState(true);
  const [showAuthPanel, setShowAuthPanel] = useState(false);
  const [authMode, setAuthMode] = useState<AuthMode>('sign-in');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authName, setAuthName] = useState('');
  const [authError, setAuthError] = useState('');
  const [authSubmitting, setAuthSubmitting] = useState(false);

  const [configurationMode, setConfigurationMode] = useState<ConfigurationMode>('simple');
  const [provider, setProvider] = useState<ProviderId>('bailian');
  const [apiKeys, setApiKeys] = useState<Record<ProviderId, string>>(EMPTY_KEYS);
  const [methodContent, setMethodContent] = useState(QUICK_START_EXAMPLES[0]?.methodContent || '');
  const [caption, setCaption] = useState(QUICK_START_EXAMPLES[0]?.caption || '');
  const [infographicCategory, setInfographicCategory] = useState<string>(DEFAULT_CATEGORY[0]);
  const [mainModelName, setMainModelName] = useState(DEFAULT_PROVIDER.mainModel);
  const [imageGenModelName, setImageGenModelName] = useState(DEFAULT_PROVIDER.imageModel);
  const [pipelineMode, setPipelineMode] = useState('demo_planner_critic');
  const [retrievalSetting, setRetrievalSetting] = useState('none');
  const [aspectRatio, setAspectRatio] = useState('16:9');
  const [numCandidates, setNumCandidates] = useState('1');
  const [maxCriticRounds, setMaxCriticRounds] = useState('1');
  const [mock, setMock] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [currentJobId, setCurrentJobId] = useState('');
  const [job, setJob] = useState<Job | null>(null);

  const [userJobs, setUserJobs] = useState<Job[]>([]);
  const [userJobsLoading, setUserJobsLoading] = useState(false);
  const [userJobsError, setUserJobsError] = useState('');

  const [previewUrl, setPreviewUrl] = useState('');

  const apiBaseNormalized = normalizeApiBase(apiBase);
  const providerConfig = PROVIDERS[provider] || DEFAULT_PROVIDER;
  const selectedKey = apiKeys[providerConfig.keyName] || '';
  const selectedCategory = INFOGRAPHIC_CATEGORIES.find((item) => item[0] === infographicCategory) || DEFAULT_CATEGORY;
  const isAdvancedMode = configurationMode === 'advanced';
  const mockEnabled = Boolean(health?.mock_enabled || health?.laf?.mock_enabled);
  const defaultMainModelLabel = findModelLabel(providerConfig.mainModels, providerConfig.mainModel);
  const defaultImageModelLabel = findModelLabel(providerConfig.imageModels, providerConfig.imageModel);

  const canSubmit = useMemo(() => {
    const canMock = isAdvancedMode && mock && mockEnabled;
    return Boolean(
      !isSubmitting &&
        methodContent.trim().length >= 20 &&
        caption.trim().length >= 3 &&
        (selectedKey.trim() || canMock),
    );
  }, [caption, isAdvancedMode, isSubmitting, methodContent, mock, mockEnabled, selectedKey]);

  useEffect(() => {
    void refreshHealth();
  }, [apiBaseNormalized]);

  useEffect(() => {
    void refreshSession();
  }, [apiBaseNormalized]);

  useEffect(() => {
    if (!currentUser) return;
    void loadUserJobs(true);
  }, [apiBaseNormalized, currentUser?.id, health?.backendMode]);

  useEffect(() => {
    if (!currentJobId) return undefined;
    let cancelled = false;
    const load = async () => {
      try {
        const nextJob = await getJobRequest(apiBaseNormalized, health, currentJobId);
        if (!cancelled) setJob(nextJob);
      } catch (error) {
        if (!cancelled) setSubmitError(formatErrorMessage(error));
      }
    };
    void load();
    const timer = setInterval(load, 3000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [apiBaseNormalized, currentJobId, health?.backendMode]);

  function updateProvider(nextProvider: ProviderId) {
    const nextConfig = PROVIDERS[nextProvider] || DEFAULT_PROVIDER;
    setProvider(nextProvider);
    setMainModelName(nextConfig.mainModel);
    setImageGenModelName(nextConfig.imageModel);
  }

  async function refreshHealth() {
    setHealthLoading(true);
    setHealthError('');
    try {
      const data = await fetchBackendHealth(apiBaseNormalized);
      setHealth(data);
    } catch (error) {
      setHealth(null);
      setHealthError(formatErrorMessage(error));
    } finally {
      setHealthLoading(false);
    }
  }

  async function refreshSession() {
    setSessionPending(true);
    try {
      const user = await getSession(apiBaseNormalized);
      setCurrentUser(user);
    } finally {
      setSessionPending(false);
    }
  }

  async function submitAuth() {
    if (!authEmail.trim() || authPassword.length < 8 || authSubmitting) return;
    setAuthSubmitting(true);
    setAuthError('');
    try {
      if (authMode === 'sign-up') {
        const displayName = (authName.trim() || authEmail.trim().split('@')[0] || 'PaperBanana 用户').slice(0, 24);
        await signUpEmail(apiBaseNormalized, authEmail.trim(), authPassword, displayName);
      } else {
        await signInEmail(apiBaseNormalized, authEmail.trim(), authPassword);
      }
      const user = await getSession(apiBaseNormalized);
      setCurrentUser(user);
      setShowAuthPanel(false);
      setAuthPassword('');
      setActiveTab('records');
      if (user) await loadUserJobs(false);
    } catch (error) {
      setAuthError(formatErrorMessage(error));
    } finally {
      setAuthSubmitting(false);
    }
  }

  async function handleSignOut() {
    await signOut(apiBaseNormalized);
    setCurrentUser(null);
    setUserJobs([]);
    setShowAuthPanel(false);
  }

  async function submitJob() {
    if (!canSubmit || isSubmitting) return;
    setIsSubmitting(true);
    setSubmitError('');
    setJob(null);
    try {
      const scopedApiKeys = {
        ...EMPTY_KEYS,
        [providerConfig.keyName]: selectedKey.trim(),
      };
      const created = await createJobRequest(apiBaseNormalized, health, {
        configurationMode,
        provider,
        apiKeys: scopedApiKeys,
        taskName: 'diagram',
        methodContent: methodContent.trim(),
        caption: caption.trim(),
        infographicCategory: selectedCategory[1],
        mainModelName: isAdvancedMode ? mainModelName.trim() : providerConfig.mainModel,
        imageGenModelName: isAdvancedMode ? imageGenModelName.trim() : providerConfig.imageModel,
        pipelineMode: isAdvancedMode ? pipelineMode : 'demo_planner_critic',
        retrievalSetting: isAdvancedMode ? retrievalSetting : 'none',
        aspectRatio: isAdvancedMode ? aspectRatio : '16:9',
        numCandidates: isAdvancedMode ? clampNumber(numCandidates, 1, 4, 1) : 1,
        maxCriticRounds: isAdvancedMode ? clampNumber(maxCriticRounds, 0, 3, 1) : 1,
        mock: isAdvancedMode ? mock : false,
      });
      if (!created.id) throw new Error('后端没有返回任务 ID');
      setCurrentJobId(created.id);
      setJob({
        id: created.id,
        status: created.status,
        provider,
        client_platform: 'android',
        user_id: currentUser?.id || '',
        user_email: currentUser?.email || '',
        configuration_mode: configurationMode,
        method_content: methodContent.trim(),
        caption: caption.trim(),
        infographic_category: selectedCategory[1],
        main_model_name: isAdvancedMode ? mainModelName.trim() : providerConfig.mainModel,
        image_gen_model_name: isAdvancedMode ? imageGenModelName.trim() : providerConfig.imageModel,
        pipeline_mode: isAdvancedMode ? pipelineMode : 'demo_planner_critic',
        aspect_ratio: isAdvancedMode ? aspectRatio : '16:9',
        num_candidates: isAdvancedMode ? clampNumber(numCandidates, 1, 4, 1) : 1,
        max_critic_rounds: isAdvancedMode ? clampNumber(maxCriticRounds, 0, 3, 1) : 1,
        prompt_char_count: 0,
        result_image_count: 0,
        result_images: [],
        logs_tail: '',
        error: '',
      });
      if (currentUser) void loadUserJobs(true);
    } catch (error) {
      setSubmitError(formatErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function loadUserJobs(silent: boolean) {
    if (!currentUser) return;
    if (!silent) {
      setUserJobsLoading(true);
      setUserJobsError('');
    }
    try {
      const data = await userJobsRequest(apiBaseNormalized, health);
      setUserJobs(data.jobs || []);
    } catch (error) {
      setUserJobsError(formatErrorMessage(error));
    } finally {
      setUserJobsLoading(false);
    }
  }

  function applyQuickStartExample(example: QuickStartExample) {
    setMethodContent(example.methodContent);
    setCaption(example.caption);
    setInfographicCategory(example.category);
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" backgroundColor="#fffaf0" translucent={false} />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={0}>
        <View style={styles.header}>
          <View style={styles.brandRow}>
            <Image source={require('./assets/icon.png')} resizeMode="contain" style={styles.logo} />
            <View style={styles.brandText}>
              <Text style={styles.title}>PaperBanana 工作台</Text>
              <Text style={styles.subtitle}>多智能体学术图示生成</Text>
            </View>
          </View>
          {currentUser ? (
            <Pressable style={styles.accountPill} onPress={handleSignOut}>
              <ShieldCheck size={15} color={WARM_PRIMARY} />
              <Text style={styles.accountText} numberOfLines={1}>
                {currentUser.email}
              </Text>
            </Pressable>
          ) : (
            <Pressable style={styles.loginPill} onPress={() => setShowAuthPanel(true)}>
              <LogIn size={15} color="#1b1a16" />
              <Text style={styles.loginText}>登录</Text>
            </Pressable>
          )}
        </View>

        <View style={styles.tabs}>
          <TabButton label="生成" active={activeTab === 'generate'} onPress={() => setActiveTab('generate')} />
          <TabButton label="记录" active={activeTab === 'records'} onPress={() => setActiveTab('records')} />
        </View>

        <ScrollView style={styles.scroll} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
          {activeTab === 'generate' ? renderGenerate() : null}
          {activeTab === 'records' ? renderRecords() : null}
        </ScrollView>
      </KeyboardAvoidingView>

      <AuthModal
        visible={showAuthPanel}
        mode={authMode}
        email={authEmail}
        password={authPassword}
        name={authName}
        error={authError}
        submitting={authSubmitting}
        onClose={() => setShowAuthPanel(false)}
        onModeChange={setAuthMode}
        onEmailChange={setAuthEmail}
        onPasswordChange={setAuthPassword}
        onNameChange={setAuthName}
        onSubmit={submitAuth}
      />

      <Modal visible={Boolean(previewUrl)} transparent animationType="fade" onRequestClose={() => setPreviewUrl('')}>
        <View style={styles.previewBackdrop}>
          <Pressable style={styles.previewClose} onPress={() => setPreviewUrl('')}>
            <X size={22} color="#fff" />
          </Pressable>
          {previewUrl ? <Image source={{ uri: previewUrl }} resizeMode="contain" style={styles.previewImage} /> : null}
        </View>
      </Modal>
    </SafeAreaView>
  );

  function renderGenerate() {
    return (
      <>
        <HealthBanner loading={healthLoading} health={health} error={healthError} onRefresh={refreshHealth} />

        <SectionHeader icon={<Settings2 size={19} color={WARM_PRIMARY} />} title="生成设置" note={isAdvancedMode ? '模型、流程和渲染参数全部开放。' : '选择模型平台并填写当前平台 API Key。'} />

        <View style={styles.modeSwitch}>
          <ModeButton active={!isAdvancedMode} title="普通模式" subtitle="平台 + Key" icon={<Sparkles size={16} color={!isAdvancedMode ? '#fff' : WARM_PRIMARY} />} onPress={() => setConfigurationMode('simple')} />
          <ModeButton active={isAdvancedMode} title="专业模式" subtitle="模型与流程" icon={<Settings2 size={16} color={isAdvancedMode ? '#fff' : WARM_PRIMARY} />} onPress={() => setConfigurationMode('advanced')} />
        </View>

        <Text style={styles.fieldLabel}>模型平台</Text>
        <View style={styles.providerGrid}>
          {PROVIDER_ORDER.map((id) => (
            <Chip key={id} label={PROVIDERS[id].label} active={provider === id} onPress={() => updateProvider(id)} />
          ))}
        </View>

        <View style={styles.panel}>
          <View style={styles.panelTitleRow}>
            <KeyRound size={17} color={WARM_PRIMARY} />
            <Text style={styles.panelTitle}>{providerConfig.label} API 密钥</Text>
          </View>
          <TextInput
            style={styles.input}
            value={selectedKey}
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
            placeholder={providerConfig.keyPlaceholder}
            placeholderTextColor="#9b9488"
            onChangeText={(value) => setApiKeys((prev) => ({ ...prev, [providerConfig.keyName]: value }))}
          />
          <Pressable onPress={() => Linking.openURL(providerConfig.guideUrl)} style={styles.guideLink}>
            <Text style={styles.guideLinkText}>打开申请页面</Text>
          </Pressable>
          <Text style={styles.guideStep} numberOfLines={2}>
            {providerConfig.guideSteps[0]} 密钥只保存在本机，用于向 Sealos 后端提交本次生成任务。
          </Text>
        </View>

        {!isAdvancedMode ? (
          <View style={styles.summaryRow}>
            <SummaryPill label={defaultMainModelLabel} />
            <SummaryPill label={defaultImageModelLabel} />
            <SummaryPill label="规划器 + 评审器" />
            <SummaryPill label="16:9" />
          </View>
        ) : (
          <View style={styles.advancedBlock}>
            <LabeledInput label="后端地址" value={apiBase} onChangeText={setApiBase} autoCapitalize="none" />
            <OptionGroup title="生成流程" value={pipelineMode} options={PIPELINE_OPTIONS} onChange={setPipelineMode} />
            <OptionGroup title="检索设置" value={retrievalSetting} options={RETRIEVAL_OPTIONS} onChange={setRetrievalSetting} />
            <OptionGroup title="画面比例" value={aspectRatio} options={ASPECT_RATIO_OPTIONS} onChange={setAspectRatio} />
            <OptionGroup title="候选图数量" value={numCandidates} options={CANDIDATE_OPTIONS} onChange={setNumCandidates} />
            <OptionGroup title="评审轮数" value={maxCriticRounds} options={CRITIC_ROUND_OPTIONS} onChange={setMaxCriticRounds} />
            <ModelSelector title="主模型" value={mainModelName} options={providerConfig.mainModels} onChange={setMainModelName} />
            <ModelSelector title="图像生成模型" value={imageGenModelName} options={providerConfig.imageModels} onChange={setImageGenModelName} />
            {mockEnabled ? (
              <View style={styles.switchRow}>
                <Text style={styles.switchText}>模拟模式</Text>
                <Switch value={mock} onValueChange={setMock} thumbColor={mock ? WARM_PRIMARY : '#f4f0e8'} trackColor={{ false: '#d7d1c5', true: '#d8b39f' }} />
              </View>
            ) : null}
          </View>
        )}

        <SectionHeader icon={<FileText size={19} color={WARM_PRIMARY} />} title="输入内容" note="选择信息图类别，再粘贴论文方法部分和目标图注。" />

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.exampleRow}>
          {QUICK_START_EXAMPLES.map((example) => (
            <Pressable key={example.id} style={styles.exampleCard} onPress={() => applyQuickStartExample(example)}>
              <Text style={styles.exampleLabel}>{example.label}</Text>
              <Text style={styles.exampleTitle}>{example.title}</Text>
              <Text style={styles.exampleCaption} numberOfLines={2}>
                {example.caption}
              </Text>
              <Text style={styles.exampleHint} numberOfLines={2}>
                {example.hint}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        <OptionGroup title="信息图类别" value={infographicCategory} options={INFOGRAPHIC_CATEGORIES.map((item) => [item[0], item[1]] as const)} onChange={setInfographicCategory} />
        <Text style={styles.categoryNote}>{selectedCategory[2]}</Text>

        <LabeledInput label="论文方法内容" value={methodContent} onChangeText={setMethodContent} multiline minHeight={142} />
        <LabeledInput label="目标图注" value={caption} onChangeText={setCaption} multiline minHeight={92} />

        <Pressable style={[styles.primaryButton, !canSubmit && styles.disabledButton]} disabled={!canSubmit} onPress={submitJob}>
          {isSubmitting ? <ActivityIndicator color="#fff" /> : <Send size={18} color="#fff" />}
          <Text style={styles.primaryButtonText}>{isSubmitting ? '提交中' : '生成候选图'}</Text>
        </Pressable>
        {submitError ? <ErrorLine text={submitError} /> : null}

        <SectionHeader icon={<ImageIcon size={19} color={WARM_PRIMARY} />} title="生成结果" note={currentJobId ? `任务编号 ${currentJobId}` : '提交任务后显示生成结果。'} />
        <JobDetail job={job} apiBase={apiBaseNormalized} onPreview={setPreviewUrl} />
      </>
    );
  }

  function renderRecords() {
    if (sessionPending) {
      return <StatePanel icon={<Loader2 size={20} color={WARM_PRIMARY} />} title="正在检查登录状态" note="请稍候。" />;
    }
    if (!currentUser) {
      return (
        <StatePanel
          icon={<UserRound size={20} color={WARM_PRIMARY} />}
          title="任务记录需要登录后使用"
          note="不登录也可以正常生成候选图；登录后，新提交的任务会保存到账号记录。"
          actionLabel="登录 / 注册"
          onAction={() => setShowAuthPanel(true)}
        />
      );
    }
    return (
      <>
        <SectionHeader icon={<FileText size={19} color={WARM_PRIMARY} />} title="我的任务记录" note={currentUser.email} />
        <Pressable style={styles.secondaryButton} onPress={() => loadUserJobs(false)}>
          {userJobsLoading ? <ActivityIndicator color={WARM_PRIMARY} /> : <RefreshCw size={17} color={WARM_PRIMARY} />}
          <Text style={styles.secondaryButtonText}>刷新任务记录</Text>
        </Pressable>
        {userJobsError ? <ErrorLine text={userJobsError} /> : null}
        <JobList jobs={userJobs} apiBase={apiBaseNormalized} emptyText="暂无任务记录" onPreview={setPreviewUrl} />
      </>
    );
  }

}

function TabButton({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable style={[styles.tabButton, active && styles.tabButtonActive]} onPress={onPress}>
      <Text style={[styles.tabText, active && styles.tabTextActive]}>{label}</Text>
    </Pressable>
  );
}

function ModeButton({ active, title, subtitle, icon, onPress }: { active: boolean; title: string; subtitle: string; icon: React.ReactNode; onPress: () => void }) {
  return (
    <Pressable style={[styles.modeButton, active && styles.modeButtonActive]} onPress={onPress}>
      {icon}
      <View style={styles.modeCopy}>
        <Text style={[styles.modeTitle, active && styles.modeTitleActive]}>{title}</Text>
        <Text style={[styles.modeSubtitle, active && styles.modeSubtitleActive]}>{subtitle}</Text>
      </View>
    </Pressable>
  );
}

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable style={[styles.chip, active && styles.chipActive]} onPress={onPress}>
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </Pressable>
  );
}

function SectionHeader({ icon, title, note }: { icon: React.ReactNode; title: string; note: string }) {
  return (
    <View style={styles.sectionHeader}>
      {icon}
      <View style={styles.sectionCopy}>
        <Text style={styles.sectionTitle}>{title}</Text>
        <Text style={styles.sectionNote}>{note}</Text>
      </View>
    </View>
  );
}

function HealthBanner({ loading, health, error, onRefresh }: { loading: boolean; health: HealthInfo | null; error: string; onRefresh: () => void }) {
  const ok = Boolean(health);
  const checking = loading && !health;
  const failed = Boolean(error && !health);
  return (
    <View style={[styles.healthBanner, ok || checking ? styles.healthOk : styles.healthWarn]}>
      <View style={styles.healthTextBlock}>
        <Text style={styles.healthTitle}>{ok ? `后端可用 · ${health?.backendMode || 'auto'}` : checking ? '正在连接后端' : '后端连接失败'}</Text>
        <Text style={styles.healthNote}>
          {ok
            ? 'Sealos gateway / Laf 云函数已确认，生成和任务记录会走当前地址。'
            : checking
              ? '正在检测 Sealos gateway 和 Laf 云函数。'
              : failed
                ? error
                : '还没有拿到后端确认结果。'}
        </Text>
      </View>
      <Pressable style={styles.refreshIconButton} onPress={onRefresh}>
        {loading ? <ActivityIndicator color={WARM_PRIMARY} /> : <RefreshCw size={18} color={WARM_PRIMARY} />}
      </Pressable>
    </View>
  );
}

function LabeledInput({
  label,
  value,
  onChangeText,
  multiline,
  minHeight,
  compact,
  secureTextEntry,
  autoCapitalize,
  keyboardType,
  maxLength,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  multiline?: boolean;
  minHeight?: number;
  compact?: boolean;
  secureTextEntry?: boolean;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  keyboardType?: 'default' | 'number-pad';
  maxLength?: number;
}) {
  return (
    <View style={[styles.field, compact && styles.compactField]}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        style={[styles.input, multiline && styles.textarea, minHeight ? { minHeight } : null]}
        value={value}
        onChangeText={onChangeText}
        multiline={multiline}
        textAlignVertical={multiline ? 'top' : 'center'}
        secureTextEntry={secureTextEntry}
        autoCapitalize={autoCapitalize}
        keyboardType={keyboardType}
        maxLength={maxLength}
        placeholderTextColor="#9b9488"
        autoCorrect={false}
      />
    </View>
  );
}

function OptionGroup<T extends string>({
  title,
  value,
  options,
  onChange,
}: {
  title: string;
  value: T | string;
  options: ReadonlyArray<readonly [string, string]>;
  onChange: (value: T) => void;
}) {
  return (
    <View style={styles.optionGroup}>
      <Text style={styles.fieldLabel}>{title}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.optionRow}>
        {options.map(([id, label]) => (
          <Chip key={id} label={label} active={value === id} onPress={() => onChange(id as T)} />
        ))}
      </ScrollView>
    </View>
  );
}

function ModelSelector({
  title,
  value,
  options,
  onChange,
}: {
  title: string;
  value: string;
  options: readonly ModelOption[];
  onChange: (value: string) => void;
}) {
  const groups = groupModelOptions(options);
  return (
    <View style={styles.modelSelector}>
      <Text style={styles.fieldLabel}>{title}</Text>
      {groups.map((group) => (
        <View style={styles.modelGroup} key={`${title}-${group.name}`}>
          <Text style={styles.modelGroupTitle}>{group.name}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.modelOptionRow}>
            {group.items.map(([id, label]) => (
              <Pressable key={id} style={[styles.modelOption, value === id && styles.modelOptionActive]} onPress={() => onChange(id)}>
                <Text style={[styles.modelOptionText, value === id && styles.modelOptionTextActive]} numberOfLines={1}>
                  {label}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      ))}
    </View>
  );
}

function SummaryPill({ label }: { label: string }) {
  return (
    <View style={styles.summaryPill}>
      <Text style={styles.summaryText} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

function findModelLabel(options: readonly ModelOption[], value: string) {
  return options.find(([id]) => id === value)?.[1] || value;
}

function groupModelOptions(options: readonly ModelOption[]) {
  const groups: Array<{ name: string; items: ModelOption[] }> = [];
  options.forEach((option) => {
    const name = option[2] || '其他';
    const group = groups.find((item) => item.name === name);
    if (group) {
      group.items.push(option);
    } else {
      groups.push({ name, items: [option] });
    }
  });
  return groups;
}

function ErrorLine({ text }: { text: string }) {
  return (
    <View style={styles.errorLine}>
      <AlertTriangle size={16} color="#b4442f" />
      <Text style={styles.errorText}>{text}</Text>
    </View>
  );
}

function StatePanel({ icon, title, note, actionLabel, onAction }: { icon: React.ReactNode; title: string; note: string; actionLabel?: string; onAction?: () => void }) {
  return (
    <View style={styles.statePanel}>
      {icon}
      <Text style={styles.stateTitle}>{title}</Text>
      <Text style={styles.stateNote}>{note}</Text>
      {actionLabel && onAction ? (
        <Pressable style={styles.primaryButton} onPress={onAction}>
          <Text style={styles.primaryButtonText}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function JobDetail({ job, apiBase, onPreview }: { job: Job | null; apiBase: string; onPreview: (url: string) => void }) {
  if (!job) return <View style={styles.emptyBox}><Text style={styles.emptyTitle}>暂无生成任务</Text><Text style={styles.emptyNote}>提交后会显示实时状态和候选图。</Text></View>;
  const images = job.result_images.filter((image) => image.url);
  return (
    <View style={styles.jobCard}>
      <View style={styles.jobTopline}>
        <StatusBadge status={job.status} />
        <Text style={styles.jobId} numberOfLines={1}>{job.id}</Text>
      </View>
      <Text style={styles.jobCaption}>{job.caption || '未记录图注'}</Text>
      <View style={styles.jobMetaRow}>
        <Text style={styles.jobMeta}>任务来源：{formatClientPlatform(job.client_platform)}</Text>
        <Text style={styles.jobMeta}>{job.infographic_category || '方法框架图'}</Text>
        <Text style={styles.jobMeta}>{job.provider || '模型服务'}</Text>
        <Text style={styles.jobMeta}>{formatConfigurationMode(job.configuration_mode)}</Text>
      </View>
      {job.error ? <ErrorLine text={formatErrorMessage(job.error)} /> : null}
      {images.length ? <ImageGrid images={images} apiBase={apiBase} onPreview={onPreview} /> : <Text style={styles.emptyNote}>任务完成后会在这里显示候选图。</Text>}
    </View>
  );
}

function JobList({ jobs, apiBase, showUser, emptyText, onPreview }: { jobs: Job[]; apiBase: string; showUser?: boolean; emptyText: string; onPreview: (url: string) => void }) {
  if (!jobs.length) {
    return (
      <View style={styles.emptyBox}>
        <Text style={styles.emptyTitle}>{emptyText}</Text>
        <Text style={styles.emptyNote}>新任务完成后会出现在这里。</Text>
      </View>
    );
  }
  return (
    <View style={styles.jobList}>
      {jobs.map((item) => {
        const images = item.result_images.filter((image) => image.url);
        return (
          <View style={styles.jobCard} key={item.id}>
            <View style={styles.jobTopline}>
              <StatusBadge status={item.status} />
              <Text style={styles.jobDate}>{formatDate(item.created_at)}</Text>
            </View>
            <Text style={styles.jobCaption}>{item.caption || '未记录图注'}</Text>
            <View style={styles.jobMetaRow}>
              <Text style={styles.jobMeta}>任务来源：{formatClientPlatform(item.client_platform)}</Text>
              <Text style={styles.jobMeta}>{item.infographic_category || '方法框架图'}</Text>
              <Text style={styles.jobMeta}>{item.provider || '模型服务'}</Text>
              <Text style={styles.jobMeta}>{formatConfigurationMode(item.configuration_mode)}</Text>
            </View>
            {showUser ? <Text style={styles.userEmail}>{item.user_email || '匿名用户'}</Text> : null}
            <View style={styles.modelsBlock}>
              <Text style={styles.modelText}>主模型：{item.main_model_name || '未记录'}</Text>
              <Text style={styles.modelText}>图像模型：{item.image_gen_model_name || '未记录'}</Text>
            </View>
            {item.status === 'failed' ? <ErrorLine text={formatErrorMessage(item.error || item.logs_tail || '生成失败')} /> : null}
            {item.method_content ? <Text style={styles.methodPreview} numberOfLines={3}>{item.method_content}</Text> : null}
            {images.length ? <ImageGrid images={images} apiBase={apiBase} onPreview={onPreview} /> : null}
          </View>
        );
      })}
    </View>
  );
}

function ImageGrid({ images, apiBase, onPreview }: { images: Array<{ filename: string; url: string; candidate_id: number }>; apiBase: string; onPreview: (url: string) => void }) {
  return (
    <View style={styles.imageGrid}>
      {images.map((image, index) => {
        const url = resolveImageUrl(apiBase, image.url);
        return (
          <Pressable key={`${image.filename}-${index}`} style={styles.resultImageFrame} onPress={() => onPreview(url)}>
            <Image source={{ uri: url }} style={styles.resultImage} resizeMode="cover" />
            <Text style={styles.resultCaption}>结果图 {image.candidate_id + 1}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function StatusBadge({ status }: { status: string }) {
  return (
    <View style={[styles.statusBadge, statusStyle(status)]}>
      <Text style={styles.statusText}>{STATUS_LABELS[status] || status || '未知'}</Text>
    </View>
  );
}

function AuthModal({
  visible,
  mode,
  email,
  password,
  name,
  error,
  submitting,
  onClose,
  onModeChange,
  onEmailChange,
  onPasswordChange,
  onNameChange,
  onSubmit,
}: {
  visible: boolean;
  mode: AuthMode;
  email: string;
  password: string;
  name: string;
  error: string;
  submitting: boolean;
  onClose: () => void;
  onModeChange: (mode: AuthMode) => void;
  onEmailChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onNameChange: (value: string) => void;
  onSubmit: () => void;
}) {
  const isSignUp = mode === 'sign-up';
  const canSubmit = Boolean(email.trim() && password.length >= 8 && !submitting);
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.modalBackdrop} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={0}>
        <ScrollView style={styles.modalScroll} contentContainerStyle={styles.modalScrollContent} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
          <View style={styles.authSheet}>
            <View style={styles.sheetTopline}>
              <View style={styles.sheetCopy}>
                <Text style={styles.sheetTitle}>{isSignUp ? '注册账号' : '登录账号'}</Text>
                <Text style={styles.sheetNote}>登录后可以同步查看自己的任务记录。</Text>
              </View>
              <Pressable style={styles.closeButton} onPress={onClose}>
                <X size={20} color="#1b1a16" />
              </Pressable>
            </View>
            {isSignUp ? <LabeledInput label="昵称" value={name} onChangeText={onNameChange} maxLength={24} /> : null}
            <LabeledInput label="邮箱" value={email} onChangeText={onEmailChange} autoCapitalize="none" />
            <LabeledInput label="密码" value={password} onChangeText={onPasswordChange} secureTextEntry />
            <Pressable style={[styles.primaryButton, !canSubmit && styles.disabledButton]} disabled={!canSubmit} onPress={onSubmit}>
              {submitting ? <ActivityIndicator color="#fff" /> : <ShieldCheck size={18} color="#fff" />}
              <Text style={styles.primaryButtonText}>{isSignUp ? '注册并登录' : '登录'}</Text>
            </Pressable>
            <Pressable style={styles.textButton} onPress={() => onModeChange(isSignUp ? 'sign-in' : 'sign-up')}>
              <Text style={styles.textButtonText}>{isSignUp ? '已有账号，去登录' : '没有账号，去注册'}</Text>
            </Pressable>
            {error ? <ErrorLine text={error} /> : null}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function clampNumber(value: string, min: number, max: number, fallback: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, Math.round(parsed)));
}

function formatConfigurationMode(mode: string) {
  return mode === 'simple' ? '普通模式' : '专业模式';
}

function statusStyle(status: string) {
  if (status === 'succeeded') return styles.statusSuccess;
  if (status === 'failed') return styles.statusFailed;
  if (status === 'running') return styles.statusRunning;
  return styles.statusQueued;
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f6f4ee',
  },
  flex: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 14,
    paddingTop: Platform.OS === 'android' ? (NativeStatusBar.currentHeight ?? 24) + 10 : 10,
    paddingBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#ded8cc',
    backgroundColor: '#fffaf0',
  },
  brandRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingRight: 10,
  },
  logo: {
    width: 44,
    height: 44,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ead9b5',
  },
  brandText: {
    flex: 1,
  },
  title: {
    color: '#1b1a16',
    fontSize: 17,
    fontWeight: '800',
  },
  subtitle: {
    color: '#6f6658',
    fontSize: 11,
    marginTop: 2,
  },
  loginPill: {
    minHeight: 36,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d6caba',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#fffdfa',
  },
  loginText: {
    fontSize: 13,
    color: '#1b1a16',
    fontWeight: '700',
  },
  accountPill: {
    maxWidth: 126,
    minHeight: 36,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: WARM_PRIMARY_BORDER,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: WARM_PRIMARY_SOFT,
  },
  accountText: {
    flex: 1,
    color: WARM_PRIMARY_DARK,
    fontSize: 12,
    fontWeight: '700',
  },
  tabs: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 8,
    backgroundColor: '#fffaf0',
  },
  tabButton: {
    flex: 1,
    minHeight: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d6caba',
    backgroundColor: '#fffdfa',
  },
  tabButtonActive: {
    backgroundColor: WARM_PRIMARY,
    borderColor: WARM_PRIMARY,
  },
  tabText: {
    color: '#5f574c',
    fontSize: 13,
    fontWeight: '700',
  },
  tabTextActive: {
    color: '#fff',
  },
  scroll: {
    flex: 1,
  },
  content: {
    padding: 14,
    paddingBottom: 32,
    gap: 12,
  },
  healthBanner: {
    borderRadius: 8,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
  },
  healthOk: {
    backgroundColor: '#f2eee8',
    borderColor: WARM_PRIMARY_BORDER,
  },
  healthWarn: {
    backgroundColor: '#fff4e6',
    borderColor: '#e2bd82',
  },
  healthTextBlock: {
    flex: 1,
  },
  healthTitle: {
    color: '#1b1a16',
    fontSize: 14,
    fontWeight: '800',
  },
  healthNote: {
    color: '#6f6658',
    fontSize: 12,
    lineHeight: 18,
    marginTop: 2,
  },
  refreshIconButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fffdfa',
  },
  sectionHeader: {
    marginTop: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  sectionCopy: {
    flex: 1,
  },
  sectionTitle: {
    color: '#1b1a16',
    fontSize: 16,
    fontWeight: '800',
  },
  sectionNote: {
    color: '#6f6658',
    fontSize: 11,
    lineHeight: 16,
    marginTop: 2,
  },
  modeSwitch: {
    flexDirection: 'row',
    gap: 10,
  },
  modeButton: {
    flex: 1,
    minHeight: 54,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d6caba',
    backgroundColor: '#fffdfa',
    paddingHorizontal: 10,
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  modeButtonActive: {
    backgroundColor: WARM_PRIMARY,
    borderColor: WARM_PRIMARY,
  },
  modeCopy: {
    flex: 1,
  },
  modeTitle: {
    color: '#1b1a16',
    fontWeight: '800',
  },
  modeTitleActive: {
    color: '#fff',
  },
  modeSubtitle: {
    color: '#6f6658',
    fontSize: 11,
    marginTop: 2,
  },
  modeSubtitleActive: {
    color: '#f6e7dc',
  },
  providerGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    minHeight: 36,
    paddingHorizontal: 11,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d6caba',
    backgroundColor: '#fffdfa',
  },
  chipActive: {
    backgroundColor: WARM_PRIMARY,
    borderColor: WARM_PRIMARY,
  },
  chipText: {
    color: '#50483d',
    fontSize: 13,
    fontWeight: '700',
  },
  chipTextActive: {
    color: '#fff',
  },
  panel: {
    borderWidth: 1,
    borderColor: '#ded8cc',
    backgroundColor: '#fffdfa',
    borderRadius: 8,
    padding: 11,
    gap: 8,
  },
  panelTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  panelTitle: {
    color: '#1b1a16',
    fontSize: 15,
    fontWeight: '800',
  },
  guideLink: {
    alignSelf: 'flex-start',
  },
  guideLinkText: {
    color: WARM_ACCENT,
    fontWeight: '800',
  },
  guideStep: {
    color: '#6f6658',
    fontSize: 12,
    lineHeight: 18,
  },
  field: {
    gap: 7,
  },
  compactField: {
    flex: 1,
  },
  fieldLabel: {
    color: '#342f28',
    fontSize: 13,
    fontWeight: '800',
  },
  input: {
    minHeight: 42,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d6caba',
    backgroundColor: '#fffdfa',
    color: '#1b1a16',
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 14,
    lineHeight: 20,
    includeFontPadding: false,
  },
  textarea: {
    lineHeight: 20,
  },
  summaryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  summaryPill: {
    maxWidth: '100%',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d9bf8b',
    backgroundColor: '#fff4d7',
    paddingHorizontal: 10,
    minHeight: 30,
    justifyContent: 'center',
  },
  summaryText: {
    color: '#7b5519',
    fontSize: 12,
    fontWeight: '800',
  },
  advancedBlock: {
    gap: 12,
  },
  optionGroup: {
    gap: 8,
  },
  optionRow: {
    gap: 8,
    paddingRight: 4,
  },
  modelSelector: {
    borderWidth: 1,
    borderColor: '#ded8cc',
    backgroundColor: '#fffdfa',
    borderRadius: 8,
    padding: 10,
    gap: 10,
  },
  modelGroup: {
    gap: 7,
  },
  modelGroupTitle: {
    color: '#7a6e60',
    fontSize: 11,
    fontWeight: '800',
  },
  modelOptionRow: {
    gap: 8,
    paddingRight: 4,
  },
  modelOption: {
    maxWidth: 236,
    minHeight: 36,
    paddingHorizontal: 11,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d6caba',
    backgroundColor: '#fffaf0',
    justifyContent: 'center',
  },
  modelOptionActive: {
    backgroundColor: WARM_PRIMARY,
    borderColor: WARM_PRIMARY,
  },
  modelOptionText: {
    color: '#50483d',
    fontSize: 12,
    fontWeight: '800',
  },
  modelOptionTextActive: {
    color: '#fff',
  },
  inlineInputs: {
    flexDirection: 'row',
    gap: 10,
  },
  switchRow: {
    borderWidth: 1,
    borderColor: '#d6caba',
    borderRadius: 8,
    backgroundColor: '#fffdfa',
    minHeight: 48,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  switchText: {
    color: '#1b1a16',
    fontWeight: '800',
  },
  exampleRow: {
    gap: 10,
    paddingRight: 4,
  },
  exampleCard: {
    width: 208,
    minHeight: 116,
    borderWidth: 1,
    borderColor: '#ded8cc',
    backgroundColor: '#fffdfa',
    borderRadius: 8,
    padding: 11,
    gap: 5,
  },
  exampleLabel: {
    color: '#c16b25',
    fontSize: 11,
    fontWeight: '900',
  },
  exampleTitle: {
    color: '#1b1a16',
    fontSize: 14,
    fontWeight: '800',
  },
  exampleCaption: {
    color: '#5f574c',
    fontSize: 12,
    lineHeight: 17,
  },
  exampleHint: {
    color: '#8a8174',
    fontSize: 11,
    lineHeight: 16,
  },
  categoryNote: {
    color: '#6f6658',
    fontSize: 12,
    lineHeight: 18,
    marginTop: -6,
  },
  primaryButton: {
    minHeight: 50,
    borderRadius: 8,
    backgroundColor: WARM_PRIMARY,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 14,
  },
  disabledButton: {
    opacity: 0.48,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '800',
  },
  secondaryButton: {
    minHeight: 44,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: WARM_PRIMARY_BORDER,
    backgroundColor: WARM_PRIMARY_SOFT,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 12,
  },
  secondaryButtonText: {
    color: WARM_PRIMARY,
    fontWeight: '800',
  },
  textButton: {
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textButtonText: {
    color: WARM_PRIMARY,
    fontWeight: '800',
  },
  errorLine: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e1b8ad',
    backgroundColor: '#fff1ee',
    padding: 10,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  errorText: {
    flex: 1,
    color: '#933522',
    fontSize: 13,
    lineHeight: 18,
  },
  emptyBox: {
    minHeight: 112,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#d6caba',
    borderRadius: 8,
    backgroundColor: '#fffdfa',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    gap: 6,
  },
  emptyTitle: {
    color: '#1b1a16',
    fontWeight: '800',
  },
  emptyNote: {
    color: '#6f6658',
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
  },
  statePanel: {
    borderWidth: 1,
    borderColor: '#ded8cc',
    backgroundColor: '#fffdfa',
    borderRadius: 8,
    padding: 16,
    gap: 10,
  },
  stateTitle: {
    color: '#1b1a16',
    fontSize: 16,
    fontWeight: '800',
  },
  stateNote: {
    color: '#6f6658',
    fontSize: 13,
    lineHeight: 19,
  },
  jobList: {
    gap: 12,
  },
  jobCard: {
    borderWidth: 1,
    borderColor: '#ded8cc',
    backgroundColor: '#fffdfa',
    borderRadius: 8,
    padding: 12,
    gap: 10,
  },
  jobTopline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  jobId: {
    flex: 1,
    color: '#8a8174',
    fontSize: 11,
  },
  jobDate: {
    marginLeft: 'auto',
    color: '#8a8174',
    fontSize: 12,
  },
  jobCaption: {
    color: '#1b1a16',
    fontSize: 15,
    fontWeight: '800',
    lineHeight: 20,
  },
  jobMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
  },
  jobMeta: {
    color: '#6f6658',
    fontSize: 12,
    backgroundColor: '#f5f2e9',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    overflow: 'hidden',
  },
  userEmail: {
    color: WARM_PRIMARY,
    fontSize: 12,
    fontWeight: '800',
  },
  modelsBlock: {
    gap: 4,
  },
  modelText: {
    color: '#5f574c',
    fontSize: 12,
  },
  methodPreview: {
    color: '#6f6658',
    fontSize: 12,
    lineHeight: 18,
  },
  imageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  resultImageFrame: {
    width: '100%',
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#ded8cc',
    backgroundColor: '#f5f2e9',
  },
  resultImage: {
    width: '100%',
    aspectRatio: 1.35,
    backgroundColor: '#ebe5d9',
  },
  resultCaption: {
    color: '#5f574c',
    fontSize: 11,
    fontWeight: '700',
    padding: 8,
  },
  statusBadge: {
    borderRadius: 8,
    paddingHorizontal: 8,
    minHeight: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusQueued: {
    backgroundColor: '#fff4d7',
  },
  statusRunning: {
    backgroundColor: '#e6f1ff',
  },
  statusSuccess: {
    backgroundColor: '#e4f6ed',
  },
  statusFailed: {
    backgroundColor: '#ffe8e3',
  },
  statusText: {
    color: '#1b1a16',
    fontSize: 12,
    fontWeight: '800',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(17, 24, 39, 0.38)',
  },
  modalScroll: {
    flex: 1,
  },
  modalScrollContent: {
    flexGrow: 1,
    justifyContent: 'flex-end',
    paddingTop: 72,
  },
  authSheet: {
    backgroundColor: '#fffdfa',
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    padding: 16,
    paddingBottom: Platform.OS === 'android' ? 24 : 28,
    gap: 12,
  },
  sheetTopline: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  sheetCopy: {
    flex: 1,
  },
  sheetTitle: {
    color: '#1b1a16',
    fontSize: 18,
    fontWeight: '800',
  },
  sheetNote: {
    color: '#6f6658',
    fontSize: 12,
    marginTop: 2,
  },
  closeButton: {
    width: 38,
    height: 38,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f5f2e9',
  },
  previewBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.92)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  previewClose: {
    position: 'absolute',
    top: 52,
    right: 18,
    width: 42,
    height: 42,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  previewImage: {
    width: '100%',
    height: '82%',
  },
});
