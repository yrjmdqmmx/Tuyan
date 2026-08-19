import { describe, beforeAll, beforeEach, afterEach, afterAll, it, expect } from '@ohos/hypium';
import { formatClientPlatform } from '../../main/ets/utils/Format';
import { buildCreateJobPayload } from '../../main/ets/utils/Payload';

export default function localUnitTest() {
  describe('localUnitTest', () => {
    // Defines a test suite. Two parameters are supported: test suite name and test suite function.
    beforeAll(() => {
      // Presets an action, which is performed only once before all test cases of the test suite start.
      // This API supports only one parameter: preset action function.
    });
    beforeEach(() => {
      // Presets an action, which is performed before each unit test case starts.
      // The number of execution times is the same as the number of test cases defined by **it**.
      // This API supports only one parameter: preset action function.
    });
    afterEach(() => {
      // Presets a clear action, which is performed after each unit test case ends.
      // The number of execution times is the same as the number of test cases defined by **it**.
      // This API supports only one parameter: clear action function.
    });
    afterAll(() => {
      // Presets a clear action, which is performed after all test cases of the test suite end.
      // This API supports only one parameter: clear action function.
    });
    it('assertContain', 0, () => {
      // Defines a test case. This API supports three parameters: test case name, filter parameter, and test case function.
      let a = 'abc';
      let b = 'b';
      // Defines a variety of assertion methods, which are used to declare expected boolean conditions.
      expect(a).assertContain(b);
      expect(a).assertEqual(a);
    });
    it('usesFixedHarmonyPlatformAndFormatsMissingHistory', 0, () => {
      const payload = buildCreateJobPayload({
        configurationMode: 'simple', provider: 'bailian', apiKey: 'key', categoryId: 'method_framework',
        categoryLabel: '方法框架图', methodContent: 'method', caption: 'caption', outputFormat: 'png', imageSize: '1K',
        mainModelName: 'main', imageModelName: 'image', referenceVisionModelName: 'vision', referenceImageMode: 'vision_model',
        uploadedReferenceImages: [], pipelineMode: 'planner_critic', retrievalSetting: 'none', manualReferenceIds: [],
        aspectRatio: '16:9', numCandidates: 1, maxCriticRounds: 1,
      });
      expect(payload.clientPlatform).assertEqual('harmony');
      expect(formatClientPlatform('harmony')).assertEqual('HarmonyOS');
      expect(formatClientPlatform('')).assertEqual('未记录');
    });
  });
}
