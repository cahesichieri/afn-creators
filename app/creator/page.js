'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

const fmt = n => (n||0).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2})
const tipoColors = { educativo:'var(--teal-d)', indireto:'var(--amber)', cta:'var(--green)', lifestyle:'var(--navy)' }
const tipoBg = { educativo:'var(--teal-lt)', indireto:'var(--amber-lt)', cta:'var(--green-lt)', lifestyle:'var(--navy-xs)' }

export default function PortalCreator() {
  const [creator, setCreator] = useState(null)
  const [produtos, setProdutos] = useState([])
  const [campanhas, setCampanhas] = useState([])
  const [roteiros, setRoteiros] = useState([])
  const [comissoes, setComissoes] = useState([])
  const [amostras, setAmostras] = useState([])
  const [aba, setAba] = useState('campanhas')
  const [semOnboarding, setSemOnboarding] = useState(false)
  const [carregando, setCarregando] = useState(true)
  const [modalAmostra, setModalAmostra] = useState(false)
  const [pedido, setPedido] = useState([])
  const [enviandoPedido, setEnviandoPedido] = useState(false)
  const router = useRouter()

  useEffect(() => {
    async function init() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }
      const uid = session.user.id
      const { data: c } = await supabase.from('creators').select('*,produtos(nome)').eq('user_id', uid).single()
      if (!c) { setCarregando(false); return }
      setCreator(c)
      setCarregando(false)
      const [{ data: cs }, { data: rs }, { data: cms }, { data: ob }, { data: ps }, { data: am }] = await Promise.all([
        supabase.from('campanhas').select('*').eq('creator_id',c.id).order('created_at',{ascending:false}),
        supabase.from('roteiros').select('*').eq('creator_id',c.id).order('data_post',{ascending:true}),
        supabase.from('comissoes').select('*').eq('creator_id',c.id).order('created_at',{ascending:false}),
        supabase.from('onboarding').select('id').eq('creator_id',c.id).single(),
        supabase.from('produtos').select('id,nome,preco').eq('ativo',true),
        supabase.from('amostras').select('*').eq('creator_id',c.id).order('created_at',{ascending:false}),
      ])
      setCampanhas(cs||[]); setRoteiros(rs||[]); setComissoes(cms||[])
      setProdutos(ps||[]); setAmostras(am||[])
      if (!ob) setSemOnboarding(true)
    }
    init()
  }, [])

  async function sair() { await supabase.auth.signOut(); router.push('/login') }

  function toggleProduto(id) {
    setPedido(p => {
      const exists = p.find(x => x.produto_id === id)
      if (exists) return p.filter(x => x.produto_id !== id)
      return [...p, { produto_id: id, quantidade: 1 }]
    })
  }

  function setQtd(id, qtd) {
    setPedido(p => p.map(x => x.produto_id === id ? { ...x, quantidade: Math.max(1, parseInt(qtd)||1) } : x))
  }

  async function enviarPedido() {
    if (!pedido.length) { alert('Selecione ao menos um produto.'); return }
    setEnviandoPedido(true)
    const itens = pedido.map(p => {
      const prod = produtos.find(x => x.id === p.produto_id)
      return { produto_id: p.produto_id, nome: prod?.nome, quantidade: p.quantidade }
    })
    await supabase.from('amostras').insert({
      creator_id: creator.id,
      itens: JSON.stringify(itens),
      endereco_entrega: `${creator.endereco}, ${creator.numero}${creator.complemento ? ' '+creator.complemento : ''} — ${creator.bairro}, ${creator.cidade}/${creator.estado} — CEP ${creator.cep}`,
      status: 'pendente'
    })
    setModalAmostra(false)
    setPedido([])
    setEnviandoPedido(false)
    const { data: am } = await supabase.from('amostras').select('*').eq('creator_id',creator.id).order('created_at',{ascending:false})
    setAmostras(am||[])
  }

  if (carregando) return (
    <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',flexDirection:'column',gap:12,background:'var(--bg)'}}>
      <div style={{width:36,height:36,border:'3px solid var(--rule)',borderTop:'3px solid var(--teal)',borderRadius:'50%',animation:'spin 1s linear infinite'}}/>
      <p style={{color:'var(--ink3)',fontSize:'.82rem'}}>Carregando seu portal...</p>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  if (!creator) return (
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

  const statusAmostraColor = { pendente:'var(--amber)', aprovado:'var(--teal-d)', enviado:'var(--green)', recusado:'var(--red)' }
  const statusAmostraBg = { pendente:'var(--amber-lt)', aprovado:'var(--teal-lt)', enviado:'var(--green-lt)', recusado:'var(--red-lt)' }

  return (
    <div style={{minHeight:'100vh',background:'var(--bg)'}}>
      {/* HEADER */}
      <div style={{background:'var(--navy)',padding:'14px 16px',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
        <div>
          <div style={{fontFamily:'var(--serif)',fontSize:'.65rem',fontWeight:600,letterSpacing:'.2em',textTransform:'uppercase',color:'var(--teal)',marginBottom:2}}>A Farmácia Natural</div>
          <div style={{fontSize:'.88rem',fontWeight:700,color:'#fff'}}>Olá, {creator.nome.split(' ')[0]} 👋</div>
        </div>
        <div style={{display:'flex',gap:8}}>
          <a href="/creator/bancario" style={{fontSize:'.7rem',color:'rgba(255,255,255,.6)',background:'rgba(255,255,255,.08)',border:'1px solid rgba(255,255,255,.15)',borderRadius:3,padding:'5px 10px',textDecoration:'none'}}>Dados bancários</a>
          <button onClick={sair} style={{fontSize:'.7rem',color:'rgba(255,255,255,.4)',background:'none',border:'1px solid rgba(255,255,255,.1)',borderRadius:3,padding:'5px 10px'}}>Sair</button>
        </div>
      </div>

      <div style={{padding:'16px'}}>
        {/* CARDS MÉTRICAS */}
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:16}}>
          {[
            ['Campanhas', campanhas.length, 'var(--teal-d)'],
            ['Receita Gerada', 'R$'+fmt(totalReceita), 'var(--green)'],
            ['A Receber', 'R$'+fmt(totalComissoes), 'var(--amber)'],
            ['Já Recebido', 'R$'+fmt(totalPago), 'var(--navy)']
          ].map(([l,v,c])=>(
            <div key={l} style={{background:'var(--card)',border:'1px solid var(--rule)',borderTop:'3px solid '+c,borderRadius:6,padding:'12px 14px'}}>
              <div style={{fontSize:'.55rem',textTransform:'uppercase',letterSpacing:'.12em',color:'var(--ink3)',fontWeight:700,marginBottom:4}}>{l}</div>
              <div style={{fontFamily:'var(--serif)',fontSize:'1.3rem',fontWeight:700,color:c,lineHeight:1}}>{v}</div>
            </div>
          ))}
        </div>

        {/* ABAS */}
        <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',border:'1px solid var(--rule)',borderRadius:6,overflow:'hidden',marginBottom:16,background:'var(--card)'}}>
          {[['campanhas','📅 Campanhas'],['roteiros','📝 Roteiros'],['comissoes','💰 Comissões'],['amostras','📦 Amostras']].map(([id,label])=>(
            <button key={id} onClick={()=>setAba(id)} style={{padding:'10px 4px',fontSize:'.7rem',fontWeight:600,color:aba===id?'#fff':'var(--ink3)',background:aba===id?'var(--navy)':'transparent',border:'none',borderRight:'1px solid var(--rule)'}}>
              {label}
            </button>
          ))}
        </div>

        {/* ABA: CAMPANHAS */}
        {aba==='campanhas' && (
          <div style={{display:'grid',gap:10}}>
            {campanhas.length===0
              ? <div style={{textAlign:'center',padding:40,color:'var(--ink3)',fontSize:'.78rem',background:'var(--card)',border:'1px solid var(--rule)',borderRadius:6}}>Nenhuma campanha ainda.</div>
              : campanhas.map(c => {
                const hoje = new Date()
                const ini = c.data_inicio ? new Date(c.data_inicio) : null
                const fim = c.data_fim ? new Date(c.data_fim) : null
                const status = !ini ? 'planejada' : hoje < ini ? 'futura' : fim && hoje > fim ? 'encerrada' : 'ativa'
                const statusColor = { ativa:'var(--green)', futura:'var(--teal-d)', encerrada:'var(--ink3)', planejada:'var(--amber)' }
                const statusBg = { ativa:'var(--green-lt)', futura:'var(--teal-lt)', encerrada:'var(--navy-xs)', planejada:'var(--amber-lt)' }
                const conv = c.leads>0?(c.pedidos_pagos/c.leads*100).toFixed(1):0
                return (
                  <div key={c.id} style={{background:'var(--card)',border:'1px solid var(--rule)',borderRadius:6,overflow:'hidden'}}>
                    <div style={{padding:'12px 14px',background:'var(--bg)',borderBottom:'1px solid var(--rule)',display:'flex',alignItems:'center',justifyContent:'space-between',gap:8}}>
                      <div style={{fontWeight:700,color:'var(--navy)',fontSize:'.88rem',flex:1}}>{c.nome||c.periodo||'Campanha'}</div>
                      <span style={{fontSize:'.6rem',fontWeight:700,padding:'3px 8px',borderRadius:3,background:statusBg[status],color:statusColor[status]}}>{status}</span>
                    </div>
                    <div style={{padding:'12px 14px'}}>
                      {c.periodo && <div style={{fontSize:'.72rem',color:'var(--ink3)',marginBottom:8}}>📅 {c.periodo}</div>}
                      {c.produtos_nomes && <div style={{fontSize:'.72rem',color:'var(--teal-d)',marginBottom:8}}>🧪 {c.produtos_nomes}</div>}
                      <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8}}>
                        <div style={{textAlign:'center'}}>
                          <div style={{fontSize:'.55rem',textTransform:'uppercase',letterSpacing:'.1em',color:'var(--ink3)',fontWeight:700}}>Leads</div>
                          <div style={{fontSize:'1rem',fontWeight:700,color:'var(--ink)'}}>{c.leads||0}</div>
                        </div>
                        <div style={{textAlign:'center'}}>
                          <div style={{fontSize:'.55rem',textTransform:'uppercase',letterSpacing:'.1em',color:'var(--ink3)',fontWeight:700}}>Vendas</div>
                          <div style={{fontSize:'1rem',fontWeight:700,color:'var(--ink)'}}>{c.pedidos_pagos||0}</div>
                        </div>
                        <div style={{textAlign:'center'}}>
                          <div style={{fontSize:'.55rem',textTransform:'uppercase',letterSpacing:'.1em',color:'var(--ink3)',fontWeight:700}}>Receita</div>
                          <div style={{fontSize:'1rem',fontWeight:700,color:'var(--green)'}}>R${fmt(c.receita)}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })
            }
          </div>
        )}

        {/* ABA: ROTEIROS */}
        {aba==='roteiros' && (
          <div style={{display:'grid',gap:10}}>
            {roteiros.length===0
              ? <div style={{textAlign:'center',padding:40,color:'var(--ink3)',fontSize:'.78rem',background:'var(--card)',border:'1px solid var(--rule)',borderRadius:6}}>Nenhum roteiro disponível.</div>
              : roteiros.map(r=>(
                <div key={r.id} style={{background:'var(--card)',border:'1px solid var(--rule)',borderRadius:6,overflow:'hidden'}}>
                  <div style={{display:'flex',alignItems:'center',gap:8,padding:'10px 14px',background:'var(--bg)',borderBottom:'1px solid var(--rule)',flexWrap:'wrap'}}>
                    <span style={{fontSize:'.6rem',fontWeight:700,padding:'2px 7px',borderRadius:3,background:tipoBg[r.tipo],color:tipoColors[r.tipo]}}>{r.tipo}</span>
                    <span style={{fontSize:'.78rem',fontWeight:600,color:'var(--ink)',flex:1}}>{r.tema}</span>
                    {r.data_post && <span style={{fontSize:'.7rem',color:'var(--ink3)'}}>{new Date(r.data_post+'T00:00:00').toLocaleDateString('pt-BR')}</span>}
                  </div>
                  <div style={{padding:'12px 14px',display:'grid',gap:5}}>
                    {[['Gancho 01',r.gancho_01,'#f0eeff','var(--navy)'],['Premissa 01',r.premissa_01,'#edfbff','#1a6e8a'],['Premissa 02',r.premissa_02,'#edfbff','#1a6e8a'],['Gancho 02',r.gancho_02,'#f0eeff','var(--navy)'],['CTA',r.cta,'var(--green-lt)','var(--green)']].filter(([,v])=>v).map(([label,val,bg,color])=>(
                      <div key={label} style={{display:'grid',gridTemplateColumns:'80px 1fr',border:'1px solid var(--rule)',borderRadius:3,overflow:'hidden'}}>
                        <div style={{padding:'7px 8px',background:bg,borderRight:'1px solid var(--rule)',fontSize:'.55rem',textTransform:'uppercase',letterSpacing:'.1em',fontWeight:700,color,display:'flex',alignItems:'center'}}>{label}</div>
                        <div style={{padding:'7px 10px',fontSize:'.78rem',color:'var(--ink)',lineHeight:1.5}}>{val}</div>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            }
          </div>
        )}

        {/* ABA: COMISSÕES */}
        {aba==='comissoes' && (
          <div style={{background:'var(--card)',border:'1px solid var(--rule)',borderRadius:6,overflow:'hidden'}}>
            {comissoes.length===0
              ? <div style={{textAlign:'center',padding:40,color:'var(--ink3)',fontSize:'.78rem'}}>Nenhuma comissão ainda.</div>
              : comissoes.map(c=>(
                <div key={c.id} style={{padding:'14px 16px',borderBottom:'1px solid var(--rule)',display:'grid',gridTemplateColumns:'1fr auto',gap:8,alignItems:'center'}}>
                  <div>
                    <div style={{fontWeight:600,fontSize:'.84rem',color:'var(--ink)',marginBottom:2}}>{c.mes_referencia}</div>
                    <div style={{fontSize:'.7rem',color:'var(--ink3)'}}>{c.data_pagamento ? 'Pago em '+c.data_pagamento : 'Pendente'}</div>
                  </div>
                  <div style={{textAlign:'right'}}>
                    <div style={{fontSize:'.9rem',fontWeight:700,color:'var(--green)',marginBottom:4}}>R$ {fmt(c.valor_liquido)}</div>
                    <span style={{fontSize:'.6rem',fontWeight:700,padding:'2px 7px',borderRadius:3,background:c.status==='pago'?'var(--green-lt)':'var(--amber-lt)',color:c.status==='pago'?'var(--green)':'var(--amber)'}}>{c.status}</span>
                  </div>
                </div>
              ))
            }
          </div>
        )}

        {/* ABA: AMOSTRAS */}
        {aba==='amostras' && (
          <div>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14}}>
              <div style={{fontSize:'.72rem',color:'var(--ink3)'}}>Solicite amostras dos produtos que você divulga</div>
              <button onClick={()=>setModalAmostra(true)} style={{background:'var(--navy)',color:'#fff',border:'none',borderRadius:4,padding:'8px 16px',fontSize:'.75rem',fontWeight:700}}>+ Solicitar amostra</button>
            </div>
            {amostras.length===0
              ? <div style={{textAlign:'center',padding:40,color:'var(--ink3)',fontSize:'.78rem',background:'var(--card)',border:'1px solid var(--rule)',borderRadius:6}}>Nenhuma solicitação ainda.</div>
              : amostras.map(a => {
                const itens = typeof a.itens === 'string' ? JSON.parse(a.itens) : (a.itens||[])
                return (
                  <div key={a.id} style={{background:'var(--card)',border:'1px solid var(--rule)',borderRadius:6,marginBottom:10,overflow:'hidden'}}>
                    <div style={{padding:'10px 14px',background:'var(--bg)',borderBottom:'1px solid var(--rule)',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                      <div style={{fontSize:'.72rem',color:'var(--ink3)'}}>{new Date(a.created_at).toLocaleDateString('pt-BR')}</div>
                      <span style={{fontSize:'.6rem',fontWeight:700,padding:'3px 8px',borderRadius:3,background:statusAmostraBg[a.status]||'var(--navy-xs)',color:statusAmostraColor[a.status]||'var(--ink3)'}}>
                        {a.status==='pendente'?'⏳ Aguardando':a.status==='aprovado'?'✓ Aprovado':a.status==='enviado'?'📦 Enviado':'✕ Recusado'}
                      </span>
                    </div>
                    <div style={{padding:'12px 14px'}}>
                      {itens.map((it,i)=>(
                        <div key={i} style={{fontSize:'.78rem',color:'var(--ink)',marginBottom:4}}>
                          <strong>{it.quantidade}x</strong> {it.nome}
                          {it.quantidade_aprovada != null && it.quantidade_aprovada !== it.quantidade && (
                            <span style={{color:'var(--amber)',fontSize:'.7rem'}}> (aprovado: {it.quantidade_aprovada})</span>
                          )}
                        </div>
                      ))}
                      {a.obs_admin && <div style={{marginTop:8,fontSize:'.72rem',color:'var(--teal-d)',background:'var(--teal-lt)',padding:'6px 10px',borderRadius:4}}>{a.obs_admin}</div>}
                    </div>
                  </div>
                )
              })
            }
          </div>
        )}
      </div>

      {/* MODAL SOLICITAR AMOSTRA */}
      {modalAmostra && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.55)',display:'flex',alignItems:'flex-end',justifyContent:'center',zIndex:100}}>
          <div style={{background:'var(--card)',width:'100%',maxWidth:520,borderRadius:'12px 12px 0 0',maxHeight:'85vh',overflowY:'auto'}}>
            <div style={{background:'var(--navy)',padding:'18px 20px',display:'flex',alignItems:'center',justifyContent:'space-between',borderRadius:'12px 12px 0 0'}}>
              <div style={{fontWeight:700,color:'#fff',fontSize:'.92rem'}}>Solicitar amostra de produto</div>
              <button onClick={()=>{setModalAmostra(false);setPedido([])}} style={{color:'rgba(255,255,255,.5)',background:'none',border:'none',fontSize:'1.2rem'}}>✕</button>
            </div>
            <div style={{padding:'20px'}}>
              <div style={{fontSize:'.72rem',color:'var(--ink3)',marginBottom:14}}>Selecione os produtos e a quantidade desejada:</div>
              {produtos.map(p=>{
                const sel = pedido.find(x=>x.produto_id===p.id)
                return (
                  <div key={p.id} style={{display:'flex',alignItems:'center',gap:12,padding:'12px 0',borderBottom:'1px solid var(--rule)'}}>
                    <input type="checkbox" checked={!!sel} onChange={()=>toggleProduto(p.id)}
                      style={{width:16,height:16,accentColor:'var(--navy)',cursor:'pointer'}}/>
                    <div style={{flex:1}}>
                      <div style={{fontWeight:600,fontSize:'.84rem',color:'var(--ink)'}}>{p.nome}</div>
                    </div>
                    {sel && (
                      <div style={{display:'flex',alignItems:'center',gap:6}}>
                        <button onClick={()=>setQtd(p.id, sel.quantidade-1)} style={{width:26,height:26,border:'1px solid var(--rule)',borderRadius:4,background:'var(--bg)',fontSize:'.9rem',cursor:'pointer'}}>−</button>
                        <span style={{fontWeight:700,fontSize:'.88rem',minWidth:20,textAlign:'center'}}>{sel.quantidade}</span>
                        <button onClick={()=>setQtd(p.id, sel.quantidade+1)} style={{width:26,height:26,border:'1px solid var(--rule)',borderRadius:4,background:'var(--bg)',fontSize:'.9rem',cursor:'pointer'}}>+</button>
                      </div>
                    )}
                  </div>
                )
              })}
              <div style={{marginTop:16,padding:'12px 14px',background:'var(--navy-xs)',border:'1px solid var(--rule)',borderRadius:6}}>
                <div style={{fontSize:'.6rem',textTransform:'uppercase',letterSpacing:'.1em',color:'var(--ink3)',fontWeight:700,marginBottom:4}}>Endereço de entrega</div>
                <div style={{fontSize:'.78rem',color:'var(--ink)',lineHeight:1.6}}>
                  {creator.endereco}, {creator.numero}{creator.complemento ? ' '+creator.complemento : ''}<br/>
                  {creator.bairro} — {creator.cidade}/{creator.estado}<br/>
                  CEP {creator.cep}
                </div>
              </div>
              <div style={{marginTop:16,display:'flex',gap:10}}>
                <button onClick={()=>{setModalAmostra(false);setPedido([])}} style={{flex:1,padding:'11px',border:'1px solid var(--rule)',borderRadius:4,background:'transparent',fontSize:'.82rem',color:'var(--ink3)'}}>Cancelar</button>
                <button onClick={enviarPedido} disabled={enviandoPedido||!pedido.length}
                  style={{flex:2,padding:'11px',background:pedido.length?'var(--navy)':'var(--ink3)',color:'#fff',border:'none',borderRadius:4,fontSize:'.82rem',fontWeight:700}}>
                  {enviandoPedido?'Enviando...':'Enviar solicitação →'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
