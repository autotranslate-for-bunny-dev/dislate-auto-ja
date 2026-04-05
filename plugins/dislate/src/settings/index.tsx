import { getAssetIDByName } from "@vendetta/ui/assets"
import { React, ReactNative, stylesheet, constants, NavigationNative, url } from "@vendetta/metro/common"
import { semanticColors } from "@vendetta/ui"
import { Forms } from "@vendetta/ui/components"
import { manifest } from "@vendetta/plugin"
import { useProxy } from "@vendetta/storage"

import { settings } from ".."
import { debugLogStore } from "../debugLogs"
import DebugLogs from "./DebugLogs"
import TargetLang from "./TargetLang"
import TranslatorPage from "./TranslatorPage"

const { ScrollView, Text } = ReactNative
const { FormRow, FormSwitchRow } = Forms

const styles = stylesheet.createThemedStyleSheet({
    subheaderText: {
        color: semanticColors.HEADER_SECONDARY,
        textAlign: 'center',
        margin: 10,
        marginBottom: 50,
        letterSpacing: 0.25,
        fontFamily: constants.Fonts.PRIMARY_BOLD,
        fontSize: 14
    }
})

export default () => {
    const navigation = NavigationNative.useNavigation()
    useProxy(settings)
    useProxy(debugLogStore)

    return (
        <ScrollView>
            <FormSwitchRow
                label={"自動翻訳 (Auto Translate)"}
                subLabel={"日本語以外のメッセージを自動的に翻訳します"}
                leading={<FormRow.Icon source={getAssetIDByName("ic_locale_24px")} />}
                value={settings.auto_translate_enabled ?? true}
                onValueChange={(v) => {
                    settings.auto_translate_enabled = v
                }}
            />

            <FormSwitchRow
                label={"Immersive Translation"}
                subLabel={"原文と翻訳の両方を表示します"}
                leading={<FormRow.Icon source={getAssetIDByName("ic_chat_bubble_filled_24px")} />}
                value={settings.immersive_enabled ?? true}
                onValueChange={(v) => {
                    settings.immersive_enabled = v
                }}
            />

            <FormRow
                label={"翻訳先の言語 (Translate to)"}
                subLabel={settings.target_lang?.toLowerCase()}
                leading={<FormRow.Icon source={getAssetIDByName("ic_activity_24px")} />}
                trailing={() => <FormRow.Arrow />}
                onPress={() => navigation.push("VendettaCustomPage", {
                    title: "Translate to",
                    render: TargetLang,
                })}
            />
            <FormRow
                label={"翻訳エンジン (Translator)"}
                subLabel={settings.translator ? "Google Translate" : "DeepL"}
                leading={<FormRow.Icon source={getAssetIDByName("ic_locale_24px")} />}
                trailing={() => <FormRow.Arrow />}
                onPress={() => navigation.push("VendettaCustomPage", {
                    title: "Translator",
                    render: TranslatorPage,
                })}
            />
            <FormRow
                label={"Debug Logs"}
                subLabel={`${debugLogStore.entries.length} entries in current session`}
                leading={<FormRow.Icon source={getAssetIDByName("ic_activity_24px")} />}
                trailing={() => <FormRow.Arrow />}
                onPress={() => navigation.push("VendettaCustomPage", {
                    title: "Debug Logs",
                    render: DebugLogs,
                })}
            />

            <Text style={styles.subheaderText} onPress={() => url.openURL("https://github.com/Rico040/bunny-plugins")}>
                {`Dislate Auto-JA | Build: (${manifest.hash.substring(0, 7)})`}
            </Text>
        </ScrollView>
    )
}
