import { getAssetIDByName } from "@vendetta/ui/assets"
import { React, ReactNative, stylesheet, constants, clipboard } from "@vendetta/metro/common"
import { semanticColors } from "@vendetta/ui"
import { Forms } from "@vendetta/ui/components"
import { showToast } from "@vendetta/ui/toasts"
import { useProxy } from "@vendetta/storage"
import { clearLogs, debugLogStore, getLogsText } from "../debugLogs"

const { ScrollView, Text, View } = ReactNative
const { FormRow } = Forms

const styles = stylesheet.createThemedStyleSheet({
    container: {
        paddingBottom: 24
    },
    logBox: {
        margin: 16,
        padding: 16,
        borderRadius: 16,
        backgroundColor: semanticColors.BACKGROUND_SECONDARY,
        borderWidth: 1,
        borderColor: semanticColors.BORDER_SUBTLE ?? semanticColors.BACKGROUND_TERTIARY
    },
    logText: {
        color: semanticColors.TEXT_NORMAL,
        fontFamily: constants.Fonts.CODE_NORMAL || constants.Fonts.PRIMARY_NORMAL,
        fontSize: 12,
        lineHeight: 18
    },
    emptyText: {
        color: semanticColors.TEXT_MUTED ?? semanticColors.HEADER_SECONDARY,
        fontSize: 14,
        lineHeight: 20
    }
})

export default () => {
    useProxy(debugLogStore)

    const hasLogs = debugLogStore.entries.length > 0
    const logText = getLogsText()

    return (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.container}>
            <FormRow
                label="Copy Logs"
                subLabel="Copy current session logs to the clipboard"
                trailing={() => <FormRow.Arrow />}
                onPress={() => {
                    clipboard.setString(logText)
                    showToast("Copied debug logs", getAssetIDByName("check"))
                }}
            />
            <FormRow
                label="Clear Logs"
                subLabel="Clear the current session log buffer"
                trailing={() => <FormRow.Arrow />}
                onPress={() => {
                    clearLogs()
                    showToast("Cleared debug logs", getAssetIDByName("check"))
                }}
            />

            <View style={styles.logBox}>
                {hasLogs ? (
                    <Text selectable style={styles.logText}>
                        {logText}
                    </Text>
                ) : (
                    <Text style={styles.emptyText}>
                        No debug logs yet. Trigger auto translation or manual translation, then reopen this page.
                    </Text>
                )}
            </View>
        </ScrollView>
    )
}
