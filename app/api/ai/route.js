import { NextResponse } from 'next/server'

const AFN = "Voce e a IA da A Farmacia Natural (AFN), marca brasileira de nutraceuticos premium para mulheres 25+. CATALOGO: AFN32+ (R$187,90) Metabolismo/emagrecimento capsulas; AFN77+ (R$390) Longevidade/colageno po 300g; AFN9+ (R$600) Performance/energia capsulas; AFN Nac - Detox/antioxidante; AFN Biotin B7 - Cabelo/pele/unhas. PERSONA: Mulheres 25-55 classe B/C SP. ARQUETIPOS: Sage (Ciencia Simplificada) + Caregiver. TOM: Especialista, moderno, acolhedor, sem promessas miraculosas. ESTRATEGIA: Marketing de Premissas, Reels engaja, Stories converte."

export async function POST(request) {
  try {
    const { messages, system, max_tokens = 2000 } = await request.json()
    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) return NextResponse.json({ error: 'API key nao configurada' }, { status: 500 })

    const resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens,
        system: system ? AFN + ' ' + system : AFN,
        messages
      })
    })

    const data = await resp.json()
    if (!resp.ok) return NextResponse.json({ error: data.error?.message || 'Erro' }, { status: resp.status })
    return NextResponse.json(data)
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
