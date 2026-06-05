'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { callAI } from '@/lib/aiQueue'

const CATALOGO = `
AFN 32+ (R$187,90) — Emagrecimento e metabolismo. Cápsulas. Ingredientes: Psyllium 400mg (forma gel → saciedade real), Spirulina 400mg (nutrição completa), Cafeína 200mg (energia e gasto calórico), Picolinato de Cromo 220mcg (controla metabolismo de carboidratos, reduz compulsão por doce). Ideal para: mulheres que comem pouco e não emagrecem, compulsão por doce, ciclo glicêmico vicioso, falta de energia para treinar. Perfil: mulheres 25-45 que tentaram de tudo e se culpam por não emagrecer.

AFN 77+ (R$390,00) — Saúde intestinal / prebiótico. Pó sabor framboesa. Regula trânsito intestinal, equilibra microbiota, reduz inchaço e gases, melhora absorção de nutrientes, reduz compulsão por doce. Ideal para: mulheres com barriga sempre inchada, intestino preso/preguiçoso, cansaço sem explicação, humor afetado, absorção ruim. Perfil: mulheres que se queixam de estufamento, digestão lenta.

AFN 9+ (R$600,00) — Potencializador natural / libido e vitalidade. Cápsulas. Ingredientes: Vitamina B6 10mg (769% VD), Magnésio 80mg, Zinco 7mg (100% VD), Arginina 200mg, Boro 8,86mg, Saponinas 300mg. Equilibrio hormonal, libido, energia, performance física. Ideal para: mulheres com cansaço crônico, falta de disposição e libido, queda de desempenho. Perfil: mulheres 30-50, especialmente pós-menopausa ou com queda hormonal.

AFN ClearSkin — Saúde da pele de dentro para fora. Cápsulas 60 unidades. Ingredientes: Vitamina A 2.263mcg (283% VD), Proantocianidinas de Cranberry 200mg, Procianidinas 200mg, Licopeno 8mg. Renovação celular, antioxidante, reduz manchas e melasma, uniformiza tom. Ideal para: mulheres com manchas, pele opaca, melasma, envelhecimento precoce, skincare externo que não resolve. Perfil: mulheres que já investem em skincare mas não veem resultado.

AFN NAC — Antioxidante e detox hepático. Cápsulas 60 unidades, 600mg L-Cisteína. Precursor de glutationa (antioxidante mestre do corpo). Detox hepático, proteção celular, imunidade, saúde respiratória. Ideal para: público de saúde preventiva, mulheres expostas a estresse oxidativo, álcool, medicamentos. Perfil: mulheres focadas em longevidade e saúde preventiva.

Biotin B7 — Cabelo, pele e unhas. Cápsulas 60 unidades, 45mg biotina (150% VD). Essencial para queratina, metabolismo de proteínas. Ideal para: queda de cabelo, unhas quebradiças, pele sem viço. Perfil: mulheres de beleza, lifestyle, autoestima feminina — qualquer nicho que fale de aparência.
`

export default function OnboardingDashboard() {
  const [pendentes, setPendentes] = useState([])
  const [analisando, setAnalisando] = useState(null)
  const [aprovando, setAprovando] = useState(null)
  const [produtos, setProdutos] = useState([])

  useEffect(() => { carregar() }, [])

  async function carregar() {
    const [{ data: obs }, { data: ps }] = await Promise.all([
      supabase.from('onboarding')
        .select('*,creators(nome,instagram,nicho,seguidores)')
        .order('created_at', { ascending: false }),
      supabase.from('produtos').select('id,nome,preco').eq('ativo', true)
    ])
    setPendentes(obs || [])
    setProdutos(ps || [])
  }

  async function analisarComIA(ob) {
    setAnalisando(ob.id)
    const respostas = ob.respostas
    const resumo = Object.entries(respostas).map(([k,v]) => `${k}: ${v}`).join('\n')

    try {
      const prompt = `Você é especialista em marketing de nutracêuticos femininos da A Farmácia Natural (AFN).

CATÁLOGO DE PRODUTOS:
${CATALOGO}

PERFIL DA CREATOR (respostas do questionário):
${resumo}

Creator: ${ob.creators?.nome} | Instagram: @${ob.creators?.instagram} | Nicho: ${ob.creators?.nicho} | Seguidores: ${ob.creators?.seguidores?.toLocaleString('pt-BR')}

Com base no perfil da creator e do público dela, recomende OS 2 MELHORES produtos do catálogo para ela divulgar.

Responda APENAS com JSON válido, sem markdown:
{
  "produto_1": "nome exato do produto",
  "produto_2": "nome exato do produto",
  "justificativa_1": "por que esse produto para essa creator (2-3 linhas)",
  "justificativa_2": "por que esse produto para essa creator (2-3 linhas)",
  "estrategia": "como essa creator deve abordar esses produtos dado seu perfil e público (3-4 linhas)"
}`

      const texto = await callAI(
        { messages: [{ role: 'user', content: prompt }], max_tokens: 1000 },
        { onRetry: (n, ms) => console.log(`IA: tentativa ${n}, aguardando ${ms}ms...`) }
      )

      const jsonMatch = texto.match(/\{[\s\S]*\}/)
      if (!jsonMatch) throw new Error('JSON não encontrado na resposta')
      const rec = JSON.parse(jsonMatch[0])

      const p1 = produtos.find(p => p.nome.toLowerCase().includes(rec.produto_1?.toLowerCase().replace('+','').trim()))
      const p2 = produtos.find(p => p.nome.toLowerCase().includes(rec.produto_2?.toLowerCase().replace('+','').trim()))

      await supabase.from('onboarding').update({
        recomendacao_ia: JSON.stringify(rec),
        produto_rec_1: p1?.id,
        produto_rec_2: p2?.id,
        justificativa: rec.estrategia,
        status: 'analisado'
      }).eq('id', ob.id)

      carregar()
    } catch(e) {
      alert(`Erro ao analisar: ${e.message}`)
    }
    setAnalisando(null)
  }

  async function aprovar(ob, p1id, p2id) {
    await supabase.from('onboarding').update({
      status: 'aprovado',
      produto_aprovado_1: p1id,
      produto_aprovado_2: p2id,
      aprovado_em: new Date().toISOString()
    }).eq('id', ob.id)
    await supabase.from('creators').update({
      produto_id: p1id
    }).eq('id', ob.creator_id)
    carregar()
  }

  const statusColors = { pendente: 'var(--amber)', analisado: 'var(--teal-d)', aprovado: 'var(--green)' }
  const statusBg = { pendente: 'var(--amber-lt)', analisado: 'var(--teal-lt)', aprovado: 'var(--green-lt)' }

  return (
    <div>
      <div style={{fontSize:'.6rem',textTransform:'uppercase',letterSpacing:'.2em',color:'var(--teal)',fontWeight:700,marginBottom:20,display:'flex',alignItems:'center',gap:10}}>
        {pendentes.length} questionário{pendentes.length !== 1 ? 's' : ''} recebido{pendentes.length !== 1 ? 's' : ''}
        <span style={{flex:1,height:1,background:'var(--rule)',display:'block'}}/>
      </div>

      {pendentes.length === 0 ? (
        <div style={{textAlign:'center',padding:48,color:'var(--ink3)',background:'var(--card)',border:'1px solid var(--rule)',borderRadius:6}}>
          <div style={{fontSize:'2rem',opacity:.25,marginBottom:10}}>📋</div>
          <p style={{fontSize:'.78rem'}}>Nenhuma creator preencheu o questionário ainda.</p>
        </div>
      ) : pendentes.map(ob => {
        const rec = ob.recomendacao_ia ? JSON.parse(ob.recomendacao_ia) : null
        const p1 = produtos.find(p => p.id === ob.produto_rec_1)
        const p2 = produtos.find(p => p.id === ob.produto_rec_2)

        return (
          <div key={ob.id} style={{background:'var(--card)',border:'1px solid var(--rule)',borderRadius:8,marginBottom:16,overflow:'hidden'}}>

            {/* HEADER */}
            <div style={{background:'var(--bg)',padding:'14px 20px',borderBottom:'1px solid var(--rule)',display:'flex',alignItems:'center',gap:12}}>
              <div style={{flex:1}}>
                <div style={{fontWeight:700,color:'var(--navy)',fontSize:'.92rem'}}>{ob.creators?.nome}</div>
                <div style={{fontSize:'.72rem',color:'var(--ink3)',marginTop:2}}>
                  @{ob.creators?.instagram} · {ob.creators?.nicho} · {(ob.creators?.seguidores||0).toLocaleString('pt-BR')} seguidores
                </div>
              </div>
              <span style={{fontSize:'.62rem',fontWeight:700,padding:'4px 10px',borderRadius:3,background:statusBg[ob.status],color:statusColors[ob.status]}}>
                {ob.status === 'pendente' ? '⏳ Aguardando análise' : ob.status === 'analisado' ? '🤖 IA analisou' : '✓ Aprovado'}
              </span>
              <div style={{fontSize:'.68rem',color:'var(--ink3)'}}>
                {new Date(ob.created_at).toLocaleDateString('pt-BR')}
              </div>
            </div>

            <div style={{padding:'20px'}}>

              {/* RESPOSTAS */}
              <div style={{marginBottom:16}}>
                <div style={{fontSize:'.62rem',textTransform:'uppercase',letterSpacing:'.12em',color:'var(--navy)',fontWeight:700,marginBottom:10,display:'flex',alignItems:'center',gap:8}}>
                  <span style={{width:3,height:11,background:'var(--teal)',borderRadius:2,display:'inline-block'}}/>
                  Respostas do questionário
                </div>
                <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:6}}>
                  {Object.entries(ob.respostas || {}).map(([k, v]) => (
                    <div key={k} style={{background:'var(--bg)',border:'1px solid var(--rule)',borderRadius:4,padding:'8px 10px'}}>
                      <div style={{fontSize:'.58rem',textTransform:'uppercase',letterSpacing:'.08em',color:'var(--ink3)',fontWeight:700,marginBottom:3}}>{k.replace(/_/g,' ')}</div>
                      <div style={{fontSize:'.74rem',color:'var(--ink)',fontWeight:500}}>{v}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* RECOMENDAÇÃO DA IA */}
              {rec && (
                <div style={{marginBottom:16}}>
                  <div style={{fontSize:'.62rem',textTransform:'uppercase',letterSpacing:'.12em',color:'var(--navy)',fontWeight:700,marginBottom:10,display:'flex',alignItems:'center',gap:8}}>
                    <span style={{width:3,height:11,background:'var(--teal)',borderRadius:2,display:'inline-block'}}/>
                    Recomendação da IA
                  </div>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:12}}>
                    <div style={{background:'var(--navy-xs)',border:'1px solid var(--rule)',borderRadius:6,padding:'14px 16px'}}>
                      <div style={{fontSize:'.62rem',textTransform:'uppercase',letterSpacing:'.1em',color:'var(--teal-d)',fontWeight:700,marginBottom:6}}>Produto 1</div>
                      <div style={{fontSize:'.9rem',fontWeight:700,color:'var(--navy)',marginBottom:6}}>{p1?.nome || rec.produto_1}</div>
                      <div style={{fontSize:'.76rem',color:'var(--ink2)',lineHeight:1.55}}>{rec.justificativa_1}</div>
                    </div>
                    <div style={{background:'var(--navy-xs)',border:'1px solid var(--rule)',borderRadius:6,padding:'14px 16px'}}>
                      <div style={{fontSize:'.62rem',textTransform:'uppercase',letterSpacing:'.1em',color:'var(--teal-d)',fontWeight:700,marginBottom:6}}>Produto 2</div>
                      <div style={{fontSize:'.9rem',fontWeight:700,color:'var(--navy)',marginBottom:6}}>{p2?.nome || rec.produto_2}</div>
                      <div style={{fontSize:'.76rem',color:'var(--ink2)',lineHeight:1.55}}>{rec.justificativa_2}</div>
                    </div>
                  </div>
                  <div style={{background:'var(--teal-lt)',border:'1px solid var(--rule)',borderLeft:'3px solid var(--teal-d)',borderRadius:4,padding:'12px 14px'}}>
                    <div style={{fontSize:'.6rem',textTransform:'uppercase',letterSpacing:'.1em',color:'var(--teal-d)',fontWeight:700,marginBottom:5}}>Estratégia sugerida</div>
                    <div style={{fontSize:'.78rem',color:'var(--ink2)',lineHeight:1.6}}>{rec.estrategia}</div>
                  </div>
                </div>
              )}

              {/* AÇÕES */}
              <div style={{display:'flex',gap:10,justifyContent:'flex-end'}}>
                {ob.status === 'pendente' && (
                  <button onClick={() => analisarComIA(ob)} disabled={analisando === ob.id}
                    style={{background:analisando===ob.id?'var(--ink3)':'var(--teal-d)',color:'#fff',border:'none',borderRadius:4,padding:'9px 18px',fontSize:'.78rem',fontWeight:700}}>
                    {analisando === ob.id ? '⏳ Analisando...' : '🤖 Analisar com IA →'}
                  </button>
                )}
                {ob.status === 'analisado' && (
                  <>
                    <button onClick={() => analisarComIA(ob)} disabled={analisando === ob.id}
                      style={{background:'transparent',color:'var(--ink3)',border:'1px solid var(--rule)',borderRadius:4,padding:'9px 16px',fontSize:'.75rem'}}>
                      Reanalisar
                    </button>
                    <button onClick={() => aprovar(ob, ob.produto_rec_1, ob.produto_rec_2)} disabled={aprovando === ob.id}
                      style={{background:'var(--green)',color:'#fff',border:'none',borderRadius:4,padding:'9px 20px',fontSize:'.78rem',fontWeight:700}}>
                      ✓ Aprovar recomendação
                    </button>
                  </>
                )}
                {ob.status === 'aprovado' && (
                  <>
                    <button onClick={() => analisarComIA(ob)} disabled={analisando === ob.id}
                      style={{background:'transparent',color:'var(--ink3)',border:'1px solid var(--rule)',borderRadius:4,padding:'9px 16px',fontSize:'.75rem'}}>
                      {analisando === ob.id ? '⏳ Reanalisando...' : '↺ Reanalisar'}
                    </button>
                    <div style={{fontSize:'.78rem',color:'var(--green)',fontWeight:600,display:'flex',alignItems:'center'}}>
                      ✓ Aprovado em {new Date(ob.aprovado_em).toLocaleDateString('pt-BR')}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
