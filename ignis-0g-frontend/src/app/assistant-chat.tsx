import { useEffect, useRef, useState, type FormEvent } from "react"
import { ArrowUpRight, Bot, ChevronRight, Reset, Send, Sparkles } from "@/components/ui/icons"
import { ApiError, api } from "@/api/client"
import type { ChatMessage, ChatResponse, Citation, StudySummary } from "@/domain/types"

interface Exchange {
  question: string
  response?: ChatResponse
  error?: string
}

export function useStudyChat(study: StudySummary | undefined) {
  const [scope, setScope] = useState<"study" | "global">(study ? "study" : "global")
  const [historyByScope, setHistoryByScope] = useState<Record<string, Exchange[]>>({})
  const [pending, setPending] = useState(false)

  const activeKey = scope === "study" && study ? `study:${study.id}` : "global"
  const exchanges = historyByScope[activeKey] ?? []

  useEffect(() => {
    if (!study && scope === "study") setScope("global")
  }, [study, scope])

  async function send(question: string) {
    const text = question.trim()
    if (!text || pending) return
    const targetScope = scope === "study" && study ? "study" : "global"
    const key = targetScope === "study" && study ? `study:${study.id}` : "global"
    const prior = historyByScope[key] ?? []

    const chatHistory: ChatMessage[] = []
    for (const ex of prior.slice(-6)) {
      if (ex.response) {
        chatHistory.push({ role: "user", content: ex.question.slice(0, 2000) })
        chatHistory.push({ role: "assistant", content: ex.response.answer.slice(0, 2000) })
      }
    }

    setHistoryByScope((prev) => ({
      ...prev,
      [key]: [...(prev[key] ?? []), { question: text }],
    }))
    setPending(true)

    try {
      const response = await api.askAssistant({
        message: text,
        study_id: targetScope === "study" && study ? study.id : null,
        history: chatHistory,
        scope: targetScope,
      })
      setHistoryByScope((prev) => {
        const list = [...(prev[key] ?? [])]
        list[list.length - 1] = { question: text, response }
        return { ...prev, [key]: list }
      })
    } catch (err) {
      let msg = "Не удалось получить ответ от ИИ-ассистента."
      if (err instanceof ApiError) {
        if (err.status === 429) {
          msg = `Превышен лимит запросов.${err.retryAfter ? ` Повторите через ${err.retryAfter} с.` : ""}`
        } else if (err.status === 503) {
          msg = "Сервис ИИ временно недоступен (503)."
        } else if (err.status === 504) {
          msg = "Превышено время ожидания ответа ИИ (504)."
        } else {
          msg = err.message
        }
      }
      setHistoryByScope((prev) => {
        const list = [...(prev[key] ?? [])]
        list[list.length - 1] = { question: text, error: msg }
        return { ...prev, [key]: list }
      })
    } finally {
      setPending(false)
    }
  }

  function clear() {
    setHistoryByScope((prev) => ({ ...prev, [activeKey]: [] }))
  }

  return {
    scope,
    setScope,
    study,
    exchanges,
    pending,
    send,
    clear,
  }
}

function CitationList({ citations }: { citations: Citation[] }) {
  if (!citations.length) return null
  return (
    <div className="chat-citations">
      {citations.map((c, idx) => (
        <details key={`${c.chunk_id}-${idx}`}>
          <summary>
            [{idx + 1}] {c.title}
            {c.locator ? ` · ${c.locator}` : ""}
          </summary>
          <p>{c.excerpt}</p>
          <a href={c.url} target="_blank" rel="noreferrer">
            Открыть источник <ArrowUpRight size={13} />
          </a>
        </details>
      ))}
    </div>
  )
}

export function AssistantChat({
  chat,
  onOpenPage,
  onCollapse,
  onSelectStudy,
}: {
  chat: ReturnType<typeof useStudyChat>
  onOpenPage?: () => void
  onCollapse?: () => void
  onSelectStudy?: (id: string) => void
}) {
  const [draft, setDraft] = useState("")
  const log = useRef<HTMLDivElement>(null)
  const input = useRef<HTMLTextAreaElement>(null)
  const { scope, setScope, study, exchanges, pending, send, clear } = chat

  useEffect(() => {
    if (log.current) log.current.scrollTop = log.current.scrollHeight
  }, [exchanges.length, pending])

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!draft.trim() || pending) return
    void send(draft)
    setDraft("")
    input.current?.focus()
  }

  const starterSuggestions =
    scope === "study" && study
      ? [
          `Основные выводы ${study.title.split(" (")[0]}?`,
          "Условия O₂, давления и оборудования?",
          "Применимость к лунной базе (34% O₂)?",
        ]
      : [
          "Что важно для лунной базы (34% O₂)?",
          "Как работает обнаружение дыма в 0g (SAME)?",
          "Почему NASA-STD-6001 не всегда точен?",
        ]

  const lastSuggestions =
    exchanges.length > 0
      ? exchanges[exchanges.length - 1]?.response?.suggested_questions ?? []
      : starterSuggestions

  return (
    <section className="assistant">
      <div className="assistant-header">
        <div className="assistant-title-group">
          <div className="assistant-avatar">
            <Bot size={18} />
          </div>
          <div>
            <h2>ИИ-ассистент по исследованиям</h2>
            <span>{scope === "study" && study ? study.category : "Весь каталог NASA PSI"}</span>
          </div>
        </div>
        <div className="assistant-head-actions">
          {exchanges.length > 0 && (
            <button type="button" className="icon-button" title="Новый диалог" aria-label="Очистить диалог" onClick={clear}>
              <Reset size={16} />
            </button>
          )}
          {onOpenPage && (
            <button
              type="button"
              className="icon-button"
              aria-label="Развернуть ассистента"
              title="Развернуть на весь экран"
              onClick={onOpenPage}
            >
              <ArrowUpRight size={17} />
            </button>
          )}
          {onCollapse && (
            <button
              type="button"
              className="icon-button"
              aria-label="Свернуть чат"
              title="Свернуть панель ИИ-ассистента"
              onClick={onCollapse}
            >
              <ChevronRight size={18} />
            </button>
          )}
        </div>
      </div>

      <div className="chat-body" ref={log}>
        {exchanges.length === 0 && (
          <div className="chat-intro-brief">
            <p className="chat-intro-title">Сводка по базе NASA PSI:</p>
            <ul>
              <li>
                <strong>Луна и роверы:</strong> 34% O₂ при 56.5 кПа (SoFIE, ACME BRE) повышают горючесть материалов.
              </li>
              <li>
                <strong>Вентиляция МКС:</strong> слабый обдув HVAC (1–10 см/с) снижает порог O₂ для тканей (BASS-II).
              </li>
              <li>
                <strong>Обнаружение и тушение:</strong> морфология дыма в 0g (SAME) и холодное пламя (FLEX).
              </li>
            </ul>
            {study && onSelectStudy && (
              <button type="button" className="inline-study-pill" onClick={() => onSelectStudy(study.id)}>
                {study.title.split(" (")[0]} <ArrowUpRight size={12} />
              </button>
            )}
          </div>
        )}

        <div className="chat-log" role="log" aria-label="История сообщений" tabIndex={exchanges.length ? 0 : undefined}>
          {exchanges.map(({ question, response, error }, index) => (
            <div className="chat-exchange" key={index}>
              <p className="chat-message chat-question">{question}</p>

              {!response && !error && (
                <div className="chat-answer-block">
                  <p className="muted">Ищу подтверждения в источниках NASA…</p>
                </div>
              )}

              {error && (
                <div className="chat-answer-block chat-error-text">
                  <p>{error}</p>
                </div>
              )}

              {response && (
                <div className="chat-answer-block">
                  {response.status === "insufficient_evidence" && (
                    <span className="chat-status-tag">Недостаточно данных в источниках</span>
                  )}
                  <p className="chat-answer-text">{response.answer}</p>
                  {response.related_study_ids.length > 0 && onSelectStudy && (
                    <div className="chat-related-pills">
                      {response.related_study_ids.map((id) => (
                        <button key={id} type="button" className="inline-study-pill" onClick={() => onSelectStudy(id)}>
                          {id} <ArrowUpRight size={12} />
                        </button>
                      ))}
                    </div>
                  )}
                  <CitationList citations={response.citations} />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="chat-composer-area">
        {lastSuggestions.length > 0 && (
          <div className="chat-pill-suggestions">
            {lastSuggestions.map((q) => (
              <button
                key={q}
                type="button"
                disabled={pending}
                onClick={() => {
                  void send(q)
                  input.current?.focus()
                }}
              >
                {q}
              </button>
            ))}
          </div>
        )}

        <form className="chat-composer-card" onSubmit={submit}>
          <textarea
            ref={input}
            rows={2}
            aria-label="Сообщение ассистенту"
            placeholder="Спросите что угодно…"
            maxLength={2000}
            disabled={pending}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key !== "Enter" || event.shiftKey || event.nativeEvent.isComposing) return
              event.preventDefault()
              event.currentTarget.form?.requestSubmit()
            }}
          />
          <div className="chat-composer-footer">
            <div className="composer-scope-pills" role="group" aria-label="Область поиска">
              <button
                type="button"
                disabled={!study}
                aria-pressed={scope === "study"}
                onClick={() => setScope("study")}
              >
                <Sparkles size={12} /> {study ? study.category : "Исследование"}
              </button>
              <button
                type="button"
                aria-pressed={scope === "global"}
                onClick={() => setScope("global")}
              >
                Весь каталог
              </button>
            </div>
            <button
              type="submit"
              className="composer-send-btn"
              aria-label="Отправить сообщение"
              disabled={pending || !draft.trim()}
            >
              <Send size={15} />
            </button>
          </div>
        </form>
      </div>
    </section>
  )
}
