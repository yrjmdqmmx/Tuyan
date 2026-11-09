import { useState } from 'react'
import { CircleHelp, Network } from 'lucide-react'
import logos from '../data/model-brand-logos.json'

const channelAliases = { kimi: 'moonshot', gemini: 'google', xai: 'spacexai' }

export function ModelBrandLogo({ brand, channel = false }) {
  const key = channel ? channelAliases[brand] || brand : brand
  const src = logos[key]?.src
  const [failedSource, setFailedSource] = useState(null)
  if (!src || failedSource === src) {
    const Icon = brand === 'custom' ? Network : CircleHelp
    return <Icon className="model-brand-logo model-brand-placeholder" size={24} aria-hidden="true" />
  }
  return <img className="model-brand-logo" src={src} alt="" width="24" height="24" decoding="async" onError={() => setFailedSource(src)} />
}
