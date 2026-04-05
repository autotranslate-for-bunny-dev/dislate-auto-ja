const PLACEHOLDER_PREFIX = "DISLATE_TOKEN_"

// Keep Discord-specific syntax, links, and code blocks intact across translation.
const PROTECTED_SEGMENT_REGEX = /```[\s\S]*?```|`[^`\n]+`|https?:\/\/\S+|<\/[^:>\s]+:\d+>|<a?:\w+:\d+>|<@!?\d+>|<@&\d+>|<#\d+>|<t:\d+(?::[A-Za-z])?>/g

export function protectSpecialSegments(text: string) {
    const placeholders: string[] = []
    const protectedText = text.replace(PROTECTED_SEGMENT_REGEX, (match) => {
        const token = `[[${PLACEHOLDER_PREFIX}${placeholders.length}]]`
        placeholders.push(match)
        return token
    })

    return {
        text: protectedText,
        restore(value: string) {
            let restored = value
            placeholders.forEach((original, index) => {
                const token = `${PLACEHOLDER_PREFIX}${index}`
                const placeholderRegex = new RegExp(`\\[\\[\\s*${token}\\s*\\]\\]`, "g")
                restored = restored.replace(placeholderRegex, original)
            })
            return restored
        }
    }
}

export function stripIgnoredSegments(text: string) {
    return text.replace(PROTECTED_SEGMENT_REGEX, " ")
}
