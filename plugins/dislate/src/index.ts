import { storage } from "@vendetta/plugin"
import patchActionSheet from "./patches/ActionSheet"
import patchCommands from "./patches/Commands"
import patchAutoTranslate from "./patches/AutoTranslate"
import Settings from "./settings"

export const settings: {
    source_lang?: string
    target_lang?: string
    translator?: number
    immersive_enabled?: boolean
    auto_translate_enabled?: boolean
    auto_translate_threshold?: number
} = storage

settings.target_lang ??= "ja"
settings.translator ??= 1
settings.immersive_enabled ??= true
settings.auto_translate_enabled ??= true
settings.auto_translate_threshold ??= 0.3

let patches = []

export default {
    onLoad: () => patches = [
        patchActionSheet(),
        patchCommands(),
        patchAutoTranslate()
    ],
    onUnload: () => { for (const unpatch of patches) unpatch() },
    settings: Settings
}
