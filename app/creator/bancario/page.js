'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function DadosBancarios() {
  const [creator, setCreator] = useState(null)
  const [form, setForm] = useState({ banco:'', agencia:'', conta:'', tipo_conta:'corrente', pix_tipo:'cpf', pix_chave:'', titular_conta:'' })
  const [salvando, setSalvando] = useState(false)
  const [salvo, setSalvo] = useState(false)
  const router = useRouter()

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) { router.push('/login'); return }
      const { data: c } = await supabase.from('creators').select('*').eq('user_id', data.user.id).single()
      if (!c) { router.push('/creator'); return }
      setCreator(c)
      setForm({
        banco: c.banco||'', agencia: c.agencia||'', conta: c.conta||'',
        tipo_conta: c.tipo_conta||'corrente', pix_tipo: c.pix_tipo||'cpf',
        pix_chave: c.pix_chave||'', titular_conta: c.titular_conta||c.nome||''
      })
    })
  }, [])

  async function salvar() {
    setSalvando(true); setSalvo(false)
    await supabase.from('creators').update(form).eq('id', creator.id)
    setSalvando(false); setSalvo(true)
    setTimeout(() => setSalvo(false), 3000)
  }

  function f(id) { return form[id] }
  function set(id, val) { setForm(p => ({ ...p, [id]: val })) }

  const inp = { padding:'10px 12px', border:'1px solid var(--rule)', borderRadius:4, fontSize:'.85rem', outline:'none', background:'var(--bg)', width:'100%', fontFamily:'var(--font)' }
  const lbl = { fontSize:'.6rem', textTransform:'uppercase', letterSpacing:'.12em', color:'var(--ink3)', fontWeight:700 }

  if (!creator) return <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',color:'var(--ink3)'}}>Carregando...</div>

  return (
    <div style={{minHeight:'100vh',background:'var(--bg)',padding:'32px 24px'}}>
      <div style={{maxWidth:540,margin:'0 auto'}}>
        <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:28}}>
          <a href="/creator" style={{color:'var(--ink3)',fontSize:'.78rem',textDecoration:'none'}}>← Voltar</a>
          <div style={{flex:1}}/>
        </div>

        <div style={{background:'var(--navy)',borderRadius:'8px 8px 0 0',padding:'20px 24px'}}>
          <div style={{fontFamily:'var(--serif)',fontSize:'.72rem',fontWeight:600,letterSpacing:'.2em',textTransform:'uppercase',color:'var(--teal)',marginBottom:4}}>A Farmacia Natural</div>
          <div style={{fontFamily:'var(--serif)',fontSize:'1.5rem',fontWeight:700,color:'#fff'}}>Dados bancarios</div>
          <div style={{fontSize:'.72rem',color:'rgba(255,255,255,.45)',marginTop:4}}>Usados para receber suas comissoes</div>
        </div>

        <div style={{background:'var(--card)',border:'1px solid var(--rule)',borderTop:'none',borderRadius:'0 0 8px 8px',padding:'24px'}}>

          <div style={{fontSize:'.62rem',textTransform:'uppercase',letterSpacing:'.12em',color:'var(--navy)',fontWeight:700,marginBottom:12,display:'flex',alignItems:'center',gap:8}}>
            <span style={{width:3,height:11,background:'var(--teal)',borderRadius:2,display:'inline-block'}}/>
            Conta bancaria
          </div>

          <div style={{display:'grid',gap:12,marginBottom:20}}>
            <div style={{display:'flex',flexDirection:'column',gap:5}}>
              <label style={lbl}>Nome completo do titular</label>
              <input value={f('titular_conta')} onChange={e=>set('titular_conta',e.target.value)} style={inp} placeholder="Nome como no banco"/>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'2fr 1fr',gap:12}}>
              <div style={{display:'flex',flexDirection:'column',gap:5}}>
                <label style={lbl}>Banco</label>
                <select value={f('banco')} onChange={e=>set('banco',e.target.value)} style={inp}>
                  <option value="">Selecionar...</option>
                  {['Nubank','Itau','Bradesco','Banco do Brasil','Caixa Economica','Santander','Inter','C6 Bank','PicPay','Mercado Pago','BTG Pactual','Sicoob','Sicredi','Outro'].map(b=><option key={b}>{b}</option>)}
                </select>
              </div>
              <div style={{display:'flex',flexDirection:'column',gap:5}}>
                <label style={lbl}>Tipo de conta</label>
                <select value={f('tipo_conta')} onChange={e=>set('tipo_conta',e.target.value)} style={inp}>
                  <option value="corrente">Corrente</option>
                  <option value="poupanca">Poupanca</option>
                </select>
              </div>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 2fr',gap:12}}>
              <div style={{display:'flex',flexDirection:'column',gap:5}}>
                <label style={lbl}>Agencia</label>
                <input value={f('agencia')} onChange={e=>set('agencia',e.target.value)} style={inp} placeholder="0000"/>
              </div>
              <div style={{display:'flex',flexDirection:'column',gap:5}}>
                <label style={lbl}>Conta e digito</label>
                <input value={f('conta')} onChange={e=>set('conta',e.target.value)} style={inp} placeholder="00000-0"/>
              </div>
            </div>
          </div>

          <div style={{fontSize:'.62rem',textTransform:'uppercase',letterSpacing:'.12em',color:'var(--navy)',fontWeight:700,marginBottom:12,display:'flex',alignItems:'center',gap:8}}>
            <span style={{width:3,height:11,background:'var(--teal)',borderRadius:2,display:'inline-block'}}/>
            Chave PIX
          </div>

          <div style={{display:'grid',gridTemplateColumns:'1fr 2fr',gap:12,marginBottom:24}}>
            <div style={{display:'flex',flexDirection:'column',gap:5}}>
              <label style={lbl}>Tipo de chave</label>
              <select value={f('pix_tipo')} onChange={e=>set('pix_tipo',e.target.value)} style={inp}>
                <option value="cpf">CPF</option>
                <option value="email">E-mail</option>
                <option value="telefone">Telefone</option>
                <option value="aleatoria">Chave aleatoria</option>
              </select>
            </div>
            <div style={{display:'flex',flexDirection:'column',gap:5}}>
              <label style={lbl}>Chave PIX</label>
              <input value={f('pix_chave')} onChange={e=>set('pix_chave',e.target.value)} style={inp} placeholder={f('pix_tipo')==='cpf'?'000.000.000-00':f('pix_tipo')==='email'?'seu@email.com':f('pix_tipo')==='telefone'?'(00) 00000-0000':'Chave aleatoria'}/>
            </div>
          </div>

          {salvo && <div style={{fontSize:'.78rem',color:'var(--green)',background:'var(--green-lt)',padding:'10px 14px',borderRadius:4,marginBottom:12,fontWeight:600}}>Dados salvos com sucesso!</div>}

          <button onClick={salvar} disabled={salvando} style={{width:'100%',background:'var(--navy)',color:'#fff',border:'none',borderRadius:4,padding:'11px',fontSize:'.85rem',fontWeight:700,opacity:salvando?.6:1}}>
            {salvando?'Salvando...':'Salvar dados bancarios'}
          </button>
        </div>
      </div>
    </div>
  )
}
