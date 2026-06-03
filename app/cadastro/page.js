'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function Cadastro() {
  const [step, setStep] = useState(1)
  const [form, setForm] = useState({
    nome:'', email:'', senha:'', confirma:'',
    instagram:'', nicho:'', seguidores:'', cidade:'',
    telefone:'', whatsapp:'', cpf:'',
    data_nascimento:'', cep:'', endereco:'',
    numero:'', complemento:'', bairro:'', estado:''
  })
  const [erro, setErro] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  function f(id) { return form[id] }
  function set(id, val) { setForm(p => ({ ...p, [id]: val })) }

  const inp = (extra={}) => ({
    padding:'10px 12px', border:'1px solid var(--rule)',
    borderRadius:4, fontSize:'.85rem', outline:'none',
    background:'var(--bg)', width:'100%', fontFamily:'var(--font)',
    ...extra
  })
  const lbl = { fontSize:'.6rem', textTransform:'uppercase', letterSpacing:'.12em', color:'var(--ink3)', fontWeight:700 }
  const fld = (label, id, type='text', placeholder='', opts=null) => (
    <div style={{display:'flex',flexDirection:'column',gap:5}}>
      <label style={lbl}>{label}</label>
      {opts
        ? <select value={f(id)} onChange={e=>set(id,e.target.value)} style={inp()}>
            <option value="">Selecionar...</option>
            {opts.map(o=><option key={o}>{o}</option>)}
          </select>
        : <input type={type} value={f(id)} onChange={e=>set(id,e.target.value)} style={inp()} placeholder={placeholder}/>
      }
    </div>
  )

  function mascaraCPF(v) {
    return v.replace(/\D/g,'').slice(0,11)
      .replace(/(\d{3})(\d)/,'$1.$2')
      .replace(/(\d{3})(\d)/,'$1.$2')
      .replace(/(\d{3})(\d{1,2})$/,'$1-$2')
  }
  function mascaraTel(v) {
    return v.replace(/\D/g,'').slice(0,11)
      .replace(/(\d{2})(\d)/,'($1) $2')
      .replace(/(\d{5})(\d)/,'$1-$2')
  }
  function mascaraCEP(v) {
    return v.replace(/\D/g,'').slice(0,8).replace(/(\d{5})(\d)/,'$1-$2')
  }

  async function buscarCEP(cep) {
    const c = cep.replace(/\D/g,'')
    if (c.length !== 8) return
    try {
      const r = await fetch('https://viacep.com.br/ws/'+c+'/json/')
      const d = await r.json()
      if (!d.erro) {
        setForm(p=>({...p, endereco:d.logradouro||'', bairro:d.bairro||'', cidade:d.localidade||p.cidade, estado:d.uf||''}))
      }
    } catch(e){}
  }

  function validar1() {
    if (!f('nome').trim()) return 'Informe seu nome completo.'
    if (!f('email').trim()) return 'Informe seu e-mail.'
    if (!f('senha') || f('senha').length < 6) return 'Senha com minimo 6 caracteres.'
    if (f('senha') !== f('confirma')) return 'As senhas nao coincidem.'
    return null
  }
  function validar2() {
    if (!f('instagram').trim()) return 'Informe seu @ do Instagram.'
    return null
  }
  function validar3() {
    if (!f('cpf').trim()) return 'Informe seu CPF.'
    if (!f('telefone').trim()) return 'Informe seu telefone.'
    if (!f('cep').trim()) return 'Informe seu CEP.'
    if (!f('endereco').trim()) return 'Informe seu endereco.'
    if (!f('numero').trim()) return 'Informe o numero.'
    return null
  }

  async function avancar() {
    const err = step===1?validar1():step===2?validar2():null
    if (err) { setErro(err); return }
    setErro('')
    setStep(s=>s+1)
  }

  async function cadastrar() {
    const err = validar3()
    if (err) { setErro(err); return }
    setLoading(true); setErro('')

    const { data, error } = await supabase.auth.signUp({
      email: f('email'), password: f('senha'),
      options: { data: { nome: f('nome') } }
    })

    if (error) {
      setErro(error.message === 'User already registered' ? 'E-mail ja cadastrado.' : 'Erro: '+error.message)
      setLoading(false); return
    }

    const userId = data.user?.id
    if (!userId) { setErro('Erro ao criar conta.'); setLoading(false); return }

    await supabase.from('perfis').insert({ id:userId, nome:f('nome'), email:f('email'), tipo:'creator' })

    await supabase.from('creators').insert({
      user_id: userId,
      nome: f('nome'),
      instagram: f('instagram').replace('@',''),
      nicho: f('nicho'),
      seguidores: parseInt(f('seguidores'))||0,
      cidade: f('cidade'),
      telefone: f('telefone'),
      whatsapp: f('whatsapp')||f('telefone'),
      cpf: f('cpf'),
      data_nascimento: f('data_nascimento')||null,
      cep: f('cep'),
      endereco: f('endereco'),
      numero: f('numero'),
      complemento: f('complemento'),
      bairro: f('bairro'),
      estado: f('estado'),
      comissao_pct: 15.00,
      status: 'recrutamento',
      data_inicio: new Date().toISOString().split('T')[0]
    })

    setLoading(false)
    router.push('/creator')
  }

  const stepLabels = ['Acesso','Perfil','Dados pessoais']
  const progresso = (step/3)*100

  return (
    <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'var(--bg)',padding:24}}>
      <div style={{width:460,background:'var(--card)',border:'1px solid var(--rule)',borderRadius:8,overflow:'hidden'}}>

        <div style={{background:'var(--navy)',padding:'24px 32px'}}>
          <div style={{fontFamily:'var(--serif)',fontSize:'.72rem',fontWeight:600,letterSpacing:'.2em',textTransform:'uppercase',color:'var(--teal)',marginBottom:6}}>A Farmacia Natural</div>
          <div style={{fontFamily:'var(--serif)',fontSize:'1.7rem',fontWeight:700,color:'#fff',lineHeight:1.1,marginBottom:8}}>
            {step===1?'Criar conta':step===2?'Seu perfil':'Dados pessoais'}
          </div>
          <div style={{display:'flex',gap:0,marginBottom:10}}>
            {stepLabels.map((l,i)=>(
              <div key={i} style={{flex:1,textAlign:'center',fontSize:'.6rem',fontWeight:600,color:i+1===step?'#fff':i+1<step?'var(--teal)':'rgba(255,255,255,.3)',textTransform:'uppercase',letterSpacing:'.1em'}}>
                {i+1<step?'✓ ':''}{l}
              </div>
            ))}
          </div>
          <div style={{height:3,background:'rgba(255,255,255,.15)',borderRadius:99,overflow:'hidden'}}>
            <div style={{height:'100%',background:'var(--teal)',borderRadius:99,width:progresso+'%',transition:'width .4s ease'}}/>
          </div>
        </div>

        <div style={{padding:'24px 32px',display:'flex',flexDirection:'column',gap:14}}>

          {step===1 && (<>
            {fld('Nome completo','nome','text','Seu nome completo')}
            {fld('E-mail','email','email','seu@email.com')}
            {fld('Senha','senha','password','Minimo 6 caracteres')}
            {fld('Confirmar senha','confirma','password','Repita a senha')}
          </>)}

          {step===2 && (<>
            {fld('@ Instagram','instagram','text','@seuinstagram')}
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
              {fld('Nicho principal','nicho','text','',['Saude e bem-estar','Fitness','Alimentacao saudavel','Maternidade','Moda e beleza','Lifestyle','Musica','Religiosidade','Empreendedorismo','Outro'])}
              {fld('Seguidores','seguidores','number','ex: 15000')}
            </div>
          </>)}

          {step===3 && (<>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
              <div style={{display:'flex',flexDirection:'column',gap:5}}>
                <label style={lbl}>CPF</label>
                <input value={f('cpf')} onChange={e=>set('cpf',mascaraCPF(e.target.value))} style={inp()} placeholder="000.000.000-00"/>
              </div>
              <div style={{display:'flex',flexDirection:'column',gap:5}}>
                <label style={lbl}>Data de nascimento</label>
                <input type="date" value={f('data_nascimento')} onChange={e=>set('data_nascimento',e.target.value)} style={inp()}/>
              </div>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
              <div style={{display:'flex',flexDirection:'column',gap:5}}>
                <label style={lbl}>Telefone</label>
                <input value={f('telefone')} onChange={e=>set('telefone',mascaraTel(e.target.value))} style={inp()} placeholder="(00) 00000-0000"/>
              </div>
              <div style={{display:'flex',flexDirection:'column',gap:5}}>
                <label style={lbl}>WhatsApp</label>
                <input value={f('whatsapp')} onChange={e=>set('whatsapp',mascaraTel(e.target.value))} style={inp()} placeholder="(00) 00000-0000"/>
              </div>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 2fr',gap:12}}>
              <div style={{display:'flex',flexDirection:'column',gap:5}}>
                <label style={lbl}>CEP</label>
                <input value={f('cep')} onChange={e=>{const v=mascaraCEP(e.target.value);set('cep',v);if(v.replace(/\D/g,'').length===8)buscarCEP(v)}} style={inp()} placeholder="00000-000"/>
              </div>
              {fld('Endereco','endereco','text','Rua, Avenida...')}
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 2fr 1fr',gap:12}}>
              {fld('Numero','numero','text','123')}
              {fld('Complemento','complemento','text','Apto, Bloco...')}
              {fld('Estado','estado','text','SP')}
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
              {fld('Bairro','bairro','text','Bairro')}
              {fld('Cidade','cidade','text','Cidade')}
            </div>
          </>)}

          {erro && <div style={{fontSize:'.76rem',color:'var(--red)',background:'var(--red-lt)',padding:'8px 12px',borderRadius:4}}>{erro}</div>}

          <div style={{display:'flex',gap:10,marginTop:4}}>
            {step>1 && (
              <button onClick={()=>{setStep(s=>s-1);setErro('')}} style={{padding:'10px 16px',border:'1px solid var(--rule)',borderRadius:4,background:'transparent',fontSize:'.78rem',color:'var(--ink3)'}}>
                Voltar
              </button>
            )}
            {step<3
              ? <button onClick={avancar} style={{flex:1,background:'var(--navy)',color:'#fff',border:'none',borderRadius:4,padding:11,fontSize:'.82rem',fontWeight:700}}>Continuar</button>
              : <button onClick={cadastrar} disabled={loading} style={{flex:1,background:'var(--navy)',color:'#fff',border:'none',borderRadius:4,padding:11,fontSize:'.82rem',fontWeight:700,opacity:loading?0.6:1}}>
                  {loading?'Criando conta...':'Criar minha conta'}
                </button>
            }
          </div>

          <div style={{textAlign:'center',fontSize:'.74rem',color:'var(--ink3)',paddingTop:8,borderTop:'1px solid var(--rule)'}}>
            Ja tem conta? <a href="/login" style={{color:'var(--navy)',fontWeight:600}}>Entrar</a>
          </div>
        </div>
      </div>
    </div>
  )
}
