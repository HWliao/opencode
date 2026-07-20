import * as Locale from "@/util/locale"
import type { SessionMessages } from "./session.shared"
import type { RunProvider, StreamCommit } from "./types"

export function turnSummaryCommit(input: {
  agent: string
  model: string
  variant?: string
  duration: string
  messageID?: string
}): StreamCommit {
  const metadata = [input.model, input.variant, input.duration].filter(Boolean).join(" · ")
  return {
    kind: "system",
    text: `▣ ${input.agent} · ${metadata}`,
    phase: "final",
    source: "system",
    summary: {
      agent: input.agent,
      model: input.model,
      ...(input.variant ? { variant: input.variant } : {}),
      duration: input.duration,
    },
    messageID: input.messageID,
  }
}

export function messageTurnSummaryCommit(
  message: SessionMessages[number],
  providers?: RunProvider[],
): StreamCommit | undefined {
  const info = message.info
  if (info.role !== "assistant") {
    return
  }

  const completed = info.time.completed
  if (typeof completed !== "number" || completed <= info.time.created) {
    return
  }

  const model = providers?.find((item) => item.id === info.providerID)?.models[info.modelID]?.name

  return turnSummaryCommit({
    agent: Locale.titlecase(info.agent),
    model: model ?? info.modelID,
    ...(info.variant && info.variant !== "default" ? { variant: info.variant } : {}),
    duration: Locale.duration(completed - info.time.created),
    messageID: info.id,
  })
}
