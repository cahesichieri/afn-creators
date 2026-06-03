'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter, useParams } from 'next/navigation'

export default function PerfilCreator() {
  const [creator, setCreator] = useState(null)
  const [campanhas, setCampanhas] = useState([])
  const [onboarding, setOnboarding] = useState(null)
  const router = useRouter()
  const params = useParams()

  useEffect(() => {
    if (!params.id) return
    Promise.all([
      supabase.from('creators').select('*,produtos(nome)').eq('id', params.id).single(),
      supabase.from('campanhas').select('periodo,receita,pedidos_pagos,leads').eq('creator_id', params.id).order('created_at',{ascending:false}).limit(12),
      supabase.from('onboarding').select('*').eq('creator_id', params.id).single(),
    ]).then(([{data:c},{data:camps},{data:ob}]) => {
      setCreator(c)
      setCampanhas(camps||[])
      setOnboarding(ob)
    })
  }, [params.id])

  const fmt = n => (n||0).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2})
  const totalReceita = campanhas.reduce((a,c)=>a+(c.receita||0),0)
  const totalVendas = campanhas.reduce((a,c)=>a+(c.pedidos_pagos||0),0)
  const totalLeads = campanhas.reduce((a,c)=>a+(c.leads||0),0)
  const conv = totalLeads>0?(totalVendas/totalLeads*100).toFixed(1):0

  const secTitle = (label) => (
    <div style={{fontSize:'.62rem',textTransform:'uppercase',letterSpacing:'.12em',color:'var(--navy)',fontWeight:700,marginBottom:12,display:'flex',alignItems:'center',gap:8}}>
      <span style={{width:3,height:11,background:'var(--teal)',borderRadius:2,display:'inline-block'}}/>
      {label}
    </div>
  )

  const row = (label, value, copyable=false) => value ? (
    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'8px 0',borderBottom:'1px solid var(--rule)',fontSize:'.8rem'}}>
      <span style={{color:'var(--ink3)'}}>{label}</span>
      <div style={{display:'flex',alignItems:'center',gap:8}}>
        <span style={{fontWeight:600,color:'var(--ink)'}}>{value}</span>
        {copyable && <button onClick={()=>navigator.clipboard.writeText(value)} style={{fontSize:'.62rem',color:'var(--teal-d)',background:'none',border:'none',cursor:'pointer',fontWeight:600}}>copiar</button>}
      </div>
    </div>
  ) : null

  if (!creator) return <div style={{textAlign:'center',padding:48,color:'var(--ink3)'}}>Carregando...</div>

  return (
    <div>
      <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:24}}>
        <button onClick={()=>router.push('/dashboard/creators')} style={{fontSize:'.78rem',color:'var(--ink3)',background:'none',border:'none',cursor:'pointer'}}>← Voltar</button>
        <div style={{flex:1}}/>
        <span style={{fontSize:'.65rem',fontWeight:700,padding:'4px 10px',borderRadius:3,background:creator.status==='ativa'?'var(--green-lt)':creator.status==='recrutamento'?'var(--amber-lt)':'var(--red-lt)',color:creator.status==='ativa'?'var(--green)':creator.status==='recrutamento'?'var(--amber)':'var(--red)'}}>
          {creator.status}
        </span>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>

        {/* COLUNA ESQUERDA */}
        <div style={{display:'flex',flexDirection:'column',gap:16}}>

          {/* IDENTIFICAÇÃO */}
          <div style={{background:'var(--card)',border:'1px solid var(--rule)',borderRadius:6,padding:'18px 20px'}}>
            {secTitle('Identificacao')}
            {row('Nome completo', creator.nome)}
            {row('Instagram', '@'+creator.instagram)}
            {row('Nicho', creator.nicho)}
            {row('Seguidores', (creator.seguidores||0).toLocaleString('pt-BR'))}
            {row('Cidade', creator.cidade)}
            {row('Data de inicio', creator.data_inicio ? new Date(creator.data_inicio+'T00:00:00').toLocaleDateString('pt-BR') : null)}
            {row('Comissao', creator.comissao_pct+'%')}
          </div>

          {/* CONTATO */}
          <div style={{background:'var(--card)',border:'1px solid var(--rule)',borderRadius:6,padding:'18px 20px'}}>
            {secTitle('Contato e dados pessoais')}
            {row('Telefone', creator.telefone, true)}
            {row('WhatsApp', creator.whatsapp, true)}
            {row('E-mail', creator.email || '—')}
            {row('CPF', creator.cpf, true)}
            {row('Data de nascimento', creator.data_nascimento ? new Date(creator.data_nascimento+'T00:00:00').toLocaleDateString('pt-BR') : null)}
          </div>

          {/* ENDEREÇO */}
          <div style={{background:'var(--card)',border:'1px solid var(--rule)',borderRadius:6,padding:'18px 20px'}}>
            {secTitle('Endereco para envio do produto')}
            {creator.cep ? (
              <div style={{background:'var(--bg)',border:'1px solid var(--rule)',borderRadius:4,padding:'12px 14px'}}>
                <div style={{fontSize:'.82rem',color:'var(--ink)',lineHeight:1.8,fontWeight:500}}>
                  {creator.endereco}, {creator.numero}{creator.complemento?' - '+creator.complemento:''}<br/>
                  {creator.bairro} · {creator.cidade}/{creator.estado}<br/>
                  CEP: {creator.cep}
                </div>
                <button onClick={()=>navigator.clipboard.writeText(`${creator.endereco}, ${creator.numero}${creator.complemento?' - '+creator.complemento:''}, ${creator.bairro}, ${creator.cidade}/${creator.estado}, CEP ${creator.cep}`)}
                  style={{marginTop:10,fontSize:'.68rem',color:'var(--teal-d)',background:'none',border:'1px solid var(--rule)',borderRadius:3,padding:'4px 10px',cursor:'pointer',fontWeight:600}}>
                  Copiar endereco completo
                </button>
              </div>
            ) : <div style={{fontSize:'.78rem',color:'var(--ink3)'}}>Endereco nao cadastrado.</div>}
          </div>
        </div>

        {/* COLUNA DIREITA */}
        <div style={{display:'flex',flexDirection:'column',gap:16}}>

          {/* PERFORMANCE */}
          <div style={{background:'var(--card)',border:'1px solid var(--rule)',borderRadius:6,padding:'18px 20px'}}>
            {secTitle('Performance acumulada')}
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:12}}>
              {[['Receita total','R$ '+fmt(totalReceita),'var(--green)'],['Conversao media',conv+'%','var(--navy)'],['Total de vendas',totalVendas,'var(--teal-d)'],['Campanhas',campanhas.length,'var(--amber)']].map(([l,v,c])=>(
                <div key={l} style={{background:'var(--bg)',border:'1px solid var(--rule)',borderRadius:4,padding:'10px 12px'}}>
                  <div style={{fontSize:'.58rem',textTransform:'uppercase',letterSpacing:'.1em',color:'var(--ink3)',fontWeight:700,marginBottom:4}}>{l}</div>
                  <div style={{fontFamily:'var(--serif)',fontSize:'1.3rem',fontWeight:700,color:c}}>{v}</div>
                </div>
              ))}
            </div>
          </div>

          {/* DADOS BANCÁRIOS */}
          <div style={{background:'var(--card)',border:'1px solid var(--rule)',borderRadius:6,padding:'18px 20px'}}>
            {secTitle('Dados bancarios e PIX')}
            {creator.pix_chave ? (<>
              <div style={{background:'var(--teal-lt)',border:'1px solid var(--rule)',borderLeft:'3px solid var(--teal-d)',borderRadius:4,padding:'12px 14px',marginBottom:12}}>
                <div style={{fontSize:'.6rem',textTransform:'uppercase',letterSpacing:'.1em',color:'var(--teal-d)',fontWeight:700,marginBottom:4}}>Chave PIX</div>
                <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                  <div>
                    <div style={{fontSize:'.88rem',fontWeight:700,color:'var(--navy)'}}>{creator.pix_chave}</div>
                    <div style={{fontSize:'.7rem',color:'var(--ink3)',marginTop:2}}>{creator.pix_tipo} · {creator.titular_conta}</div>
                  </div>
                  <button onClick={()=>navigator.clipboard.writeText(creator.pix_chave)} style={{fontSize:'.68rem',color:'var(--teal-d)',background:'none',border:'1px solid var(--rule)',borderRadius:3,padding:'4px 10px',cursor:'pointer',fontWeight:600}}>Copiar</button>
                </div>
              </div>
              {row('Banco', creator.banco)}
              {row('Agencia', creator.agencia)}
              {row('Conta', creator.conta)}
              {row('Tipo', creator.tipo_conta)}
            </>) : <div style={{fontSize:'.78rem',color:'var(--ink3)'}}>Dados bancarios nao cadastrados.</div>}
          </div>

          {/* OBSERVAÇÕES */}
          {creator.obs_internas && (
            <div style={{background:'var(--amber-lt)',border:'1px solid var(--rule)',borderLeft:'3px solid var(--amber)',borderRadius:6,padding:'14px 16px'}}>
              <div style={{fontSize:'.6rem',textTransform:'uppercase',letterSpacing:'.1em',color:'var(--amber)',fontWeight:700,marginBottom:6}}>Obs. internas</div>
              <div style={{fontSize:'.78rem',color:'var(--ink2)',lineHeight:1.6}}>{creator.obs_internas}</div>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
