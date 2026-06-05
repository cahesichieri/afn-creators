/**
 * aiQueue.js
 * Fila serializada para chamadas à /api/ai.
 * - Máximo 1 request simultâneo (evita 429 por parallelismo)
 * - Retry automático em 429 com backoff exponencial
 * - Delay mínimo de 1s entre requests
 */

let queue = Promise.resolve()
let lastCallTime = 0
const MIN_DELAY_MS = 1200  // mínimo entre requests

/**
 * Chama /api/ai de forma serializada e com retry.
 * @param {object} body - { messages, system, max_tokens }
 * @param {object} opts - { onRetry(attempt, waitMs) }
 * @returns {Promise<string>} - texto retornado pela IA
 */
export function callAI(body, opts = {}) {
  // encadeia na fila — cada chamada espera a anterior terminar
  queue = queue.then(() => _execute(body, opts))
  return queue
}

async function _execute(body, opts, attempt = 1) {
  // garante delay mínimo entre requests
  const now = Date.now()
  const elapsed = now - lastCallTime
  if (elapsed < MIN_DELAY_MS) {
    await sleep(MIN_DELAY_MS - elapsed)
  }

  lastCallTime = Date.now()

  const res = await fetch('/api/ai', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  })

  const data = await res.json()

  if (res.status === 429) {
    const maxAttempts = 5
    if (attempt >= maxAttempts) {
      throw new Error('Limite da API atingido após várias tentativas. Aguarde 1 minuto e tente novamente.')
    }
    const waitMs = Math.min(2000 * Math.pow(2, attempt - 1), 30000) // 2s, 4s, 8s, 16s, 30s
    if (opts.onRetry) opts.onRetry(attempt, waitMs)
    await sleep(waitMs)
    return _execute(body, opts, attempt + 1)
  }

  if (!res.ok || data.error) {
    throw new Error(data.error || `Erro ${res.status} na API de IA`)
  }

  const texto = data.content?.find(b => b.type === 'text')?.text || ''
  if (!texto) throw new Error('A IA retornou uma resposta vazia.')

  return texto
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms))
}
