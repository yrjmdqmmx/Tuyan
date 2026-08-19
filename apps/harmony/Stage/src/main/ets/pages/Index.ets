import { common } from '@kit.AbilityKit'
import {
  ASPECT_RATIO_OPTIONS,
  CANDIDATE_OPTIONS,
  CRITIC_ROUND_OPTIONS,
  FEEDBACK_CATEGORY_OPTIONS,
  INFOGRAPHIC_CATEGORIES,
  OUTPUT_FORMAT_OPTIONS,
  PIPELINE_OPTIONS,
  providerById,
  PROVIDERS,
  QUICK_START_EXAMPLES,
  RESOLUTION_OPTIONS,
  RETRIEVAL_OPTIONS,
  supportedResolutions,
} from '../constants/AppConstants'
import {
  ImageAsset,
  ImageSize,
  InfographicCategory,
  Job,
  JobStage,
  ModelOption,
  ProviderConfig,
  QuickStartExample,
  ReferenceImageUpload,
  RetrievedReference,
  RetrievalSetting,
  SelectOption,
} from '../models/Types'
import { AppStore } from '../stores/AppStore'
import { formatClientPlatform, formatDate, statusLabel } from '../utils/Format'
import { formatReferenceImageMode } from '../utils/ReferenceMode'

@Entry
@Component
struct Index {
  private store?: AppStore
  private pollTimer: number = -1
  @State revision: number = 0

  aboutToAppear(): void {
    if (this.store) return
    const context = getContext(this) as common.UIAbilityContext
    this.store = new AppStore(context)
    this.run(async () => {
      await this.store?.initialize()
    })
  }

  aboutToDisappear(): void {
    this.stopPolling()
  }

  private touch(): void {
    this.revision += 1
  }

  private async run(action: () => Promise<void>): Promise<void> {
    if (!this.store) return
    await this.store.safe(action)
    this.touch()
  }

  private startPolling(): void {
    this.stopPolling()
    this.pollTimer = setInterval(async () => {
      if (!this.store) return
      const shouldContinue = await this.store.pollCurrentJob()
      this.touch()
      if (!shouldContinue) this.stopPolling()
    }, 3000)
  }

  private stopPolling(): void {
    if (this.pollTimer >= 0) {
      clearInterval(this.pollTimer)
      this.pollTimer = -1
    }
  }

  private toImageSize(value: string): ImageSize {
    if (value === '2K') return '2K'
    if (value === '4K') return '4K'
    return '1K'
  }

  build() {
    if (!this.store) {
      Column() {
        Text('PaperBanana')
          .fontSize(28)
          .fontWeight(FontWeight.Bold)
        Text('正在启动...')
          .fontSize(14)
          .fontColor('#6b7280')
          .margin({ top: 8 })
      }
      .height('100%')
      .width('100%')
      .justifyContent(FlexAlign.Center)
      .backgroundColor('#f6f2ea')
    } else {
      Column() {
        this.Header()
        this.TabBar()
        if (this.store.error.length) {
          Text(this.store.error)
            .fontSize(13)
            .fontColor('#991b1b')
            .backgroundColor('#fee2e2')
            .borderRadius(8)
            .padding(10)
            .margin({ left: 14, right: 14, top: 8 })
            .width('calc(100% - 28vp)')
        }
        if (this.store.notice.length) {
          Text(this.store.notice)
            .fontSize(13)
            .fontColor('#065f46')
            .backgroundColor('#d1fae5')
            .borderRadius(8)
            .padding(10)
            .margin({ left: 14, right: 14, top: 8 })
            .width('calc(100% - 28vp)')
        }
        Scroll() {
          Column() {
            if (this.store.activeTab === 'generate') {
              this.GenerateTab()
            } else if (this.store.activeTab === 'records') {
              this.RecordsTab()
            } else if (this.store.activeTab === 'account') {
              this.AccountTab()
            } else {
              this.FeedbackTab()
            }
          }
          .padding({ left: 14, right: 14, bottom: 24 })
          .width('100%')
        }
        .layoutWeight(1)
      }
      .height('100%')
      .width('100%')
      .backgroundColor('#f6f2ea')
    }
  }

  @Builder
  private Header() {
    Row() {
      Column() {
        Text('PaperBanana')
          .fontSize(24)
          .fontWeight(FontWeight.Bold)
          .fontColor('#1f2937')
        Text(`${this.store?.health?.runtime === 'gateway' ? '网关已连接' : '等待后端'} · Harmony`)
          .fontSize(12)
          .fontColor('#6b7280')
          .margin({ top: 2 })
      }
      .layoutWeight(1)
      Button('健康检查')
        .fontSize(12)
        .height(34)
        .backgroundColor('#1f2937')
        .onClick(() => this.run(async () => {
          await this.store?.refreshHealth()
        }))
    }
    .padding({ left: 16, right: 16, top: 14, bottom: 10 })
    .width('100%')
  }

  @Builder
  private TabBar() {
    Row() {
      this.TabButton('generate', '生成')
      this.TabButton('records', '记录')
      this.TabButton('account', '账号')
      this.TabButton('feedback', '反馈')
    }
    .padding({ left: 14, right: 14, bottom: 6 })
    .width('100%')
  }

  @Builder
  private TabButton(id: string, label: string) {
    Button(label)
      .fontSize(13)
      .height(34)
      .layoutWeight(1)
      .margin({ right: 6 })
      .backgroundColor(this.store?.activeTab === id ? '#111827' : '#e5e7eb')
      .fontColor(this.store?.activeTab === id ? '#ffffff' : '#374151')
      .onClick(() => {
        if (!this.store) return
        this.store.activeTab = id
        if (id === 'records') {
          this.run(async () => {
            await this.store?.loadJobs()
          })
        } else {
          this.touch()
        }
      })
  }

  @Builder
  private Section(title: string) {
    Row() {
      Text(title)
        .fontSize(16)
        .fontWeight(FontWeight.Bold)
        .fontColor('#111827')
      Blank()
    }
    .margin({ top: 16, bottom: 8 })
  }

  @Builder
  private GenerateTab() {
    this.Section('模型服务')
    this.ProviderPicker()
    this.AuthKeyCard()
    this.Section('论文内容')
    this.ExampleButtons()
    this.TextAreaField('方法内容', this.store?.methodContent || '', (value: string) => {
      if (this.store) this.store.methodContent = value
      this.touch()
    }, 180)
    this.TextAreaField('目标图注', this.store?.caption || '', (value: string) => {
      if (this.store) this.store.caption = value
      this.touch()
    }, 92)
    this.CategoryPicker()
    this.BasicOptions()
    this.AdvancedOptions()
    this.ReferencePanel()
    this.SubmitPanel()
    this.JobDetailPanel()
  }

  @Builder
  private ProviderPicker() {
    Row() {
      ForEach(PROVIDERS, (provider: ProviderConfig) => {
        Button(provider.label)
          .fontSize(12)
          .height(34)
          .backgroundColor(this.store?.provider === provider.id ? '#2563eb' : '#e5e7eb')
          .fontColor(this.store?.provider === provider.id ? '#ffffff' : '#374151')
          .margin({ right: 8, bottom: 8 })
          .onClick(() => {
            if (!this.store) return
            this.store.onProviderChange(provider.id)
            this.touch()
          })
      }, (provider: ProviderConfig) => provider.id)
    }
    .width('100%')
  }

  @Builder
  private AuthKeyCard() {
    Column() {
      TextInput({ placeholder: providerById(this.store?.provider || 'bailian').keyPlaceholder, text: this.store?.apiKey || '' })
        .type(InputType.Password)
        .height(42)
        .backgroundColor('#ffffff')
        .borderRadius(8)
        .padding({ left: 12, right: 12 })
        .onChange((value: string) => {
          if (this.store) this.store.apiKey = value
        })
      Text('API Key 仅用于本次会话提交，不写入本地存储。')
        .fontSize(12)
        .fontColor('#6b7280')
        .margin({ top: 6 })
    }
    .padding(12)
    .backgroundColor('#fef3c7')
    .borderRadius(8)
  }

  @Builder
  private ExampleButtons() {
    Row() {
      ForEach(QUICK_START_EXAMPLES, (example: QuickStartExample, index: number) => {
        Button(example.label)
          .fontSize(12)
          .height(32)
          .backgroundColor('#dbeafe')
          .fontColor('#1d4ed8')
          .margin({ right: 8, bottom: 8 })
          .onClick(() => {
            this.store?.applyExample(index)
            this.touch()
          })
      }, (example: QuickStartExample) => example.id)
    }
    .width('100%')
  }

  @Builder
  private CategoryPicker() {
    this.Section('图示类型')
    Flex({ wrap: FlexWrap.Wrap }) {
      ForEach(INFOGRAPHIC_CATEGORIES, (item: InfographicCategory) => {
        Button(item.label)
          .fontSize(12)
          .height(34)
          .backgroundColor(this.store?.categoryId === item.id ? '#0f766e' : '#e5e7eb')
          .fontColor(this.store?.categoryId === item.id ? '#ffffff' : '#374151')
          .margin({ right: 8, bottom: 8 })
          .onClick(() => this.run(async () => {
            this.store?.onCategoryChange(item.id)
            await this.store?.loadReferenceLibrary()
          }))
      }, (item: InfographicCategory) => item.id)
    }
    Text(INFOGRAPHIC_CATEGORIES.find((item: InfographicCategory) => item.id === this.store?.categoryId)?.description || '')
      .fontSize(12)
      .fontColor('#6b7280')
  }

  @Builder
  private BasicOptions() {
    this.Section('输出参数')
    Row() {
      this.OptionButtons(OUTPUT_FORMAT_OPTIONS, this.store?.outputFormat || 'png', (value: string) => {
        if (this.store) this.store.outputFormat = value as 'png' | 'svg'
      })
    }
    this.OptionButtons(RESOLUTION_OPTIONS.filter((item: SelectOption) => supportedResolutions(this.store?.provider || 'bailian', this.store?.imageModelName || '').includes(this.toImageSize(item.value))), this.store?.imageSize || '1K', (value: string) => {
      if (this.store) this.store.imageSize = value as ImageSize
    })
    Row() {
      Text('专业模式')
        .fontSize(14)
        .fontColor('#374151')
        .layoutWeight(1)
      Toggle({ type: ToggleType.Switch, isOn: this.store?.configurationMode === 'advanced' })
        .onChange((isOn: boolean) => {
          if (this.store) this.store.configurationMode = isOn ? 'advanced' : 'simple'
          this.touch()
        })
    }
    .padding(12)
    .backgroundColor('#ffffff')
    .borderRadius(8)
    .margin({ top: 8 })
  }

  @Builder
  private AdvancedOptions() {
    if (this.store?.configurationMode === 'advanced') {
      this.Section('专业参数')
      this.SmallLabel('生成流程')
      this.OptionButtons(PIPELINE_OPTIONS, this.store.pipelineMode, (value: string) => {
        if (this.store) this.store.pipelineMode = value
      })
      this.SmallLabel('检索设置')
      if (this.store.referenceFiles.length > 0) {
        Text('不使用检索 · 已上传参考图，检索自动关闭')
          .fontSize(12)
          .fontColor('#92400e')
          .padding(10)
          .backgroundColor('#fef3c7')
          .borderRadius(8)
      } else {
        this.OptionButtons(RETRIEVAL_OPTIONS, this.store.retrievalSetting, (value: string) => {
          if (this.store) this.store.retrievalSetting = value as RetrievalSetting
        })
      }
      this.SmallLabel('比例')
      this.OptionButtons(ASPECT_RATIO_OPTIONS, this.store.aspectRatio, (value: string) => {
        if (this.store) this.store.aspectRatio = value
      })
      this.SmallLabel('候选图')
      this.OptionButtons(CANDIDATE_OPTIONS, `${this.store.numCandidates}`, (value: string) => {
        if (this.store) this.store.numCandidates = Number(value)
      })
      this.SmallLabel('评审轮数')
      this.OptionButtons(CRITIC_ROUND_OPTIONS, `${this.store.maxCriticRounds}`, (value: string) => {
        if (this.store) this.store.maxCriticRounds = Number(value)
      })
      this.ModelPickers()
    }
  }

  @Builder
  private ModelPickers() {
    this.ModelPickersFor(providerById(this.store?.provider || 'bailian'))
  }

  @Builder
  private ModelPickersFor(provider: ProviderConfig) {
    this.SmallLabel('主模型')
    this.ModelButtons(provider.mainModels, this.store?.mainModelName || '', (value: string) => {
      if (!this.store) return
      this.store.mainModelName = value
      this.touch()
    })
    this.SmallLabel('出图模型')
    this.ModelButtons(provider.imageModels, this.store?.imageModelName || '', (value: string) => {
      if (!this.store) return
      this.store.imageModelName = value
      this.store.clampResolution()
      this.touch()
    })
    if (this.store?.referenceImageMode !== 'main_model' || (this.store?.referenceFiles.length || 0) > 0) {
      this.SmallLabel('参考图识别模型')
      this.ModelButtons(provider.visionModels, this.store?.referenceVisionModelName || '', (value: string) => {
        if (this.store) this.store.referenceVisionModelName = value
        this.touch()
      })
    }
  }

  @Builder
  private ModelButtons(options: ModelOption[], selected: string, onSelect: (value: string) => void) {
    Flex({ wrap: FlexWrap.Wrap }) {
      ForEach(options, (option: ModelOption) => {
        Button(`${option.group} / ${option.label}`)
          .fontSize(11)
          .height(32)
          .backgroundColor(selected === option.value ? '#111827' : '#e5e7eb')
          .fontColor(selected === option.value ? '#ffffff' : '#374151')
          .margin({ right: 6, bottom: 6 })
          .onClick(() => onSelect(option.value))
      }, (option: ModelOption) => option.value)
    }
  }

  @Builder
  private ReferencePanel() {
    this.Section('参考图与案例')
    Row() {
      Button(`添加参考图 ${this.store?.referenceFiles.length || 0}/3`)
        .fontSize(13)
        .height(36)
        .backgroundColor('#7c3aed')
        .onClick(() => this.run(async () => {
          await this.store?.pickReferences()
        }))
      Button('清空')
        .fontSize(13)
        .height(36)
        .margin({ left: 8 })
        .backgroundColor('#e5e7eb')
        .fontColor('#374151')
        .onClick(() => {
          if (!this.store) return
          this.store.referenceFiles = []
          this.touch()
        })
    }
    if ((this.store?.referenceFiles.length || 0) > 0) {
      Text('已上传参考图时，检索设置会锁定为不使用检索。')
        .fontSize(12)
        .fontColor('#92400e')
        .margin({ top: 8, bottom: 6 })
      ForEach(this.store?.referenceFiles || [], (file: ReferenceImageUpload) => {
        Row() {
          Text(file.filename)
            .fontSize(12)
            .fontColor('#374151')
            .layoutWeight(1)
          Button('移除')
            .fontSize(11)
            .height(28)
            .backgroundColor('#fee2e2')
            .fontColor('#991b1b')
            .onClick(() => {
              this.store?.removeReferenceFile(file.id)
              this.touch()
            })
        }
        .padding(8)
        .backgroundColor('#ffffff')
        .borderRadius(8)
        .margin({ top: 6 })
      }, (file: ReferenceImageUpload) => file.id)
      Text(this.store?.referenceModeNote || '')
        .fontSize(12)
        .fontColor('#6b7280')
        .margin({ top: 8 })
    }
    if (this.store?.configurationMode === 'advanced' && this.store.retrievalSetting === 'manual' && !this.store.referenceFiles.length) {
      this.ManualReferenceLibrary()
    }
  }

  @Builder
  private ManualReferenceLibrary() {
    Text('手动参考库')
      .fontSize(14)
      .fontWeight(FontWeight.Medium)
      .fontColor('#374151')
      .margin({ top: 10, bottom: 6 })
    ForEach(this.store?.referenceLibrary || [], (reference: RetrievedReference) => {
      Column() {
        Row() {
          Text(reference.title || reference.id)
            .fontSize(13)
            .fontWeight(FontWeight.Medium)
            .fontColor('#111827')
            .layoutWeight(1)
          Button((this.store?.selectedReferenceIds || []).includes(reference.id) ? '已选' : '选择')
            .fontSize(11)
            .height(28)
            .backgroundColor((this.store?.selectedReferenceIds || []).includes(reference.id) ? '#0f766e' : '#e5e7eb')
            .fontColor((this.store?.selectedReferenceIds || []).includes(reference.id) ? '#ffffff' : '#374151')
            .onClick(() => {
              this.store?.toggleManualReference(reference.id)
              this.touch()
            })
        }
        Text(reference.summary)
          .fontSize(12)
          .fontColor('#6b7280')
          .maxLines(2)
          .textOverflow({ overflow: TextOverflow.Ellipsis })
          .margin({ top: 4 })
      }
      .padding(10)
      .backgroundColor('#ffffff')
      .borderRadius(8)
      .margin({ top: 8 })
    }, (reference: RetrievedReference) => reference.id)
  }

  @Builder
  private SubmitPanel() {
    Button(this.store?.isSubmitting ? '提交中...' : '创建生成任务')
      .width('100%')
      .height(46)
      .fontSize(15)
      .fontWeight(FontWeight.Bold)
      .backgroundColor(this.store?.canSubmit ? '#111827' : '#9ca3af')
      .margin({ top: 18 })
      .enabled(Boolean(this.store?.canSubmit))
      .onClick(() => this.run(async () => {
        await this.store?.submitJob()
        this.startPolling()
      }))
  }

  @Builder
  private JobDetailPanel() {
    if (this.store?.currentJob) {
      this.JobDetailContent(this.store.currentJob)
    }
  }

  @Builder
  private JobDetailContent(job: Job) {
      this.Section('当前任务')
      this.JobCard(job, true)
      if (job.result_images.length) {
        this.SmallLabel('结果图')
        ForEach(job.result_images, (image: ImageAsset) => {
          this.ImageAssetRow(image)
        }, (image: ImageAsset) => `${image.filename}-${image.candidate_id}`)
      }
      if (job.reference_images.length) {
        this.SmallLabel('参考图')
        ForEach(job.reference_images, (image: ImageAsset) => {
          this.ImageAssetRow(image)
        }, (image: ImageAsset) => `${image.filename}-${image.object_key}`)
      }
      if (job.stages.length) {
        this.SmallLabel('生成演化')
        ForEach(job.stages, (stage: JobStage) => {
          Column() {
            Text(stage.title || stage.type)
              .fontSize(13)
              .fontWeight(FontWeight.Medium)
              .fontColor('#111827')
            if (stage.text.length) {
              Text(stage.text)
                .fontSize(12)
                .fontColor('#4b5563')
                .maxLines(4)
                .textOverflow({ overflow: TextOverflow.Ellipsis })
                .margin({ top: 4 })
            }
            if (stage.error.length) {
              Text(stage.error)
                .fontSize(12)
                .fontColor('#991b1b')
                .margin({ top: 4 })
            }
          }
          .padding(10)
          .backgroundColor('#ffffff')
          .borderRadius(8)
          .margin({ top: 8 })
        }, (stage: JobStage) => stage.id)
      }
  }

  @Builder
  private RecordsTab() {
    Row() {
      Text('我的任务记录')
        .fontSize(18)
        .fontWeight(FontWeight.Bold)
        .layoutWeight(1)
      Button('刷新')
        .height(34)
        .fontSize(12)
        .backgroundColor('#111827')
        .onClick(() => this.run(async () => {
          await this.store?.loadJobs()
        }))
    }
    .margin({ top: 16, bottom: 8 })
    if (!this.store?.currentUser) {
      Text('请先登录后查看账号任务记录。')
        .fontSize(14)
        .fontColor('#6b7280')
        .padding(16)
        .backgroundColor('#ffffff')
        .borderRadius(8)
    } else if (!(this.store?.jobs.length || 0)) {
      Text('暂无任务记录。')
        .fontSize(14)
        .fontColor('#6b7280')
    } else {
      ForEach(this.store?.jobs || [], (job: Job) => {
        this.JobCard(job, false)
      }, (job: Job) => job.id)
    }
  }

  @Builder
  private JobCard(job: Job, expanded: boolean) {
    Column() {
      Row() {
        Text(statusLabel(job.status))
          .fontSize(12)
          .fontColor(job.status === 'failed' ? '#991b1b' : '#065f46')
          .backgroundColor(job.status === 'failed' ? '#fee2e2' : '#d1fae5')
          .borderRadius(6)
          .padding({ left: 8, right: 8, top: 4, bottom: 4 })
        Text(job.infographic_category)
          .fontSize(12)
          .fontColor('#6b7280')
          .margin({ left: 8 })
        Blank()
        Text(formatDate(job.created_at))
          .fontSize(11)
          .fontColor('#9ca3af')
      }
      Text(job.caption || '未填写图注')
        .fontSize(15)
        .fontWeight(FontWeight.Medium)
        .fontColor('#111827')
        .margin({ top: 8 })
      Text(`${job.provider} · ${job.output_format || 'png'} · ${job.image_size || '1K'} · ${formatReferenceImageMode(job.reference_image_mode_used)}`)
        .fontSize(12)
        .fontColor('#6b7280')
        .margin({ top: 4 })
      Text(`任务来源：${formatClientPlatform(job.client_platform)}`)
        .fontSize(12)
        .fontColor('#6b7280')
        .margin({ top: 4 })
      if (job.error.length) {
        Text(job.error)
          .fontSize(12)
          .fontColor('#991b1b')
          .margin({ top: 6 })
      }
      if (expanded) {
        Text(job.method_content)
          .fontSize(12)
          .fontColor('#4b5563')
          .maxLines(5)
          .textOverflow({ overflow: TextOverflow.Ellipsis })
          .margin({ top: 8 })
      } else {
        Button('查看详情')
          .fontSize(12)
          .height(32)
          .backgroundColor('#e5e7eb')
          .fontColor('#374151')
          .margin({ top: 8 })
          .onClick(() => this.run(async () => {
            await this.store?.loadJob(job.id)
            if (this.store) this.store.activeTab = 'generate'
          }))
      }
    }
    .padding(12)
    .backgroundColor('#ffffff')
    .borderRadius(8)
    .margin({ top: 8 })
  }

  @Builder
  private AccountTab() {
    this.Section('账号')
    if (this.store?.currentUser) {
      Column() {
        Text(this.store.currentUser.email)
          .fontSize(16)
          .fontWeight(FontWeight.Bold)
        Text(this.store.currentUser.name || this.store.currentUser.id)
          .fontSize(12)
          .fontColor('#6b7280')
          .margin({ top: 4 })
        Button('退出登录')
          .height(38)
          .margin({ top: 12 })
          .backgroundColor('#991b1b')
          .onClick(() => this.run(async () => {
            await this.store?.signOut()
          }))
      }
      .padding(14)
      .backgroundColor('#ffffff')
      .borderRadius(8)
    } else {
      this.OptionButtons([
        { value: 'sign-in', label: '登录' },
        { value: 'sign-up', label: '注册' },
      ], this.store?.authMode || 'sign-in', (value: string) => {
        if (this.store) this.store.authMode = value
      })
      this.InputField('邮箱', this.store?.authEmail || '', (value: string) => {
        if (this.store) this.store.authEmail = value
      })
      this.InputField('密码', this.store?.authPassword || '', (value: string) => {
        if (this.store) this.store.authPassword = value
      }, true)
      if (this.store?.authMode === 'sign-up') {
        this.InputField('昵称', this.store?.authName || '', (value: string) => {
          if (this.store) this.store.authName = value
        })
      }
      Button(this.store?.authMode === 'sign-up' ? '注册并登录' : '登录')
        .width('100%')
        .height(42)
        .backgroundColor('#111827')
        .margin({ top: 12 })
        .onClick(() => this.run(async () => {
          await this.store?.signInOrUp()
        }))
    }
  }

  @Builder
  private FeedbackTab() {
    this.Section('意见反馈')
    this.OptionButtons(FEEDBACK_CATEGORY_OPTIONS, this.store?.feedbackCategory || 'experience', (value: string) => {
      if (this.store) this.store.feedbackCategory = value
    })
    this.TextAreaField('反馈内容', this.store?.feedbackMessage || '', (value: string) => {
      if (this.store) this.store.feedbackMessage = value
    }, 150)
    this.InputField('联系方式（可选）', this.store?.feedbackContact || '', (value: string) => {
      if (this.store) this.store.feedbackContact = value
    })
    Button('提交反馈')
      .width('100%')
      .height(42)
      .backgroundColor('#111827')
      .margin({ top: 12 })
      .onClick(() => this.run(async () => {
        await this.store?.submitFeedback()
      }))
  }

  @Builder
  private ImageAssetRow(image: ImageAsset) {
    Column() {
      if (image.url.length && image.mime_type !== 'image/svg+xml') {
        Image(image.url)
          .width('100%')
          .height(190)
          .objectFit(ImageFit.Contain)
          .backgroundColor('#f9fafb')
      }
      Text(image.filename || image.url)
        .fontSize(12)
        .fontColor('#374151')
        .margin({ top: 6 })
      if (image.url.length) {
        Text(image.url)
          .fontSize(10)
          .fontColor('#6b7280')
          .maxLines(2)
          .textOverflow({ overflow: TextOverflow.Ellipsis })
          .margin({ top: 2 })
      }
    }
    .padding(10)
    .backgroundColor('#ffffff')
    .borderRadius(8)
    .margin({ top: 8 })
  }

  @Builder
  private InputField(label: string, value: string, onChange: (value: string) => void, password: boolean = false) {
    Text(label)
      .fontSize(13)
      .fontColor('#374151')
      .margin({ top: 10, bottom: 6 })
    TextInput({ placeholder: label, text: value })
      .type(password ? InputType.Password : InputType.Normal)
      .height(42)
      .backgroundColor('#ffffff')
      .borderRadius(8)
      .padding({ left: 12, right: 12 })
      .onChange((next: string) => {
        onChange(next)
        this.touch()
      })
  }

  @Builder
  private TextAreaField(label: string, value: string, onChange: (value: string) => void, height: number) {
    Text(label)
      .fontSize(13)
      .fontColor('#374151')
      .margin({ top: 10, bottom: 6 })
    TextArea({ placeholder: label, text: value })
      .height(height)
      .backgroundColor('#ffffff')
      .borderRadius(8)
      .padding(10)
      .onChange((next: string) => {
        onChange(next)
        this.touch()
      })
  }

  @Builder
  private OptionButtons(options: SelectOption[], selected: string, onSelect: (value: string) => void) {
    Flex({ wrap: FlexWrap.Wrap }) {
      ForEach(options, (option: SelectOption) => {
        Button(option.label)
          .fontSize(12)
          .height(32)
          .backgroundColor(selected === option.value ? '#111827' : '#e5e7eb')
          .fontColor(selected === option.value ? '#ffffff' : '#374151')
          .margin({ right: 8, bottom: 8 })
          .onClick(() => {
            onSelect(option.value)
            this.touch()
          })
      }, (option: SelectOption) => option.value)
    }
  }

  @Builder
  private SmallLabel(label: string) {
    Text(label)
      .fontSize(13)
      .fontColor('#374151')
      .fontWeight(FontWeight.Medium)
      .margin({ top: 10, bottom: 6 })
  }
}
