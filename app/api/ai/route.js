export const dynamic = "force-dynamic"
export const runtime = "nodejs"

import { NextResponse } from 'next/server'

const AFN_CONTEXT = `Voce e a IA da A Farmacia Natural (AFN), marca brasileira de nutraceuticos premium para mulheres 25+.

CATALOGO DE PRODUTOS:
- AFN32+ (R$187,90): Metabolismo e emagrecimento saudavel. Capsulas, 30g. Para mulheres que querem emagrecer com saude.
- AFN77+ (R$390,00): Longevidade e vitalidade. Po, 300g. Colageno + vitaminas para pele, cabelo, articulacoes.
- AFN9+ (R$600,00): Performance e energia. Capsulas, 30g. Disposicao, foco e imunidade.
- AFN Nac (custo R$15): N-Acetilcisteina. Detox, antioxidante, saude respiratoria.
- AFN Biotin B7 (custo R$5): Biotina. Cabelo, pele e unhas.

PERSONA: Mulheres 25-55, classe B/C, Sao Paulo. Buscam autoestima, saude, equilibrio. Sensíveis a preco mas investem em qualidade.

ARQUETIPOS DE MARCA: Sage (Ciencia Simplificada) + Caregiver (empatia e acolhimento).

TOM DE VOZ: Especialista, moderno, acolhedor. Sem termos tecnicos excessivos, sem linguagem agressiva, sem promessas miraculosas. Clean, sofisticado, minimalista.

ESTRATEGIA DE CONTEUDO: Marketing de Premissas. Reels engaja, Stories converte. Conteudo educativo > promocional.`

export async function POST(request) {
  try {
    const body = await request.json()
    const { messages, system, max_tokens = 2000 } = body

    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'API key nao configurada' }, { status: 500 })
    }

    const systemPrompt = system ? AFN_CONTEXT + '\n\n' + system : AFN_CONTEXT

    const resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens,
        system: systemPrompt,
        messages
      })
    })

    const data = await resp.json()
    if (!resp.ok) {
      return NextResponse.json({ error: data.error?.message || 'Erro na API' }, { status: resp.status })
    }

    return NextResponse.json(data)
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}


export async function GET() {
  return NextResponse.json({ status: 'ok', route: 'ai' })
}
