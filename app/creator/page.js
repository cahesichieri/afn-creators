'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
const fmt = n => (n||0).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2})
export default function PortalCreator() {
  const [creator, setCreator] = useState(null)
  const [campanhas, setCampanhas] = useState([])
  const [roteiros, setRoteiros] = useState([])
  const [comissoes, setComissoes] = useState([])
  const [aba, setAba] = useState('metricas')
  const [semOnboarding, setSemOnboarding] = useState(false)
  const [carregando, setCarregando] = useState(true)
  const [erroAcesso, setErroAcesso] = useState(null)
  const router = useRouter()
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) { router.push('/login'); return }
      supabase.from('perfis').select('tipo').eq('id',data.user.id).single().then(({data:p})=>{
        if (p?.tipo !== 'creator') { router.push('/dashboard'); return }
      })
      supabase.from('creators').select('*,produtos(nome)').eq('user_id',data.user.id).single().then(({data:c, error})=>{
        if (error || !c) { setErroAcesso('perfil_incompleto'); setCarregando(false); return }
        setCreator(c)
        setCarregando(false)
        supabase.from('campanhas').select('*').eq('creator_id',c.id).order('created_at',{ascending:false}).then(({data:cs})=>setCampanhas(cs||[]))
        supabase.from('roteiros').select('*').eq('creator_id',c.id).order('data_post',{ascending:true}).then(({data:rs})=>setRoteiros(rs||[]))
        supabase.from('comissoes').select('*').eq('creator_id',c.id).order('created_at',{ascending:false}).then(({data:cms})=>setComissoes(cms||[]))
        supabase.from('onboarding').select('id').eq('creator_id',c.id).single().then(({data:ob})=>{ if(!ob) setSemOnboarding(true) })
      })
    })
  }, [])
  async function sair() { await supabase.auth.signOut(); router.push('/login') }
  if (carregando) return (
    <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',flexDirection:'column',gap:12,background:'var(--bg)'}}>
      <div style={{width:36,height:36,border:'3px solid var(--rule)',borderTop:'3px solid var(--teal)',borderRadius:'50%',animation:'spin 1s linear infinite'}}></div>
      <p style={{color:'var(--ink3)',fontSize:'.82rem'}}>Carregando seu portal...</p>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
  if (erroAcesso === 'perfil_incompleto') return (
    <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'var(--bg)',padding:24}}>
      <div style={{maxWidth:440,background:'var(--card)',border:'1px solid var(--rule)',borderRadius:8,padding:32,textAlign:'center'}}>
        <div style={{fontSize:'2.5rem',marginBottom:16}}>⚠️</div>
        <h2 style={{fontFamily:'var(--serif)',fontSize:'1.2rem',fontWeight:700,color:'var(--teal)',marginBottom:12}}>Perfil em processamento</h2>
        <p style={{fontSize:'.85rem',color:'var(--ink2)',lineHeight:1.6,marginBottom:24}}>Seu cadastro foi recebido! Clique em Tentar novamente ou recarregue a página.</p>
        <button onClick={()=>window.location.reload()} style={{background:'var(--teal)',color:'#fff',border:'none',borderRadius:4,padding:'10px 24px',fontSize:'.85rem',fontWeight:600,cursor:'pointer',marginRight:8}}>Tentar novamente</button>
        <button onClick={sair} style={{background:'transparent',color:'var(--ink3)',border:'1px solid var(--rule)',borderRadius:4,padding:'10px 24px',fontSize:'.85rem',cursor:'pointer'}}>Sair</button>
      </div>
    </div>
  )
  if (semOnboarding) return (
    <div style={{minHeight:'100vh',background:'var(--bg)',display:'flex',alignItems:'center',justifyContent:'center',padding:24}}>
      <div style={{maxWidth:480,background:'var(--card)',border:'1px solid var(--rule)',borderRadius:8,overflow:'hidden'}}>
        <div style={{background:'var(--navy)',padding:'28px 32px'}}>
          <div style={{fontFamily:'var(--serif)',fontSize:'.72rem',fontWeight:600,letterSpacing:'.2em',textTransform:'uppercase',color:'var(--teal)',marginBottom:8}}>A Farmácia Natural</div>
          <div style={{fontFamily:'var(--serif)',fontSize:'1.8rem',fontWeight:700,color:'#fff',lineHeight:1.1}}>Bem-vinda,<br/>{creator.nome.split(' ')[0]}! 🌿</div>
        </div>
        <div style={{padding:'28px 32px'}}>
          <p style={{fontSize:'.85rem',color:'var(--ink2)',lineHeight:1.7,marginBottom:24}}>Antes de começar, precisamos conhecer melhor você e o seu público. Isso leva menos de 5 minutos.</p>
          <a href="/creator/onboarding" style={{display:'block',background:'var(--navy)',color:'#fff',border:'none',borderRadius:4,padding:'12px',fontSize:'.85rem',fontWeight:700,textAlign:'center',textDecoration:'none'}}>Preencher meu perfil →</a>
        </div>
      </div>
    </div>
  )
  const totalComissoes = comissoes.filter(c=>c.status!=='pago').reduce((a,c)=>a+(c.valor_liquido||0),0)
  const totalPago = comissoes.filter(c=>c.status==='pago').reduce((a,c)=>a+(c.valor_liquido||0),0)
  const totalReceita = campanhas.reduce((a,c)=>a+(c.receita||0),0)
  const tipoColors = { educativo:'var(--teal-d)', indireto:'var(--amber)', cta:'var(--green)', lifestyle:'var(--navy)' }
  const tipoBg = { educativo:'var(--teal-lt)', indireto:'var(--amber-lt)', cta:'var(--green-lt)', lifestyle:'var(--navy-xs)' }
  return (
    <div style={{minHeight:'100vh',background:'var(--bg)'}}>
      <div style={{background:'var(--navy)',padding:'16px 32px',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
        <div>
          <div style={{fontFamily:'var(--serif)',fontSize:'.72rem',fontWeight:600,letterSpacing:'.2em',textTransform:'uppercase',color:'var(--teal)',marginBottom:3}}>A Farmácia Natural</div>
          <div style={{fontSize:'.9rem',fontWeight:700,color:'#fff'}}>Olá, {creator.nome.split(' ')[0]} 👋</div>
        </div>
        <a href="/creator/bancario" style={{fontSize:'.7rem',color:'rgba(255,255,255,.6)',background:'rgba(255,255,255,.08)',border:'1px solid rgba(255,255,255,.15)',borderRadius:3,padding:'5px 12px',textDecoration:'none',marginRight:8}}>Dados bancarios</a>
        <button onClick={sair} style={{fontSize:'.7rem',color:'rgba(255,255,255,.4)',background:'none',border:'1px solid rgba(255,255,255,.1)',borderRadius:3,padding:'5px 12px'}}>Sair</button>
      </div>
      <div style={{padding:'24px 32px'}}>
        <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12,marginBottom:24}}>
          {[['Campanhas',campanhas.length,'var(--teal-d)'],['Receita Gerada',`R$${fmt(totalReceita)}`,'var(--green)'],['A Receber',`R$${fmt(totalComissoes)}`,'var(--amber)'],['Já Recebido',`R$${fmt(totalPago)}`,'var(--navy)']].map(([l,v,c])=>(
            <div key={l} style={{background:'var(--card)',border:'1px solid var(--rule)',borderTop:`3px solid ${c}`,borderRadius:6,padding:'14px 16px'}}>
              <div style={{fontSize:'.58rem',textTransform:'uppercase',letterSpacing:'.12em',color:'var(--ink3)',fontWeight:700,marginBottom:6}}>{l}</div>
              <div style={{fontFamily:'var(--serif)',fontSize:'1.5rem',fontWeight:700,color:c,lineHeight:1}}>{v}</div>
            </div>
          ))}
        </div>
        <div style={{display:'flex',gap:0,border:'1px solid var(--rule)',borderRadius:6,overflow:'hidden',marginBottom:20,background:'var(--card)'}}>
          {[['metricas','📊 Métricas'],['roteiros','📝 Roteiros'],['comissoes','💰 Comissões']].map(([id,label])=>(
            <button key={id} onClick={()=>setAba(id)} style={{flex:1,padding:'10px',fontSize:'.76rem',fontWeight:600,color:aba===id?'#fff':'var(--ink3)',background:aba===id?'var(--navy)':'transparent',border:'none',borderRight:'1px solid var(--rule)'}}>{label}</button>
          ))}
        </div>
        {aba==='metricas' && (
          <div style={{background:'var(--card)',border:'1px solid var(--rule)',borderRadius:6,overflow:'hidden'}}>
            {campanhas.length===0 ? <div style={{textAlign:'center',padding:40,color:'var(--ink3)',fontSize:'.78rem'}}>Nenhuma campanha ainda.</div> : (
              <table style={{width:'100%',borderCollapse:'collapse'}}>
                <thead><tr style={{borderBottom:'2px solid var(--navy)'}}>{['Período','Leads','Vendas','Conversão','Receita'].map(h=><th key={h} style={{fontSize:'.58rem',textTransform:'uppercase',letterSpacing:'.1em',color:'var(--ink3)',fontWeight:700,padding:'10px 14px',textAlign:'left',background:'var(--bg)'}}>{h}</th>)}</tr></thead>
                <tbody>{campanhas.map(c=>{ const conv = c.leads>0?(c.pedidos_pagos/c.leads*100).toFixed(1):0; return <tr key={c.id} style={{borderBottom:'1px solid var(--rule)'}}><td style={{padding:'10px 14px',fontWeight:600,fontSize:'.82rem'}}>{c.periodo}</td><td style={{padding:'10px 14px',fontSize:'.76rem',color:'var(--ink2)'}}>{(c.leads||0).toLocaleString('pt-BR')}</td><td style={{padding:'10px 14px',fontSize:'.76rem',color:'var(--ink2)'}}>{c.pedidos_pagos||0}</td><td style={{padding:'10px 14px'}}><span style={{fontSize:'.62rem',fontWeight:700,padding:'3px 8px',borderRadius:3,background:parseFloat(conv)>=5?'var(--green-lt)':parseFloat(conv)>=2?'var(--amber-lt)':'var(--red-lt)',color:parseFloat(conv)>=5?'var(--green)':parseFloat(conv)>=2?'var(--amber)':'var(--red)'}}>{conv}%</span></td><td style={{padding:'10px 14px',fontSize:'.76rem',color:'var(--green)',fontWeight:600}}>R$ {fmt(c.receita)}</td></tr> })}</tbody>
              </table>
            )}
          </div>
        )}
        {aba==='roteiros' && (
          <div style={{display:'grid',gap:10}}>
            {roteiros.length===0 ? <div style={{textAlign:'center',padding:40,color:'var(--ink3)',fontSize:'.78rem',background:'var(--card)',border:'1px solid var(--rule)',borderRadius:6}}>Nenhum roteiro disponível.</div>
            : roteiros.map(r=>(
              <div key={r.id} style={{background:'var(--card)',border:'1px solid var(--rule)',borderRadius:6,overflow:'hidden'}}>
                <div style={{display:'flex',alignItems:'center',gap:10,padding:'10px 14px',background:'var(--bg)',borderBottom:'1px solid var(--rule)'}}>
                  <span style={{fontSize:'.6rem',fontWeight:700,padding:'2px 7px',borderRadius:3,background:tipoBg[r.tipo],color:tipoColors[r.tipo]}}>{r.tipo}</span>
                  <span style={{fontSize:'.78rem',fontWeight:600,color:'var(--ink)'}}>{r.tema}</span>
                  {r.data_post && <span style={{fontSize:'.7rem',color:'var(--ink3)',marginLeft:'auto'}}>{new Date(r.data_post+'T00:00:00').toLocaleDateString('pt-BR')}</span>}
                </div>
                <div style={{padding:'12px 14px',display:'grid',gap:5}}>
                  {[['Gancho 01',r.gancho_01,'#f0eeff','var(--navy)'],['Premissa 01',r.premissa_01,'#edfbff','#1a6e8a'],['Premissa 02',r.premissa_02,'#edfbff','#1a6e8a'],['Gancho 02',r.gancho_02,'#f0eeff','var(--navy)'],['CTA',r.cta,'var(--green-lt)','var(--green)']].filter(([,v])=>v).map(([label,val,bg,color])=>(
                    <div key={label} style={{display:'grid',gridTemplateColumns:'90px 1fr',border:'1px solid var(--rule)',borderRadius:3,overflow:'hidden'}}>
                      <div style={{padding:'7px 10px',background:bg,borderRight:'1px solid var(--rule)',fontSize:'.58rem',textTransform:'uppercase',letterSpacing:'.1em',fontWeight:700,color,display:'flex',alignItems:'center'}}>{label}</div>
                      <div style={{padding:'7px 12px',fontSize:'.78rem',color:'var(--ink)',lineHeight:1.5}}>{val}</div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
        {aba==='comissoes' && (
          <div style={{background:'var(--card)',border:'1px solid var(--rule)',borderRadius:6,overflow:'hidden'}}>
            {comissoes.length===0 ? <div style={{textAlign:'center',padding:40,color:'var(--ink3)',fontSize:'.78rem'}}>Nenhuma comissão ainda.</div> : (
              <table style={{width:'100%',borderCollapse:'collapse'}}>
                <thead><tr style={{borderBottom:'2px solid var(--navy)'}}>{['Período','Valor','Status','Data Pgto'].map(h=><th key={h} style={{fontSize:'.58rem',textTransform:'uppercase',letterSpacing:'.1em',color:'var(--ink3)',fontWeight:700,padding:'10px 14px',textAlign:'left',background:'var(--bg)'}}>{h}</th>)}</tr></thead>
                <tbody>{comissoes.map(c=>(<tr key={c.id} style={{borderBottom:'1px solid var(--rule)'}}><td style={{padding:'10px 14px',fontWeight:600,fontSize:'.82rem'}}>{c.mes_referencia}</td><td style={{padding:'10px 14px',fontSize:'.76rem',color:'var(--green)',fontWeight:600}}>R$ {fmt(c.valor_liquido)}</td><td style={{padding:'10px 14px'}}><span style={{fontSize:'.6rem',fontWeight:700,padding:'3px 8px',borderRadius:3,background:c.status==='pago'?'var(--green-lt)':'var(--amber-lt)',color:c.status==='pago'?'var(--green)':'var(--amber)'}}>{c.status}</span></td><td style={{padding:'10px 14px',fontSize:'.76rem',color:'var(--ink3)'}}>{c.data_pagamento||'Pendente'}</td></tr>))}</tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
