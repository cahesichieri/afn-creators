'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

const statusColors = { pendente:'var(--amber)', aprovado:'var(--teal-d)', enviado:'var(--green)', recusado:'var(--red)' }
const statusBg = { pendente:'var(--amber-lt)', aprovado:'var(--teal-lt)', enviado:'var(--green-lt)', recusado:'var(--red-lt)' }

export default function Amostras() {
  const [solicitacoes, setSolicitacoes] = useState([])
  const [expandido, setExpandido] = useState(null)
  const [processando, setProcessando] = useState(null)

  useEffect(() => { carregar() }, [])

  async function carregar() {
    const { data } = await supabase
      .from('amostras')
      .select('*,creators(nome,instagram,telefone,whatsapp,cpf,cidade,estado)')
      .order('created_at', { ascending: false })
    setSolicitacoes(data||[])
  }

  async function aprovar(sol) {
    const itens = typeof sol.itens === 'string' ? JSON.parse(sol.itens) : (sol.itens||[])
    // Verifica se há quantidades aprovadas personalizadas salvas no estado
    const itensAprovados = itens.map(it => ({
      ...it,
      quantidade_aprovada: it.quantidade_aprovada ?? it.quantidade
    }))
    setProcessando(sol.id)
    await supabase.from('amostras').update({
      status: 'aprovado',
      itens: JSON.stringify(itensAprovados),
      aprovado_em: new Date().toISOString()
    }).eq('id', sol.id)
    setProcessando(null)
    carregar()
  }

  async function recusar(id) {
    if (!confirm('Recusar esta solicitação?')) return
    setProcessando(id)
    await supabase.from('amostras').update({ status: 'recusado' }).eq('id', id)
    setProcessando(null)
    carregar()
  }

  async function marcarEnviado(id) {
    setProcessando(id)
    await supabase.from('amostras').update({ status: 'enviado', enviado_em: new Date().toISOString() }).eq('id', id)
    setProcessando(null)
    carregar()
  }

  async function atualizarQtdAprovada(solId, prodIndex, qtd) {
    setSolicitacoes(prev => prev.map(s => {
      if (s.id !== solId) return s
      const itens = typeof s.itens === 'string' ? JSON.parse(s.itens) : [...(s.itens||[])]
      itens[prodIndex] = { ...itens[prodIndex], quantidade_aprovada: Math.max(0, parseInt(qtd)||0) }
      return { ...s, itens: JSON.stringify(itens) }
    }))
  }

  const pendentes = solicitacoes.filter(s => s.status === 'pendente')
  const outros = solicitacoes.filter(s => s.status !== 'pendente')

  return (
    <div>
      <div style={{fontSize:'.6rem',textTransform:'uppercase',letterSpacing:'.2em',color:'var(--teal)',fontWeight:700,marginBottom:20,display:'flex',alignItems:'center',gap:10}}>
        {pendentes.length} solicitação{pendentes.length!==1?'es':''} pendente{pendentes.length!==1?'s':''}
        <span style={{flex:1,height:1,background:'var(--rule)',display:'block'}}/>
      </div>

      {solicitacoes.length === 0 && (
        <div style={{textAlign:'center',padding:48,color:'var(--ink3)',background:'var(--card)',border:'1px solid var(--rule)',borderRadius:6}}>
          <div style={{fontSize:'2rem',opacity:.25,marginBottom:10}}>📦</div>
          <p style={{fontSize:'.78rem'}}>Nenhuma solicitação de amostra ainda.</p>
        </div>
      )}

      {/* PENDENTES PRIMEIRO */}
      {[...pendentes, ...outros].map(sol => {
        const itens = typeof sol.itens === 'string' ? JSON.parse(sol.itens) : (sol.itens||[])
        const aberto = expandido === sol.id
        const c = sol.creators

        return (
          <div key={sol.id} style={{background:'var(--card)',border:'1px solid var(--rule)',borderRadius:8,marginBottom:12,overflow:'hidden'}}>

            {/* HEADER */}
            <div style={{padding:'14px 20px',background:'var(--bg)',borderBottom:'1px solid var(--rule)',display:'flex',alignItems:'center',gap:12,cursor:'pointer'}} onClick={()=>setExpandido(aberto?null:sol.id)}>
              <div style={{flex:1}}>
                <div style={{fontWeight:700,color:'var(--navy)',fontSize:'.92rem'}}>{c?.nome}</div>
                <div style={{fontSize:'.7rem',color:'var(--ink3)',marginTop:2}}>@{c?.instagram} · {new Date(sol.created_at).toLocaleDateString('pt-BR')}</div>
              </div>
              <div style={{display:'flex',gap:6,flexWrap:'wrap',justifyContent:'flex-end'}}>
                {itens.map((it,i)=>(
                  <span key={i} style={{fontSize:'.65rem',background:'var(--navy-xs)',color:'var(--navy)',padding:'2px 8px',borderRadius:3,fontWeight:600}}>
                    {it.quantidade_aprovada!=null && sol.status!=='pendente' ? it.quantidade_aprovada : it.quantidade}x {it.nome?.split(' ')[0]}
                  </span>
                ))}
              </div>
              <span style={{fontSize:'.62rem',fontWeight:700,padding:'4px 10px',borderRadius:3,background:statusBg[sol.status],color:statusColors[sol.status],whiteSpace:'nowrap'}}>
                {sol.status==='pendente'?'⏳ Pendente':sol.status==='aprovado'?'✓ Aprovado':sol.status==='enviado'?'📦 Enviado':'✕ Recusado'}
              </span>
              <span style={{color:'var(--ink3)',fontSize:'.8rem'}}>{aberto?'▲':'▼'}</span>
            </div>

            {aberto && (
              <div style={{padding:'20px'}}>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16,marginBottom:16}}>

                  {/* DADOS DA CREATOR */}
                  <div style={{background:'var(--navy-xs)',border:'1px solid var(--rule)',borderRadius:6,padding:'14px 16px'}}>
                    <div style={{fontSize:'.6rem',textTransform:'uppercase',letterSpacing:'.1em',color:'var(--teal-d)',fontWeight:700,marginBottom:10}}>Dados da Creator</div>
                    {[['Nome',c?.nome],['Instagram','@'+c?.instagram],['Telefone',c?.telefone],['WhatsApp',c?.whatsapp],['CPF',c?.cpf]].map(([l,v])=>v&&(
                      <div key={l} style={{marginBottom:6}}>
                        <span style={{fontSize:'.6rem',textTransform:'uppercase',letterSpacing:'.08em',color:'var(--ink3)',fontWeight:700}}>{l}: </span>
                        <span style={{fontSize:'.78rem',color:'var(--ink)'}}>{v}</span>
                      </div>
                    ))}
                  </div>

                  {/* ENDEREÇO */}
                  <div style={{background:'var(--navy-xs)',border:'1px solid var(--rule)',borderRadius:6,padding:'14px 16px'}}>
                    <div style={{fontSize:'.6rem',textTransform:'uppercase',letterSpacing:'.1em',color:'var(--teal-d)',fontWeight:700,marginBottom:10}}>Endereço de Entrega</div>
                    <div style={{fontSize:'.78rem',color:'var(--ink)',lineHeight:1.7}}>{sol.endereco_entrega}</div>
                  </div>
                </div>

                {/* PRODUTOS COM QTDE APROVADA */}
                <div style={{marginBottom:16}}>
                  <div style={{fontSize:'.6rem',textTransform:'uppercase',letterSpacing:'.1em',color:'var(--navy)',fontWeight:700,marginBottom:10}}>Produtos solicitados</div>
                  {itens.map((it, idx) => (
                    <div key={idx} style={{display:'flex',alignItems:'center',gap:12,padding:'10px 14px',background:'var(--bg)',border:'1px solid var(--rule)',borderRadius:4,marginBottom:6}}>
                      <div style={{flex:1,fontWeight:600,fontSize:'.84rem',color:'var(--ink)'}}>{it.nome}</div>
                      <div style={{fontSize:'.72rem',color:'var(--ink3)'}}>Pedido: <strong>{it.quantidade}</strong></div>
                      {sol.status === 'pendente' && (
                        <div style={{display:'flex',alignItems:'center',gap:6}}>
                          <span style={{fontSize:'.65rem',color:'var(--ink3)'}}>Aprovar:</span>
                          <input
                            type="number"
                            min={0}
                            max={it.quantidade}
                            defaultValue={it.quantidade}
                            onChange={e => atualizarQtdAprovada(sol.id, idx, e.target.value)}
                            style={{width:52,padding:'4px 6px',border:'1px solid var(--rule)',borderRadius:4,fontSize:'.8rem',textAlign:'center',outline:'none'}}
                          />
                        </div>
                      )}
                      {sol.status !== 'pendente' && (
                        <div style={{fontSize:'.72rem',color: it.quantidade_aprovada===0?'var(--red)':'var(--teal-d)'}}>
                          Aprovado: <strong>{it.quantidade_aprovada ?? it.quantidade}</strong>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* AÇÕES */}
                <div style={{display:'flex',gap:10,justifyContent:'flex-end'}}>
                  {sol.status === 'pendente' && (
                    <>
                      <button onClick={()=>recusar(sol.id)} disabled={processando===sol.id}
                        style={{padding:'9px 18px',background:'transparent',color:'var(--red)',border:'1px solid var(--red)',borderRadius:4,fontSize:'.78rem',fontWeight:600}}>
                        ✕ Recusar
                      </button>
                      <button onClick={()=>aprovar(sol)} disabled={processando===sol.id}
                        style={{padding:'9px 20px',background:'var(--teal-d)',color:'#fff',border:'none',borderRadius:4,fontSize:'.78rem',fontWeight:700}}>
                        {processando===sol.id?'Processando...':'✓ Aprovar envio'}
                      </button>
                    </>
                  )}
                  {sol.status === 'aprovado' && (
                    <button onClick={()=>marcarEnviado(sol.id)} disabled={processando===sol.id}
                      style={{padding:'9px 20px',background:'var(--green)',color:'#fff',border:'none',borderRadius:4,fontSize:'.78rem',fontWeight:700}}>
                      {processando===sol.id?'Salvando...':'📦 Marcar como enviado'}
                    </button>
                  )}
                  {sol.status === 'enviado' && (
                    <div style={{fontSize:'.78rem',color:'var(--green)',fontWeight:600}}>
                      ✓ Enviado em {sol.enviado_em ? new Date(sol.enviado_em).toLocaleDateString('pt-BR') : '—'}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
