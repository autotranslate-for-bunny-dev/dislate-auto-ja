import { stripIgnoredSegments } from "./protectedText"

/**
 * 日本語文字を検出するユーティリティ
 * ひらがな・カタカナ・漢字（CJK統合漢字）をチェック
 */

// ひらがな: U+3040-U+309F
// カタカナ: U+30A0-U+30FF
// CJK統合漢字: U+4E00-U+9FFF
// CJK統合漢字拡張A: U+3400-U+4DBF
// 半角カタカナ: U+FF65-U+FF9F
const JAPANESE_REGEX = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF\u3400-\u4DBF\uFF65-\uFF9F]/g

/**
 * テキスト中の日本語文字の割合を返す (0.0 ~ 1.0)
 * URLや絵文字、メンション、カスタム絵文字は除外して計算
 */
export function getJapaneseRatio(text: string): number {
    if (!text || text.trim().length === 0) return 1 // 空テキストは翻訳しない

    // URL, 各種メンション, コードブロックなどは除外
    const cleaned = stripIgnoredSegments(text).replace(/\s+/g, "")

    if (cleaned.length === 0) return 1 // URLだけなどの場合は翻訳しない

    const japaneseMatches = cleaned.match(JAPANESE_REGEX)
    const japaneseCount = japaneseMatches ? japaneseMatches.length : 0

    return japaneseCount / cleaned.length
}

/**
 * テキストが日本語かどうかを判定する
 * threshold: 日本語文字の割合がこの値以上なら日本語とみなす (デフォルト: 0.3 = 30%)
 */
export function isJapanese(text: string, threshold: number = 0.3): boolean {
    return getJapaneseRatio(text) >= threshold
}

/**
 * テキストが翻訳すべきかどうかを判定する
 * - 短すぎるテキスト（3文字以下）はスキップ
 * - 絵文字だけ、URLだけ、メンションだけなどはスキップ
 */
export function shouldTranslate(text: string, threshold: number = 0.3): boolean {
    if (!text || text.trim().length <= 3) return false

    // URLだけ、メンションだけ、コードだけなど中身がないものはスキップ
    const cleaned = stripIgnoredSegments(text).replace(/\s+/g, "")

    if (cleaned.length <= 2) return false

    return !isJapanese(text, threshold)
}
