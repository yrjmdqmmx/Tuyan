export async function callImageModel() {
  const output = process.env.SCIENTIFIC_V2_DIST_TEST_IMAGE_BASE64
  if (!output) throw new Error('missing dist test image')
  return output
}
