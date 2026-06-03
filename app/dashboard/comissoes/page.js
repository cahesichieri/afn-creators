'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

const fmt = n => (n||0).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2})

export default function Comissoes() {
  const [comissoes, setComissoes] = useState([])
  const [filtro, setFiltro] = useState('pendente')

  useEffect(() => { carregar() }, [filtro])

  async function carregar() {
    const q = supabase.from('comissoes').select('*,creators(nome),campanhas(periodo)').order('created_at',{ascending:false})
    if (filtro !== 'todos') q.eq('status', filtro)
    const { data } = await q
    setComissoes(data||[])
  }

  async function marcarPago(id) {
    await supabase.from('comissoes').update({ status:'pago', data_pagamento: new Date().toISOString().split('T')[0] }).eq('id',id)
    carregar()
  }

  const total = comissoes.reduce((a,c)=>a+(c.valor_liquido||0),0)

  return (
    <div>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:20}}>
        <div style={{display:'flex',gap:8}}>
          {['pendente','aprovado','pago','todos'].map(s=>(
            <button key={s} onClick={()=>setFiltro(s)}
              style={{padding:'7px 14px',borderRadius:4,border:'1px solid var(--rule)',fontSize:'.72rem',fontWeight:600,background:filtro===s?'var(--navy)':'transparent',color:filtro===s?'#fff':'var(--ink3)'}}>
              {s.charAt(0).toUpperCase()+s.slice(1)}
            </button>
          ))}
        </div>
        <div style={{fontSize:'.8rem',fontWeight:700,color:'var(--amber)'}}>
          Total filtrado: R$ {fmt(total)}
        </div>
      </div>

      <div style={{background:'var(--card)',border:'1px solid var(--rule)',borderRadius:6,overflow:'hidden'}}>
        {comissoes.length===0 ? (
          <div style={{textAlign:'center',padding:48,color:'var(--ink3)'}}>
            <div style={{fontSize:'2rem',opacity:.25,marginBottom:10}}>💰</div>
            <p style={{fontSize:'.78rem'}}>Nenhuma comissão encontrada.</p>
          </div>
        ) : (
          <table style={{width:'100%',borderCollapse:'collapse'}}>
            <thead><tr style={{borderBottom:'2px solid var(--navy)'}}>
              {['Creator','Período','Valor Bruto','Valor Líquido','Status','Data Pgto','Ação'].map(h=>(
                <th key={h} style={{fontSize:'.58rem',textTransform:'uppercase',letterSpacing:'.1em',color:'var(--ink3)',fontWeight:700,padding:'10px 14px',textAlign:'left',background:'var(--bg)'}}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {comissoes.map(c=>(
                <tr key={c.id} style={{borderBottom:'1px solid var(--rule)'}}>
                  <td style={{padding:'10px 14px',fontWeight:600,color:'var(--ink)',fontSize:'.82rem'}}>{c.creators?.nome||'—'}</td>
                  <td style={{padding:'10px 14px',fontSize:'.76rem',color:'var(--ink2)'}}>{c.campanhas?.periodo||c.mes_referencia}</td>
                  <td style={{padding:'10px 14px',fontSize:'.76rem',color:'var(--ink2)'}}>R$ {fmt(c.valor_bruto)}</td>
                  <td style={{padding:'10px 14px',fontSize:'.76rem',color:'var(--green)',fontWeight:600}}>R$ {fmt(c.valor_liquido)}</td>
                  <td style={{padding:'10px 14px'}}>
                    <span style={{fontSize:'.6rem',fontWeight:700,padding:'3px 8px',borderRadius:3,background:c.status==='pago'?'var(--green-lt)':c.status==='aprovado'?'var(--teal-lt)':'var(--amber-lt)',color:c.status==='pago'?'var(--green)':c.status==='aprovado'?'var(--teal-d)':'var(--amber)'}}>
                      {c.status}
                    </span>
                  </td>
                  <td style={{padding:'10px 14px',fontSize:'.76rem',color:'var(--ink3)'}}>{c.data_pagamento||'—'}</td>
                  <td style={{padding:'10px 14px'}}>
                    {c.status!=='pago' && (
                      <button onClick={()=>marcarPago(c.id)} style={{fontSize:'.68rem',color:'var(--green)',background:'none',border:'none',fontWeight:600,textDecoration:'underline',textUnderlineOffset:2}}>
                        Marcar pago
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
