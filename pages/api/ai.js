const AFN = "Voce e a IA da A Farmacia Natural (AFN), marca brasileira de nutraceuticos premium para mulheres 25+. CATALOGO: AFN32+ (R$187,90) Metabolismo/emagrecimento capsulas; AFN77+ (R$390) Longevidade/colageno po 300g; AFN9+ (R$600) Performance/energia capsulas; AFN Nac - Detox/antioxidante; AFN Biotin B7 - Cabelo/pele/unhas. PERSONA: Mulheres 25-55 classe B/C SP. ARQUETIPOS: Sage (Ciencia Simplificada) + Caregiver. TOM: Especialista, moderno, acolhedor, sem promessas miraculosas. ESTRATEGIA: Marketing de Premissas, Reels engaja, Stories converte."

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

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { messages, system, max_tokens = 2000 } = req.body
    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) return res.status(500).json({ error: 'API key nao configurada' })

    const systemPrompt = system ? AFN + ' ' + system : AFN
    const userMessage = messages.map(m => m.content).join('\n')

    for (const model of MODELS) {
      const { resp, data } = await callGemini(apiKey, model, systemPrompt, userMessage, max_tokens)

      if (resp.status === 429 || resp.status === 404) {
        await new Promise(r => setTimeout(r, 800))
        continue
      }

      if (!resp.ok) {
        return res.status(500).json({ error: `Gemini erro ${resp.status}: ${data.error?.message || 'sem detalhes'}` })
      }

      const text = data.candidates?.[0]?.content?.parts?.[0]?.text || ''
      if (!text) return res.status(500).json({ error: 'Resposta vazia da IA' })

      return res.status(200).json({ content: [{ type: 'text', text }] })
    }

    return res.status(429).json({ error: 'Limite da API Gemini atingido em todos os modelos. Aguarde 1 minuto e tente novamente.' })
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}
