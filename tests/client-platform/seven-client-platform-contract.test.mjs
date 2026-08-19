import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const read = (path) => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');

test('all seven clients send their exact platform on create and supported refine requests', () => {
  const web = read('packages/api/src/jobs.js');
  const webCreate = web.slice(web.indexOf('export async function createJobRequest'), web.indexOf('export async function referenceLibraryRequest'));
  const webRefine = web.slice(web.indexOf('export async function refineImageRequest'), web.indexOf('export async function prepareReferenceUploadRequest'));
  assert.equal((webCreate.match(/clientPlatform: CLIENT_PLATFORM/g) || []).length, 2, 'Web create must cover Laf and FastAPI transports');
  assert.equal((webRefine.match(/clientPlatform: CLIENT_PLATFORM/g) || []).length, 1, 'Web refine must send web');

  const android = read('apps/android/src/api.ts');
  const androidCreate = android.slice(android.indexOf('export async function createJobRequest'), android.indexOf('export async function getJobRequest'));
  assert.equal((androidCreate.match(/clientPlatform: CLIENT_PLATFORM/g) || []).length, 2, 'Android create must cover Laf and FastAPI transports');

  const contracts = [
    ['web', web, /const CLIENT_PLATFORM = 'web'/, /action: 'refineImage'[\s\S]*?clientPlatform: CLIENT_PLATFORM/],
    ['miniprogram', read('apps/miniprogram/miniprogram/utils/payload.ts'), /clientPlatform: 'miniprogram'/, null],
    ['android', read('apps/android/src/client-platform.ts'), /CLIENT_PLATFORM: ClientPlatform = 'android'/, null],
    ['ios', read('apps/ios/PaperBanana/Models/Payloads.swift'), /"clientPlatform": "ios"/, /"action": "refineImage"[\s\S]*?"clientPlatform": "ios"/],
    ['windows', read('apps/windows/PaperBananaApiClient.cs'), /internal const string ClientPlatform = "windows";/, null],
    ['macos', read('apps/macos/Sources/PaperBananaMac/Services/PaperBananaAPIClient.swift'), /createJobClientPlatform = "macos"/, null],
    ['harmony', read('apps/harmony/Stage/src/main/ets/utils/Payload.ets'), /CLIENT_PLATFORM: string = 'harmony'/, null],
  ];

  for (const [platform, source, declaration, refineContract] of contracts) {
    assert.match(source, declaration, `${platform} must declare/send its exact create platform`);
    if (refineContract) assert.match(source, refineContract, `${platform} refine must send its exact platform`);
  }
});

test('all client display mappers cover the seven canonical Chinese labels and missing history', () => {
  const sources = [
    read('packages/api/src/jobs.js'),
    read('apps/miniprogram/miniprogram/utils/jobs.ts'),
    read('apps/android/src/client-platform.ts'),
    read('apps/ios/PaperBanana/Models/JobModels.swift'),
    read('apps/windows/Models.cs'),
    read('apps/macos/Sources/PaperBananaMac/Models/Job.swift'),
    read('apps/harmony/Stage/src/main/ets/utils/Format.ets'),
  ];
  for (const [index, source] of sources.entries()) {
    for (const label of ['Web 网页', '微信小程序', 'Android', 'iOS', 'Windows', 'macOS', 'HarmonyOS', '未记录']) {
      assert.ok(source.includes(label), `client mapper ${index + 1} is missing ${label}`);
    }
  }
});

test('current task details and record lists render the normalized Chinese source label on every client', () => {
  const surfaces = [
    [read('apps/web/src/components/JobStatus.jsx'), /任务来源：\{formatClientPlatform\(job\.client_platform\)\}/],
    [read('apps/web/src/components/JobTable.jsx'), /formatClientPlatform\(item\.client_platform\)/],
    [read('apps/miniprogram/miniprogram/pages/job-detail/job-detail.wxml'), /任务来源：\{\{job\.client_platform_text\}\}/],
    [read('apps/miniprogram/miniprogram/pages/records/records.wxml'), /任务来源：\{\{item\.client_platform_text\}\}/],
    [read('apps/android/App.tsx'), /任务来源：\{formatClientPlatform\(job\.client_platform\)\}/],
    [read('apps/android/App.tsx'), /任务来源：\{formatClientPlatform\(item\.client_platform\)\}/],
    [read('apps/ios/PaperBanana/Models/JobModels.swift'), /JobMetadataItem\(label: "任务来源", value: clientPlatformDisplayName\)/],
    [read('apps/ios/PaperBanana/Features/Records/RecordsView.swift'), /"任务来源：\\\(job\.clientPlatformDisplayName\)"/],
    [read('apps/windows/MainWindow.xaml.cs'), /_currentJob\.ClientPlatformDisplayName/],
    [read('apps/windows/MainWindow.xaml'), /\{Binding ClientPlatformDisplayText\}/],
    [read('apps/macos/Sources/PaperBananaMac/Views/JobDetailView.swift'), /detailRow\("任务来源", job\.clientPlatformDisplayName\)/],
    [read('apps/macos/Sources/PaperBananaMac/Views/RecordsListView.swift'), /"任务来源：\\\(job\.clientPlatformDisplayName\)"/],
    [read('apps/harmony/Stage/src/main/ets/pages/Index.ets'), /任务来源：\$\{formatClientPlatform\(job\.client_platform\)\}/],
  ];
  for (const [source, contract] of surfaces) assert.match(source, contract);
});
