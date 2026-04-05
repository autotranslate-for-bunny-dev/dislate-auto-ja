import { logger } from "@vendetta"
import { createProxy } from "@vendetta/storage"

export type DebugLogLevel = "info" | "warn" | "error"

export type DebugLogEntry = {
    id: string
    timestamp: string
    level: DebugLogLevel
    event: string
    message: string
    details?: string
}

const MAX_LOG_ENTRIES = 250

let logSequence = 0

export const { proxy: debugLogStore } = createProxy({
    entries: [] as DebugLogEntry[]
})

function stringifyDetails(details?: unknown) {
    if (details == null) return undefined
    if (typeof details === "string") return details

    try {
        return JSON.stringify(details)
    } catch {
        return String(details)
    }
}

export function formatLogEntry(entry: DebugLogEntry) {
    const prefix = `${entry.timestamp} ${entry.level.toUpperCase()} [${entry.event}] ${entry.message}`
    return entry.details ? `${prefix} | ${entry.details}` : prefix
}

export function pushLog(level: DebugLogLevel, event: string, message: string, details?: unknown) {
    const entry: DebugLogEntry = {
        id: `log-${Date.now()}-${logSequence++}`,
        timestamp: new Date().toISOString(),
        level,
        event,
        message,
        details: stringifyDetails(details)
    }

    debugLogStore.entries = [...debugLogStore.entries, entry].slice(-MAX_LOG_ENTRIES)

    const formatted = formatLogEntry(entry)
    if (level === "error") {
        logger.error(formatted)
    } else if (level === "warn") {
        console.warn(formatted)
    } else {
        console.log(formatted)
    }

    return entry
}

export function clearLogs() {
    debugLogStore.entries = []
}

export function getLogsText() {
    if (!debugLogStore.entries.length) return "No debug logs recorded yet."
    return debugLogStore.entries.map(formatLogEntry).join("\n")
}
