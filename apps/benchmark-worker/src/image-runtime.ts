import type { BenchmarkLane } from '@paperbanana/benchmark-core'

import type { BenchProvider } from './config.js'

type AuthoritativeImageCall = (
  provider: BenchProvider,
  model: string,
  apiKey: string,
  prompt: string,
  aspectRatio: string,
  sourceImage: string,
  imageSize: string,
  strictImageSize: boolean,
) => Promise<string>

function laneResolution(lane: BenchmarkLane | 'provider-default') {
  if (lane === 'provider-default') return ''
  return lane.slice(0, 2)
}

export function createSharedImageRuntime(callImageModel: AuthoritativeImageCall) {
  return Object.freeze({
    async generate(input: {
      provider: BenchProvider
      model: string
      apiKey: string
      prompt: string
      aspectRatio: string
      imageSize: BenchmarkLane | 'provider-default'
    }) {
      return callImageModel(
        input.provider,
        input.model,
        input.apiKey,
        input.prompt,
        input.aspectRatio,
        '',
        laneResolution(input.imageSize),
        input.imageSize !== 'provider-default',
      )
    },
  })
}
