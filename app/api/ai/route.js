import { NextResponse } from 'next/server'

const AFN = "Voce e a IA da A Farmacia Natural (AFN), marca brasileira de nutraceuticos premium para mulheres 25+. CATALOGO: AFN32+ (R$187,90) Metabolismo/emagrecimento capsulas; AFN77+ (R$390) Longevidade/colageno po 300g; AFN9+ (R$600) Performance/energia capsulas; AFN Nac - Detox/antioxidante; AFN Biotin B7 - Cabelo/pele/unhas. PERSONA: Mulheres 25-55 classe B/C SP. ARQUETIPOS: Sage (Ciencia Simplificada) + Caregiver. TOM: Especialista, moderno, acolhedor, sem promessas miraculosas. ESTRATEGIA: Marketing de Premissas, Reels engaja, Stories converte."

export async function POST(request) {
  try {
    const { messages, system, max_tokens = 2000 } = await request.json()
    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) return NextResponse.json({ error: 'API key nao configurada' }, { status: 500 })

    // Monta o prompt com system prompt + mensagens do usuário
    const systemPrompt = system ? AFN + ' ' + system : AFN
    const userMessage = messages.map(m => m.content).join('\n')

    const resp = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
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
    if (!resp.ok) return NextResponse.json({ error: data.error?.message || 'Erro Gemini' }, { status: resp.status })

    // Normaliza resposta para o mesmo formato da Anthropic (content[].text)
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || ''
    if (!text) return NextResponse.json({ error: 'Resposta vazia da IA' }, { status: 500 })

    return NextResponse.json({ content: [{ type: 'text', text }] })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
