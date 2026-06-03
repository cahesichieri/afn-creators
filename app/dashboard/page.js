'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

const fmt = n => (n||0).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2})

export default function Dashboard() {
  const [stats, setStats] = useState({ creators:0, receita:0, comissoes:0, campanhas:0, conversao:0 })
  const [recentes, setRecentes] = useState([])

  useEffect(() => {
    async function load() {
      const [{ count: nc }, { data: campanhas }, { data: comissoes }] = await Promise.all([
        supabase.from('creators').select('id',{count:'exact',head:true}).eq('status','ativa'),
        supabase.from('campanhas').select('receita,pedidos_pagos,leads,creator_id,periodo,creators(nome)').order('created_at',{ascending:false}).limit(8),
        supabase.from('comissoes').select('valor_liquido,status'),
      ])
      const totalReceita = campanhas?.reduce((a,c)=>a+(c.receita||0),0)||0
      const totalComissoes = comissoes?.filter(c=>c.status!=='pago').reduce((a,c)=>a+(c.valor_liquido||0),0)||0
      const totalPagos = campanhas?.reduce((a,c)=>a+(c.pedidos_pagos||0),0)||0
      const totalLeads = campanhas?.reduce((a,c)=>a+(c.leads||0),0)||0
      setStats({ creators:nc||0, receita:totalReceita, comissoes:totalComissoes, campanhas:campanhas?.length||0, conversao:totalLeads>0?(totalPagos/totalLeads*100):0 })
      setRecentes(campanhas||[])
    }
    load()
  }, [])

  const cards = [
    { label:'Creators ativas', val:stats.creators, color:'var(--teal-d)', fmt:'num' },
    { label:'Receita total', val:stats.receita, color:'var(--green)', fmt:'brl' },
    { label:'Conversão média', val:stats.conversao, color:'var(--navy)', fmt:'pct' },
    { label:'Comissões a pagar', val:stats.comissoes, color:'var(--amber)', fmt:'brl' },
    { label:'Campanhas registradas', val:stats.campanhas, color:'var(--teal-d)', fmt:'num' },
  ]

  return (
    <div>
      <div style={{fontSize:'.6rem',textTransform:'uppercase',letterSpacing:'.2em',color:'var(--teal)',fontWeight:700,marginBottom:16,display:'flex',alignItems:'center',gap:10}}>
        Visão geral <span style={{flex:1,height:1,background:'var(--rule)',display:'block'}}/>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'repeat(5,1fr)',gap:12,marginBottom:28}}>
        {cards.map((c,i) => (
          <div key={i} style={{background:'var(--card)',border:'1px solid var(--rule)',borderTop:`3px solid ${c.color}`,borderRadius:6,padding:'16px'}}>
            <div style={{fontSize:'.58rem',textTransform:'uppercase',letterSpacing:'.12em',color:'var(--ink3)',fontWeight:700,marginBottom:8}}>{c.label}</div>
            <div style={{fontFamily:'var(--serif)',fontSize:'1.7rem',fontWeight:700,color:c.color,lineHeight:1}}>
              {c.fmt==='brl'?`R$${fmt(c.val)}`:c.fmt==='pct'?`${(c.val||0).toFixed(1)}%`:(c.val||0)}
            </div>
          </div>
        ))}
      </div>

      <div style={{fontSize:'.6rem',textTransform:'uppercase',letterSpacing:'.2em',color:'var(--teal)',fontWeight:700,marginBottom:16,display:'flex',alignItems:'center',gap:10}}>
        Campanhas recentes <span style={{flex:1,height:1,background:'var(--rule)',display:'block'}}/>
      </div>

      <div style={{background:'var(--card)',border:'1px solid var(--rule)',borderRadius:6,overflow:'hidden'}}>
        {recentes.length === 0 ? (
          <div style={{textAlign:'center',padding:48,color:'var(--ink3)'}}>
            <div style={{fontSize:'2rem',opacity:.25,marginBottom:10}}>📭</div>
            <p style={{fontSize:'.78rem'}}>Nenhuma campanha ainda. <Link href="/dashboard/campanhas" style={{color:'var(--teal-d)',fontWeight:600}}>Inserir primeira →</Link></p>
          </div>
        ) : (
          <table style={{width:'100%',borderCollapse:'collapse'}}>
            <thead><tr style={{borderBottom:'2px solid var(--navy)'}}>
              {['Creator','Período','Leads','Vendas','Conversão','Receita'].map(h=>(
                <th key={h} style={{fontSize:'.58rem',textTransform:'uppercase',letterSpacing:'.1em',color:'var(--ink3)',fontWeight:700,padding:'11px 14px',textAlign:'left',background:'var(--bg)'}}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {recentes.map(c => {
                const conv = c.leads>0?(c.pedidos_pagos/c.leads*100).toFixed(1):0
                return (
                  <tr key={c.id} style={{borderBottom:'1px solid var(--rule)'}}>
                    <td style={{padding:'11px 14px',fontWeight:600,color:'var(--ink)'}}>{c.creators?.nome||'—'}</td>
                    <td style={{padding:'11px 14px',fontSize:'.78rem',color:'var(--ink2)'}}>{c.periodo}</td>
                    <td style={{padding:'11px 14px',fontSize:'.78rem',color:'var(--ink2)'}}>{(c.leads||0).toLocaleString('pt-BR')}</td>
                    <td style={{padding:'11px 14px',fontSize:'.78rem',color:'var(--ink2)'}}>{c.pedidos_pagos||0}</td>
                    <td style={{padding:'11px 14px'}}>
                      <span style={{fontSize:'.65rem',fontWeight:700,padding:'3px 8px',borderRadius:3,background:parseFloat(conv)>=5?'var(--green-lt)':parseFloat(conv)>=2?'var(--amber-lt)':'var(--red-lt)',color:parseFloat(conv)>=5?'var(--green)':parseFloat(conv)>=2?'var(--amber)':'var(--red)'}}>
                        {conv}%
                      </span>
                    </td>
                    <td style={{padding:'11px 14px',fontSize:'.78rem',color:'var(--green)',fontWeight:600}}>R$ {fmt(c.receita)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
