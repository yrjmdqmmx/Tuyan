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

function laneResolution(lane: BenchmarkLane | '1K' | '2K' | 'provider-default') {
  if (lane === 'provider-default') return ''
  if (lane.startsWith('1K')) return '1K'
  if (lane.startsWith('2K')) return '2K'
  return '4K'
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
    async edit(input: {
      provider: BenchProvider
      model: string
      apiKey: string
      prompt: string
      aspectRatio: '16:9'
      sourceImage: string
      imageSize: '1K' | '2K' | 'provider-default'
    }) {
      return callImageModel(
        input.provider,
        input.model,
        input.apiKey,
        input.prompt,
        input.aspectRatio,
        input.sourceImage,
        laneResolution(input.imageSize),
        input.imageSize !== 'provider-default',
      )
    },
  })
}
