'use client'

import { AiWidget } from './ai-widget'

interface AiWidgetGateProps {
  plan: string
}

export function AiWidgetGate({ plan }: AiWidgetGateProps) {
  if (plan !== 'agenzia' && plan !== 'network') return null
  return <AiWidget />
}
