import { findByStoreName } from "@vendetta/metro"
import { FluxDispatcher } from "@vendetta/metro/common"
import { logger } from "@vendetta"
import { settings } from ".."
import { DeepL, GTranslate } from "../api"
import { pushLog } from "../debugLogs"
import { getJapaneseRatio, shouldTranslate } from "../utils/detectJapanese"
import { protectSpecialSegments } from "../utils/protectedText"

const ChannelStore = findByStoreName("ChannelStore")
const MessageStore = findByStoreName("MessageStore")
const UserStore = findByStoreName("UserStore")

type AutoTranslateTrigger = "MESSAGE_CREATE" | "MESSAGE_UPDATE"

type AutoTranslateJob = {
    key: string
    trigger: AutoTranslateTrigger
    channelId: string
    messageId: string
    fallbackMessage: any
    queuedAt: number
}

/**
 * 翻訳済みメッセージのキャッシュ
 * key: messageId, value: { original: string, translated: string }
 */
const translationCache = new Map<string, { original: string; translated: string }>()
const queuedJobs = new Map<string, AutoTranslateJob>()
const jobOrder: string[] = []

// キャッシュサイズの上限
const MAX_CACHE_SIZE = 500
const STORE_RETRY_DELAYS = [120, 240, 480]

let isProcessingQueue = false

function cleanCache() {
    if (translationCache.size > MAX_CACHE_SIZE) {
        const keysToDelete = Array.from(translationCache.keys()).slice(0, 100)
        for (const key of keysToDelete) {
            translationCache.delete(key)
        }
    }
}

function isGuildChannel(channelId: string) {
    return Boolean(ChannelStore.getChannel(channelId)?.guild_id)
}

function wait(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms))
}

function getJobKey(channelId: string, messageId: string) {
    return `${channelId}:${messageId}`
}

function getErrorMessage(error: unknown) {
    if (error instanceof Error) return error.message
    return String(error)
}

function normalizeMessage(message: any, channelId: string, messageId: string) {
    return {
        id: message?.id ?? messageId,
        channel_id: message?.channel_id ?? channelId,
        guild_id: message?.guild_id ?? ChannelStore.getChannel(channelId)?.guild_id,
        content: message?.content,
        author: message?.author
    }
}

function getCurrentUserId() {
    try {
        return UserStore.getCurrentUser()?.id
    } catch {
        return undefined
    }
}

async function resolveLatestMessage(job: AutoTranslateJob) {
    for (let index = 0; index <= STORE_RETRY_DELAYS.length; index++) {
        const storedMessage = normalizeMessage(
            MessageStore.getMessage(job.channelId, job.messageId),
            job.channelId,
            job.messageId
        )

        if (storedMessage.content?.trim()) {
            if (index > 0) {
                pushLog("info", "store.retry_success", "Resolved message from MessageStore after retry", {
                    trigger: job.trigger,
                    messageId: job.messageId,
                    channelId: job.channelId,
                    attempt: index + 1
                })
            }

            return storedMessage
        }

        if (index < STORE_RETRY_DELAYS.length) {
            pushLog(index === 0 ? "warn" : "info", index === 0 ? "store.miss" : "store.retry", "Waiting for MessageStore to expose the latest message content", {
                trigger: job.trigger,
                messageId: job.messageId,
                channelId: job.channelId,
                attempt: index + 1,
                retryDelayMs: STORE_RETRY_DELAYS[index]
            })
            await wait(STORE_RETRY_DELAYS[index])
        }
    }

    const fallbackMessage = normalizeMessage(job.fallbackMessage, job.channelId, job.messageId)
    if (fallbackMessage.content?.trim()) {
        pushLog("warn", "store.fallback", "Using event payload after MessageStore retries were exhausted", {
            trigger: job.trigger,
            messageId: job.messageId,
            channelId: job.channelId
        })
        return fallbackMessage
    }

    pushLog("error", "store.exhausted", "Unable to resolve message content for auto translation", {
        trigger: job.trigger,
        messageId: job.messageId,
        channelId: job.channelId
    })

    return null
}

function shouldSkipResolvedMessage(job: AutoTranslateJob, message: any) {
    if (!message?.content?.trim()) {
        pushLog("warn", "auto.skip_missing_content", "Skipped message because there is no content to translate", {
            trigger: job.trigger,
            messageId: job.messageId,
            channelId: job.channelId
        })
        return true
    }

    const currentUserId = getCurrentUserId()
    if (currentUserId && message.author?.id === currentUserId) {
        pushLog("info", "auto.skip_self", "Skipped own message", {
            trigger: job.trigger,
            messageId: job.messageId,
            channelId: job.channelId
        })
        return true
    }

    if (message.author?.bot) {
        pushLog("info", "auto.skip_bot", "Skipped bot message", {
            trigger: job.trigger,
            messageId: job.messageId,
            channelId: job.channelId
        })
        return true
    }

    const threshold = settings.auto_translate_threshold ?? 0.3
    if (!shouldTranslate(message.content, threshold)) {
        pushLog("info", "auto.skip_threshold", "Skipped message because it did not meet auto-translate rules", {
            trigger: job.trigger,
            messageId: job.messageId,
            channelId: job.channelId,
            threshold,
            japaneseRatio: Number(getJapaneseRatio(message.content).toFixed(3)),
            contentLength: message.content.length
        })
        return true
    }

    return false
}

async function translateResolvedMessage(job: AutoTranslateJob, message: any) {
    if (!settings.auto_translate_enabled) {
        pushLog("info", "auto.skip_disabled", "Auto translate was disabled before the queued job ran", {
            trigger: job.trigger,
            messageId: job.messageId,
            channelId: job.channelId
        })
        return
    }

    if (!isGuildChannel(message.channel_id)) {
        pushLog("info", "auto.skip_dm", "Skipped non-guild message during processing", {
            trigger: job.trigger,
            messageId: job.messageId,
            channelId: job.channelId
        })
        return
    }

    if (shouldSkipResolvedMessage(job, message)) return

    const cachedTranslation = translationCache.get(message.id)
    if (cachedTranslation?.original === message.content) {
        pushLog("info", "cache.hit", "Skipped message because the same content was already translated", {
            trigger: job.trigger,
            messageId: job.messageId,
            channelId: job.channelId
        })
        return
    }

    if (cachedTranslation && cachedTranslation.original !== message.content) {
        translationCache.delete(message.id)
        pushLog("info", "cache.invalidate", "Cleared stale cached translation because message content changed", {
            trigger: job.trigger,
            messageId: job.messageId,
            channelId: job.channelId
        })
    }

    const targetLang = settings.target_lang ?? "ja"
    const protectedText = protectSpecialSegments(message.content)
    const translatorName = settings.translator === 0 ? "DeepL" : "Google Translate"

    try {
        pushLog("info", "api.start", "Starting auto translation request", {
            trigger: job.trigger,
            messageId: job.messageId,
            channelId: job.channelId,
            translator: translatorName,
            targetLang
        })

        let result
        switch (settings.translator) {
            case 0:
                result = await DeepL.translate(protectedText.text, undefined, targetLang)
                break
            case 1:
            default:
                result = await GTranslate.translate(protectedText.text, undefined, targetLang)
                break
        }

        const translatedText = protectedText.restore(result.text).trim()

        pushLog("info", "api.success", "Auto translation request completed", {
            trigger: job.trigger,
            messageId: job.messageId,
            channelId: job.channelId,
            translator: translatorName,
            translatedLength: translatedText.length
        })

        // 翻訳結果が元とほぼ同じなら表示しない
        if (translatedText.toLowerCase() === message.content.trim().toLowerCase()) {
            pushLog("info", "translation.same", "Skipped update because translated text matched the original content", {
                trigger: job.trigger,
                messageId: job.messageId,
                channelId: job.channelId
            })
            return
        }

        // キャッシュに保存
        translationCache.set(message.id, {
            original: message.content,
            translated: translatedText
        })
        cleanCache()

        // immersive モード: 原文 + 翻訳 / 翻訳のみ
        const isImmersive = settings.immersive_enabled ?? true
        const finalContent = isImmersive
            ? `${message.content}\n\n🌐 ${translatedText}`
            : translatedText

        const guildId = ChannelStore.getChannel(message.channel_id)?.guild_id

        FluxDispatcher.dispatch({
            type: "MESSAGE_UPDATE",
            message: {
                id: message.id,
                channel_id: message.channel_id,
                guild_id: guildId,
                content: finalContent,
            },
            log_edit: false,
            otherPluginBypass: true
        })

        pushLog("info", "dispatch.update", "Dispatched translated message update", {
            trigger: job.trigger,
            messageId: job.messageId,
            channelId: job.channelId,
            immersive: isImmersive
        })
    } catch (e) {
        pushLog("error", "api.failure", "Auto translation failed", {
            trigger: job.trigger,
            messageId: job.messageId,
            channelId: job.channelId,
            translator: translatorName,
            error: getErrorMessage(e)
        })
        logger.error(`[Dislate Auto] Failed to translate message ${job.messageId}:`, e)
    }
}

async function processJob(job: AutoTranslateJob) {
    pushLog("info", "queue.process", "Processing auto-translate job", {
        trigger: job.trigger,
        messageId: job.messageId,
        channelId: job.channelId,
        queuedAt: job.queuedAt
    })

    const latestMessage = await resolveLatestMessage(job)
    if (!latestMessage) return

    await translateResolvedMessage(job, latestMessage)
}

async function processQueue() {
    if (isProcessingQueue) return

    isProcessingQueue = true
    pushLog("info", "queue.start", "Auto-translate worker activated", {
        pendingJobs: jobOrder.length
    })

    try {
        while (jobOrder.length) {
            const nextKey = jobOrder.shift()
            if (!nextKey) continue

            const job = queuedJobs.get(nextKey)
            queuedJobs.delete(nextKey)

            if (!job) continue
            await processJob(job)
        }
    } finally {
        isProcessingQueue = false
        pushLog("info", "queue.idle", "Auto-translate worker is idle", {
            pendingJobs: jobOrder.length
        })

        if (jobOrder.length) void processQueue()
    }
}

function enqueueJob(trigger: AutoTranslateTrigger, message: any) {
    const key = getJobKey(message.channel_id, message.id)
    const hadExistingJob = queuedJobs.has(key)

    queuedJobs.set(key, {
        key,
        trigger,
        channelId: message.channel_id,
        messageId: message.id,
        fallbackMessage: message,
        queuedAt: Date.now()
    })

    const existingIndex = jobOrder.indexOf(key)
    if (existingIndex !== -1) jobOrder.splice(existingIndex, 1)
    jobOrder.unshift(key)

    pushLog("info", hadExistingJob ? "queue.refresh" : "queue.enqueue", hadExistingJob ? "Updated an existing pending auto-translate job" : "Queued auto-translate job", {
        trigger,
        messageId: message.id,
        channelId: message.channel_id,
        pendingJobs: jobOrder.length
    })

    void processQueue()
}

function handleMessageEvent(trigger: AutoTranslateTrigger, event: any) {
    if (!settings.auto_translate_enabled) return

    const message = event.message
    if (!message?.id || !message?.channel_id) {
        pushLog("warn", "event.invalid", "Received auto-translate event without message id or channel id", {
            trigger,
            hasMessage: Boolean(message),
            otherPluginBypass: Boolean(event.otherPluginBypass)
        })
        return
    }

    pushLog("info", "event.received", "Received auto-translate event", {
        trigger,
        messageId: message.id,
        channelId: message.channel_id,
        hasContent: Boolean(message.content),
        otherPluginBypass: Boolean(event.otherPluginBypass)
    })

    if (trigger === "MESSAGE_UPDATE" && event.otherPluginBypass) {
        pushLog("info", "event.self_update_skip", "Skipped plugin-generated message update", {
            messageId: message.id,
            channelId: message.channel_id
        })
        return
    }

    if (!isGuildChannel(message.channel_id)) {
        pushLog("info", "event.dm_skip", "Skipped non-guild message event", {
            trigger,
            messageId: message.id,
            channelId: message.channel_id
        })
        return
    }

    if (trigger === "MESSAGE_UPDATE") {
        translationCache.delete(message.id)
        pushLog("info", "cache.clear", "Cleared cached translation because the message was updated", {
            messageId: message.id,
            channelId: message.channel_id
        })
    }

    enqueueJob(trigger, message)
}

function handleMessageCreate(event: any) {
    handleMessageEvent("MESSAGE_CREATE", event)
}

function handleMessageUpdate(event: any) {
    handleMessageEvent("MESSAGE_UPDATE", event)
}

export default () => {
    pushLog("info", "subscription.start", "Auto-translate subscriptions attached")
    FluxDispatcher.subscribe("MESSAGE_CREATE", handleMessageCreate)
    FluxDispatcher.subscribe("MESSAGE_UPDATE", handleMessageUpdate)

    // アンパッチ関数を返す
    return () => {
        FluxDispatcher.unsubscribe("MESSAGE_CREATE", handleMessageCreate)
        FluxDispatcher.unsubscribe("MESSAGE_UPDATE", handleMessageUpdate)
        translationCache.clear()
        queuedJobs.clear()
        jobOrder.splice(0, jobOrder.length)
        isProcessingQueue = false
        pushLog("info", "subscription.stop", "Auto-translate subscriptions removed")
    }
}
