import sharp from 'sharp'

const scientificBenchmarkRasterLoaders = [
  'VipsForeignLoadPngBuffer',
  'VipsForeignLoadJpegBuffer',
  'VipsForeignLoadWebpBuffer',
]

export function enableScientificBenchmarkRasterDecoders() {
  sharp.unblock({ operation: scientificBenchmarkRasterLoaders })
}
