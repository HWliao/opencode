import { FinishReason, isContextOverflow, LLMEvent, ProviderMetadata, ToolResultValue } from "@opencode-ai/llm"
import { Effect, Schema } from "effect"
import { type streamText } from "ai"
import { errorMessage } from "@/util/error"

type Result = Awaited<ReturnType<typeof streamText>>
type AISDKEvent = Result["fullStream"] extends AsyncIterable<infer T> ? T : never

type EventContext = {
  readonly sessionID: string
  readonly providerID: string
  readonly modelID: string
  readonly small: boolean
  readonly agent: string
  readonly mode: string
}

type RawChunkSummary = {
  readonly type?: string
  readonly responseID?: string
  readonly incompleteReason?: string
  readonly errorCode?: string
  readonly errorMessage?: string
  readonly hasUsage?: boolean
  readonly usageKeys?: string[]
  readonly keys?: string[]
}

export function adapterState() {
  return {
    step: 0,
    text: 0,
    reasoning: 0,
    currentTextID: undefined as string | undefined,
    currentReasoningID: undefined as string | undefined,
    toolNames: {} as Record<string, string>,
    copilotTotalNanoAiu: undefined as number | undefined,
    lastRawChunk: undefined as RawChunkSummary | undefined,
  }
}

function finishReason(value: string | undefined): FinishReason {
  return Schema.is(FinishReason)(value) ? value : "unknown"
}

function providerMetadata(value: unknown): ProviderMetadata | undefined {
  if (value == null) return undefined
  return Schema.is(ProviderMetadata)(value) ? value : undefined
}

function providerMetadataSummary(value: unknown) {
  if (!value || typeof value !== "object") return undefined
  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => [
      key,
      item && typeof item === "object" ? Object.keys(item as Record<string, unknown>) : typeof item,
    ]),
  )
}

function rawFinishReason(event: AISDKEvent) {
  if (!("rawFinishReason" in event)) return undefined
  return event.rawFinishReason === undefined || event.rawFinishReason === null ? undefined : String(event.rawFinishReason)
}

function stringField(value: unknown) {
  return typeof value === "string" ? value.slice(0, 500) : undefined
}

function rawChunkSummary(value: unknown): RawChunkSummary | undefined {
  if (!value || typeof value !== "object") return undefined
  const raw = value as Record<string, unknown>
  const response = raw.response && typeof raw.response === "object" ? (raw.response as Record<string, unknown>) : undefined
  const incomplete =
    response?.incomplete_details && typeof response.incomplete_details === "object"
      ? (response.incomplete_details as Record<string, unknown>)
      : undefined
  const error = response?.error && typeof response.error === "object" ? (response.error as Record<string, unknown>) : undefined
  const usage = response?.usage && typeof response.usage === "object" ? (response.usage as Record<string, unknown>) : undefined
  const type = stringField(raw.type)
  const summary = {
    type,
    responseID: stringField(response?.id),
    incompleteReason: stringField(incomplete?.reason),
    errorCode: stringField(raw.code) ?? stringField(error?.code),
    errorMessage: stringField(raw.message) ?? stringField(error?.message),
    hasUsage: response ? response.usage !== undefined && response.usage !== null : undefined,
    usageKeys: usage ? Object.keys(usage) : undefined,
    keys: Object.keys(raw),
  }
  if (
    summary.incompleteReason === undefined &&
    summary.errorCode === undefined &&
    summary.errorMessage === undefined &&
    !(type?.startsWith("response."))
  ) {
    return undefined
  }
  return summary
}

function rawProviderError(summary: RawChunkSummary | undefined) {
  if (!summary || (summary.type !== "error" && summary.type !== "response.failed")) return undefined
  const message =
    summary.errorCode && summary.errorMessage
      ? `${summary.errorCode}: ${summary.errorMessage}`
      : (summary.errorMessage ?? summary.errorCode ?? "Provider stream error")
  return LLMEvent.providerError({
    message,
    classification:
      summary.errorCode === "context_too_large" ||
      summary.errorCode === "context_length_exceeded" ||
      isContextOverflow(message)
        ? "context-overflow"
        : undefined,
  })
}

// Temporary AI SDK bridge: Copilot billing survives only in raw provider chunks here.
// Move this extraction into @opencode-ai/llm when Copilot is handled by the native runtime.
function copilotTotalNanoAiu(value: unknown) {
  if (!value || typeof value !== "object") return
  const raw = value as Record<string, unknown>
  const response =
    raw.response && typeof raw.response === "object" ? (raw.response as Record<string, unknown>) : undefined
  const usage = raw.copilot_usage ?? response?.copilot_usage
  if (!usage || typeof usage !== "object") return
  const total = (usage as Record<string, unknown>).total_nano_aiu
  if (typeof total !== "number" || !Number.isFinite(total) || total < 0) return
  return total
}

function usage(value: unknown) {
  if (!value || typeof value !== "object") return undefined
  const item = value as {
    inputTokens?: number
    outputTokens?: number
    totalTokens?: number
    reasoningTokens?: number
    cachedInputTokens?: number
    inputTokenDetails?: { cacheReadTokens?: number; cacheWriteTokens?: number }
    outputTokenDetails?: { reasoningTokens?: number }
  }
  const entries = Object.entries({
    inputTokens: item.inputTokens,
    outputTokens: item.outputTokens,
    totalTokens: item.totalTokens,
    reasoningTokens: item.outputTokenDetails?.reasoningTokens ?? item.reasoningTokens,
    cacheReadInputTokens: item.inputTokenDetails?.cacheReadTokens ?? item.cachedInputTokens,
    cacheWriteInputTokens: item.inputTokenDetails?.cacheWriteTokens,
  }).filter((entry) => entry[1] !== undefined)
  return entries.length === 0 ? undefined : Object.fromEntries(entries)
}

function currentTextID(state: ReturnType<typeof adapterState>, id: string | undefined) {
  state.currentTextID = id ?? state.currentTextID ?? `text-${state.text++}`
  return state.currentTextID
}

function currentReasoningID(state: ReturnType<typeof adapterState>, id: string | undefined) {
  state.currentReasoningID = id ?? state.currentReasoningID ?? `reasoning-${state.reasoning++}`
  return state.currentReasoningID
}

export function toLLMEvents(
  state: ReturnType<typeof adapterState>,
  event: AISDKEvent,
  ctx?: EventContext,
): Effect.Effect<ReadonlyArray<LLMEvent>, unknown> {
  switch (event.type) {
    case "start":
      return Effect.succeed([])

    case "start-step":
      return Effect.succeed([LLMEvent.stepStart({ index: state.step })])

    case "finish-step":
      return Effect.gen(function* () {
        const original = providerMetadata(event.providerMetadata)
        const metadata =
          state.copilotTotalNanoAiu === undefined
            ? original
            : {
                ...original,
                copilot: {
                  ...original?.copilot,
                  totalNanoAiu: state.copilotTotalNanoAiu,
                },
              }
        state.copilotTotalNanoAiu = undefined
        const reason = finishReason(event.finishReason)
        const stepUsage = usage(event.usage)
        if (reason === "unknown" && ctx) {
          yield* Effect.logWarning("AI SDK finish-step had unknown finish reason", {
            ...ctx,
            finishReason: event.finishReason ?? "<undefined>",
            rawFinishReason: rawFinishReason(event) ?? "<undefined>",
            usage: stepUsage,
            providerMetadata: providerMetadataSummary(event.providerMetadata),
            lastRawChunk: state.lastRawChunk,
          })
        }
        return [
          LLMEvent.stepFinish({
            index: state.step++,
            reason,
            usage: stepUsage,
            providerMetadata: metadata,
          }),
        ]
      })

    case "finish":
      return Effect.sync(() => {
        const events = [
          LLMEvent.finish({
            reason: finishReason(event.finishReason),
            usage: usage(event.totalUsage),
            providerMetadata: "providerMetadata" in event ? providerMetadata(event.providerMetadata) : undefined,
          }),
        ]
        // Reset so the adapter can be reused for a follow-up stream without leaking
        // counters or block IDs. adapterState() is the single source of truth for shape.
        Object.assign(state, adapterState())
        return events
      })

    case "text-start":
      return Effect.sync(() => {
        state.currentTextID = currentTextID(state, event.id)
        return [
          LLMEvent.textStart({
            id: state.currentTextID,
            providerMetadata: providerMetadata(event.providerMetadata),
          }),
        ]
      })

    case "text-delta":
      return Effect.succeed([
        LLMEvent.textDelta({
          id: currentTextID(state, event.id),
          text: event.text,
          providerMetadata: providerMetadata(event.providerMetadata),
        }),
      ])

    case "text-end":
      return Effect.sync(() => {
        const id = currentTextID(state, event.id)
        state.currentTextID = undefined
        return [
          LLMEvent.textEnd({
            id,
            providerMetadata: providerMetadata(event.providerMetadata),
          }),
        ]
      })

    case "reasoning-start":
      return Effect.sync(() => {
        state.currentReasoningID = currentReasoningID(state, event.id)
        return [
          LLMEvent.reasoningStart({
            id: state.currentReasoningID,
            providerMetadata: providerMetadata(event.providerMetadata),
          }),
        ]
      })

    case "reasoning-delta":
      return Effect.succeed([
        LLMEvent.reasoningDelta({
          id: currentReasoningID(state, event.id),
          text: event.text,
          providerMetadata: providerMetadata(event.providerMetadata),
        }),
      ])

    case "reasoning-end":
      return Effect.sync(() => {
        const id = currentReasoningID(state, event.id)
        state.currentReasoningID = undefined
        return [
          LLMEvent.reasoningEnd({
            id,
            providerMetadata: providerMetadata(event.providerMetadata),
          }),
        ]
      })

    case "tool-input-start":
      return Effect.sync(() => {
        state.toolNames[event.id] = event.toolName
        return [
          LLMEvent.toolInputStart({
            id: event.id,
            name: event.toolName,
            providerMetadata: providerMetadata(event.providerMetadata),
          }),
        ]
      })

    case "tool-input-delta":
      return Effect.succeed([
        LLMEvent.toolInputDelta({
          id: event.id,
          name: state.toolNames[event.id] ?? "unknown",
          text: event.delta ?? "",
        }),
      ])

    case "tool-input-end":
      return Effect.succeed([
        LLMEvent.toolInputEnd({
          id: event.id,
          name: state.toolNames[event.id] ?? "unknown",
          providerMetadata: providerMetadata(event.providerMetadata),
        }),
      ])

    case "tool-call":
      return Effect.sync(() => {
        state.toolNames[event.toolCallId] = event.toolName
        return [
          LLMEvent.toolCall({
            id: event.toolCallId,
            name: event.toolName,
            input: event.input,
            providerExecuted: "providerExecuted" in event ? event.providerExecuted : undefined,
            providerMetadata: providerMetadata(event.providerMetadata),
          }),
        ]
      })

    case "tool-result":
      return Effect.sync(() => {
        const name = state.toolNames[event.toolCallId] ?? "unknown"
        delete state.toolNames[event.toolCallId]
        return [
          LLMEvent.toolResult({
            id: event.toolCallId,
            name,
            result: ToolResultValue.make(event.output),
            providerExecuted: "providerExecuted" in event ? event.providerExecuted : undefined,
            providerMetadata: providerMetadata(event.providerMetadata),
          }),
        ]
      })

    case "tool-error":
      return Effect.sync(() => {
        const name = state.toolNames[event.toolCallId] ?? ("toolName" in event ? event.toolName : "unknown")
        delete state.toolNames[event.toolCallId]
        return [
          LLMEvent.toolError({
            id: event.toolCallId,
            name,
            message: errorMessage(event.error),
            error: event.error,
            providerMetadata: providerMetadata(event.providerMetadata),
          }),
        ]
      })

    case "error":
      return Effect.fail(event.error)

    case "abort":
    case "source":
    case "file":
    case "tool-output-denied":
    case "tool-approval-request":
      return Effect.succeed([])

    case "raw":
      return Effect.sync(() => {
        state.copilotTotalNanoAiu = copilotTotalNanoAiu(event.rawValue) ?? state.copilotTotalNanoAiu
        const summary = rawChunkSummary(event.rawValue)
        state.lastRawChunk = summary ?? state.lastRawChunk
        const error = rawProviderError(summary)
        return error ? [error] : []
      })

    default: {
      const _exhaustive: never = event
      void _exhaustive
      return Effect.succeed([])
    }
  }
}

export * as LLMAISDK from "./ai-sdk"
