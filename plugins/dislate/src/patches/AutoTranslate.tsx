import { findByStoreName } from "@vendetta/metro"
import { FluxDispatcher } from "@vendetta/metro/common"
import { logger } from "@vendetta"
import { settings } from ".."
import { DeepL, GTranslate } from "../api"
import { shouldTranslate } from "../utils/detectJapanese"
import { protectSpecialSegments } from "../utils/protectedText"

const ChannelStore = findByStoreName("ChannelStore")
const UserStore = findByStoreName("UserStore")

/**
 * 翻訳済みメッセージのキャッシュ
 * key: messageId, value: { original: string, translated: string }
 */
const translationCache = new Map<string, { original: string; translated: string }>()

// 翻訳中のメッセージIDを追跡（重複翻訳を防ぐ）
const pendingTranslations = new Set<string>()

// キャッシュサイズの上限
const MAX_CACHE_SIZE = 500

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

async function translateMessage(messageId: string, channelId: string, content: string) {
    if (pendingTranslations.has(messageId)) return
    if (translationCache.has(messageId)) return
    if (!isGuildChannel(channelId)) return

    pendingTranslations.add(messageId)

    try {
        const target_lang = settings.target_lang ?? "ja"
        const protectedText = protectSpecialSegments(content)

        let result
        switch (settings.translator) {
            case 0:
                result = await DeepL.translate(protectedText.text, undefined, target_lang)
                break
            case 1:
            default:
                result = await GTranslate.translate(protectedText.text, undefined, target_lang)
                break
        }

        const translatedText = protectedText.restore(result.text).trim()

        // 翻訳結果が元とほぼ同じなら表示しない
        if (translatedText.toLowerCase() === content.trim().toLowerCase()) {
            return
        }

        // キャッシュに保存
        translationCache.set(messageId, {
            original: content,
            translated: translatedText
        })
        cleanCache()

        // immersive モード: 原文 + 翻訳 / 翻訳のみ
        const isImmersive = settings.immersive_enabled ?? true
        const finalContent = isImmersive
            ? `${content}\n\n🌐 ${translatedText}`
            : translatedText

        const guildId = ChannelStore.getChannel(channelId)?.guild_id

        FluxDispatcher.dispatch({
            type: "MESSAGE_UPDATE",
            message: {
                id: messageId,
                channel_id: channelId,
                guild_id: guildId,
                content: finalContent,
            },
            log_edit: false,
            otherPluginBypass: true
        })
    } catch (e) {
        logger.error(`[Dislate Auto] Failed to translate message ${messageId}:`, e)
    } finally {
        pendingTranslations.delete(messageId)
    }
}

function handleMessageCreate(event: any) {
    if (!settings.auto_translate_enabled) return

    const message = event.message
    if (!message?.content || !message?.id || !message?.channel_id) return
    if (!isGuildChannel(message.channel_id)) return

    // 自分のメッセージは翻訳しない
    try {
        const currentUser = UserStore.getCurrentUser()
        if (currentUser && message.author?.id === currentUser.id) return
    } catch {}

    // Botのメッセージもスキップ（オプション）
    if (message.author?.bot) return

    const threshold = settings.auto_translate_threshold ?? 0.3

    if (shouldTranslate(message.content, threshold)) {
        // 少し遅延させてメッセージが確実に表示されてから翻訳
        setTimeout(() => {
            translateMessage(message.id, message.channel_id, message.content)
        }, 300)
    }
}

function handleMessageUpdate(event: any) {
    // otherPluginBypass が true の場合は自分自身の更新なのでスキップ
    if (event.otherPluginBypass) return
    if (!settings.auto_translate_enabled) return

    const message = event.message
    if (!message?.content || !message?.id || !message?.channel_id) return
    if (!isGuildChannel(message.channel_id)) return

    // 自分のメッセージは翻訳しない
    try {
        const currentUser = UserStore.getCurrentUser()
        if (currentUser && message.author?.id === currentUser.id) return
    } catch {}

    // 編集されたメッセージのキャッシュをクリアして再翻訳
    translationCache.delete(message.id)

    const threshold = settings.auto_translate_threshold ?? 0.3

    if (shouldTranslate(message.content, threshold)) {
        setTimeout(() => {
            translateMessage(message.id, message.channel_id, message.content)
        }, 500)
    }
}

export default () => {
    FluxDispatcher.subscribe("MESSAGE_CREATE", handleMessageCreate)
    FluxDispatcher.subscribe("MESSAGE_UPDATE", handleMessageUpdate)

    // アンパッチ関数を返す
    return () => {
        FluxDispatcher.unsubscribe("MESSAGE_CREATE", handleMessageCreate)
        FluxDispatcher.unsubscribe("MESSAGE_UPDATE", handleMessageUpdate)
        translationCache.clear()
        pendingTranslations.clear()
    }
}
