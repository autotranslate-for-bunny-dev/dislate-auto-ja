import { findByProps, findByStoreName } from "@vendetta/metro"
import { FluxDispatcher, React, ReactNative, i18n, stylesheet } from "@vendetta/metro/common"
import { before, after } from "@vendetta/patcher"
import { semanticColors } from "@vendetta/ui"
import { getAssetIDByName } from "@vendetta/ui/assets"
import { Forms } from "@vendetta/ui/components"
import { findInReactTree } from "@vendetta/utils"
import { settings } from ".."

import { DeepL, GTranslate } from "../api"
import { showToast } from "@vendetta/ui/toasts"
import { logger } from "@vendetta"
import { protectSpecialSegments } from "../utils/protectedText"

const LazyActionSheet = findByProps("openLazy", "hideActionSheet")
const ActionSheetRow = findByProps("ActionSheetRow")?.ActionSheetRow ?? Forms.FormRow // no icon if legacy
const MessageStore = findByStoreName("MessageStore")
const ChannelStore = findByStoreName("ChannelStore")
const separator = "\n"

const styles = stylesheet.createThemedStyleSheet({
    iconComponent: {
        width: 24,
        height: 24,
        tintColor: semanticColors.INTERACTIVE_NORMAL
    }
})

let cachedData: object[] = []

export default () => before("openLazy", LazyActionSheet, ([component, key, msg]) => {
    const message = msg?.message
    if (key !== "MessageLongPressActionSheet" || !message) return
    component.then(instance => {
        const unpatch = after("default", instance, (_, component) => {
            React.useEffect(() => () => { unpatch() }, [])

            // this thing is not backward compatible
            const buttons = findInReactTree(component, x => x?.[0]?.type?.name === "ActionSheetRow")
            if (!buttons) return
            const position = Math.max(buttons.findIndex((x: any) => x.props.message === i18n.Messages.MARK_UNREAD), 0)

            const originalMessage = MessageStore.getMessage(
                message.channel_id,
                message.id
            )
            if (!originalMessage?.content && !message.content) return

            const messageId = originalMessage?.id ?? message.id
            const messageContent = originalMessage?.content ?? message.content
            const existingCachedObject = cachedData.find((o: any) => Object.keys(o)[0] === messageId, "cache object")

            const translateType = existingCachedObject ? "Revert" : "Translate"
            const icon = translateType === "Translate" ? getAssetIDByName("LanguageIcon") : getAssetIDByName("ic_highlight")

            const translate = async () => {
                LazyActionSheet.hideActionSheet()
                try {
                    const target_lang = settings.target_lang
                    const isTranslated = translateType === "Translate"
                    const isImmersive = settings.immersive_enabled
                    
                    if (!originalMessage) return

                    const protectedText = protectSpecialSegments(messageContent)
                    var translate
                    switch(settings.translator) {
                        case 0:
                            console.log("Translating with DeepL: ", protectedText.text)
                            translate = await DeepL.translate(protectedText.text, undefined, target_lang, !isTranslated)
                            break
                        case 1:
                            console.log("Translating with GTranslate: ", protectedText.text)
                            translate = await GTranslate.translate(protectedText.text, undefined, target_lang, !isTranslated)
                            break
                    }
                    
                    const translatedText = protectedText.restore(translate.text).trim()

                    const finalContent = isTranslated
                                ? (isImmersive
                                    ? `${messageContent}${separator}${translatedText} \`[${target_lang?.toLowerCase()}]\``
                                    : `${translatedText} \`[${target_lang?.toLowerCase()}]\``)
                                : (existingCachedObject as object)[messageId]
                    FluxDispatcher.dispatch({
                        type: "MESSAGE_UPDATE",
                        message: {
                            id: messageId,
                            channel_id: originalMessage.channel_id,
                            guild_id: ChannelStore.getChannel(originalMessage.channel_id)?.guild_id,
                            content: finalContent,
                        },
                        log_edit: false,
                        otherPluginBypass: true // antied
                    })

                    isTranslated
                        ? cachedData.unshift({ [messageId]: messageContent })
                        : cachedData = cachedData.filter((e: any) => e !== existingCachedObject, "cached data override")
                } catch (e) {
                    showToast("Failed to translate message. Please check Debug Logs for more info.", getAssetIDByName("Small"))
                    logger.error(e)
                }
            }


            buttons.splice(position, 0, (
                <ActionSheetRow
                    label={`${translateType} Message`}
                    icon={
                        <ActionSheetRow.Icon
                            source={icon}
                            IconComponent={() => (
                                <ReactNative.Image
                                    resizeMode="cover"
                                    style={styles.iconComponent}
                                    source={icon}
                                />
                            )}
                        />
                    }
                    onPress={translate}
                />
            ))
        })
    })
})
