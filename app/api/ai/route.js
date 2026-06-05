import { NextResponse } from 'next/server'

const AFN = "Voce e a IA da A Farmacia Natural (AFN), marca brasileira de nutraceuticos premium para mulheres 25+. CATALOGO: AFN32+ (R$187,90) Metabolismo/emagrecimento capsulas; AFN77+ (R$390) Longevidade/colageno po 300g; AFN9+ (R$600) Performance/energia capsulas; AFN Nac - Detox/antioxidante; AFN Biotin B7 - Cabelo/pele/unhas. PERSONA: Mulheres 25-55 classe B/C SP. ARQUETIPOS: Sage (Ciencia Simplificada) + Caregiver. TOM: Especialista, moderno, acolhedor, sem promessas miraculosas. ESTRATEGIA: Marketing de Premissas, Reels engaja, Stories converte."

// Modelos em ordem de preferência — cai para o próximo em 429/404
const MODELS = ['gemini-1.5-flash-latest', 'gemini-1.5-flash-8b-latest']

async function callGemini(apiKey, model, systemPrompt, userMessage, max_tokens) {
  const resp = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemPrompt }] },
        contents: [{ role: 'user', parts: [{ text: userMessage }] }],
        generationConfig: { maxOutputTokens: max_tokens, temperature: 0.7 }
      })
    }
  )
  const data = await resp.json()
  return { resp, data }
}

export async function POST(request) {
  try {
    const { messages, system, max_tokens = 2000 } = await request.json()
    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) return NextResponse.json({ error: 'API key nao configurada' }, { status: 500 })

    const systemPrompt = system ? AFN + ' ' + system : AFN
    const userMessage = messages.map(m => m.content).join('\n')

    let lastError = null

    for (let i = 0; i < MODELS.length; i++) {
      const model = MODELS[i]
      const { resp, data } = await callGemini(apiKey, model, systemPrompt, userMessage, max_tokens)

      if (resp.status === 429 || resp.status === 404) {
        lastError = resp.status === 429 ? 'rate_limit' : 'not_found'
        // espera mais no 429 do que no 404
        const wait = resp.status === 429 ? 2000 : 500
        await new Promise(r => setTimeout(r, wait))
        continue
      }

      if (!resp.ok) {
        return NextResponse.json(
          { error: `Gemini erro ${resp.status}: ${data.error?.message || 'sem detalhes'}` },
          { status: 500 }
        )
      }

      const text = data.candidates?.[0]?.content?.parts?.[0]?.text || ''
      if (!text) return NextResponse.json({ error: 'Resposta vazia da IA' }, { status: 500 })

      return NextResponse.json({ content: [{ type: 'text', text }] })
    }

    // Todos os modelos falharam
    const msg = lastError === 'rate_limit'
      ? 'Limite da API Gemini atingido. Aguarde alguns segundos e tente novamente.'
      : 'Modelos Gemini indisponíveis no momento. Tente novamente em instantes.'

    return NextResponse.json({ error: msg }, { status: 429 })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
