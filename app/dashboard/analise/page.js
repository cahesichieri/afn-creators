'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function AnaliseIA() {
  const [campanhas, setCampanhas] = useState([])
  const [creators, setCreators] = useState([])
  const [tipo, setTipo] = useState('geral')
  const [creatorFiltro, setCreatorFiltro] = useState('')
  const [resposta, setResposta] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    supabase.from('campanhas').select('*,creators(nome)').order('created_at',{ascending:false}).limit(100)
      .then(({data})=>setCampanhas(data||[]))
    supabase.from('creators').select('id,nome').order('nome')
      .then(({data})=>setCreators(data||[]))
  }, [])

  async function analisar() {
    if (!campanhas.length) { alert('Insira campanhas antes de analisar.'); return }
    setLoading(true); setResposta('')
    const dados = creatorFiltro ? campanhas.filter(c=>c.creator_id===creatorFiltro) : campanhas
    const tipoLabel = { geral:'Diagnóstico geral completo', creator:'Análise detalhada da creator', conteudo:'O que repetir e melhorar no conteúdo', funil:'Diagnóstico do funil de conversão', proxima:'Recomendações para próxima campanha' }[tipo]
    const resumo = dados.map(c=>{
      const conv = c.leads>0?(c.pedidos_pagos/c.leads*100).toFixed(2):0
      return `${c.creators?.nome} · ${c.periodo} | Conv: ${conv}% | Receita: R$${c.receita||0} | Leads: ${c.leads||0} | Pagos: ${c.pedidos_pagos||0}
Reels: ${c.reels||0} | Stories CTA: ${c.stories_cta||0} | Melhor formato: ${c.melhor_formato||'—'}
Funcionou: ${c.positivo||'—'} | Não funcionou: ${c.negativo||'—'}
${c.analise_ia?`IA prévia: ${c.analise_ia.substring(0,200)}`:''}`
    }).join('\n---\n')
    try {
      const res = await fetch('https://api.anthropic.com/v1/messages',{
        method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({model:'claude-sonnet-4-20250514',max_tokens:1000,messages:[{role:'user',content:`Especialista em marketing de influência para nutracêuticos femininos. Marca: A Farmácia Natural (AFN). Técnica das Premissas: Reels engajam, Stories convertem. Comissão 15%.\n\nANÁLISE: ${tipoLabel}\n\nDADOS:\n${resumo}\n\nResponda em português, direto e acionável:\n## Diagnóstico Geral\n## Pontos Fortes\n## Falhas\n## O que Repetir\n## O que Mudar\n## Recomendações Prioritárias (numeradas)`}]})
      })
      const d = await res.json()
      setResposta(d.content?.find(b=>b.type==='text')?.text||'Erro ao obter resposta.')
    } catch { setResposta('Erro de conexão.') }
    setLoading(false)
  }

  const fmt = t => t.replace(/^## (.+)$/gm,'<h4 style="font-size:.68rem;text-transform:uppercase;letter-spacing:.14em;color:var(--navy);font-weight:700;margin:16px 0 8px;padding-bottom:6px;border-bottom:1px solid var(--rule)">$1</h4>').replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>').replace(/^(\d+\.) (.+)$/gm,'<li>$2</li>').replace(/^[-•] (.+)$/gm,'<li>$1</li>').replace(/(<li>.*<\/li>\n?)+/g,m=>`<ul style="padding-left:18px;margin:6px 0 10px">${m}</ul>`).replace(/\n\n/g,'<br><br>').replace(/\n/g,'<br>')

  return (
    <div>
      <div style={{background:'var(--navy)',borderRadius:6,overflow:'hidden',marginBottom:24}}>
        <div style={{padding:'14px 20px',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
          <div style={{display:'flex',alignItems:'center',gap:10}}>
            <div style={{width:7,height:7,background:'var(--teal)',borderRadius:'50%',animation:'pulse 2s infinite'}}/>
            <span style={{fontSize:'.78rem',fontWeight:600,color:'#fff'}}>Análise Inteligente · Claude</span>
          </div>
          <div style={{display:'flex',gap:8}}>
            <select value={tipo} onChange={e=>setTipo(e.target.value)} style={{fontFamily:'var(--font)',fontSize:'.72rem',background:'rgba(255,255,255,.1)',border:'1px solid rgba(255,255,255,.15)',color:'rgba(255,255,255,.85)',padding:'6px 10px',borderRadius:4,outline:'none'}}>
              <option value="geral">Diagnóstico geral</option>
              <option value="creator">Creator específica</option>
              <option value="conteudo">Conteúdo: repetir e melhorar</option>
              <option value="funil">Diagnóstico de funil</option>
              <option value="proxima">Próxima campanha</option>
            </select>
            <select value={creatorFiltro} onChange={e=>setCreatorFiltro(e.target.value)} style={{fontFamily:'var(--font)',fontSize:'.72rem',background:'rgba(255,255,255,.1)',border:'1px solid rgba(255,255,255,.15)',color:'rgba(255,255,255,.85)',padding:'6px 10px',borderRadius:4,outline:'none'}}>
              <option value="">Todas as creators</option>
              {creators.map(c=><option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
            <button onClick={analisar} disabled={loading} style={{background:'var(--teal)',color:'var(--navy)',border:'none',borderRadius:4,padding:'7px 16px',fontSize:'.74rem',fontWeight:700}}>
              {loading?'Analisando...':'Analisar →'}
            </button>
          </div>
        </div>
        <div style={{background:'var(--card)',margin:'0 1px 1px',borderRadius:'0 0 5px 5px',padding:22,minHeight:140}}>
          {loading ? (
            <div style={{display:'flex',alignItems:'center',gap:12,color:'var(--ink3)',fontSize:'.78rem',height:80}}>
              <div style={{width:18,height:18,border:'2px solid var(--rule)',borderTopColor:'var(--teal-d)',borderRadius:'50%',animation:'spin .8s linear infinite'}}/>
              Analisando os dados...
            </div>
          ) : resposta ? (
            <div style={{fontSize:'.82rem',lineHeight:1.75,color:'var(--ink)'}} dangerouslySetInnerHTML={{__html:fmt(resposta)}}/>
          ) : (
            <div style={{textAlign:'center',padding:'40px 0',color:'var(--ink3)'}}>
              <div style={{fontSize:'2rem',opacity:.2,marginBottom:10}}>🔍</div>
              <p style={{fontSize:'.76rem',lineHeight:1.65}}>Selecione o tipo de análise e clique em <strong style={{color:'var(--navy)'}}>Analisar</strong>.</p>
            </div>
          )}
        </div>
      </div>
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}} @keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}
