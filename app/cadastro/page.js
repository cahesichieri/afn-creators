'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

function validarCPF(cpf) {
  const c = cpf.replace(/\D/g,'')
  if (c.length !== 11 || /^(\d)\1+$/.test(c)) return false
  let sum = 0
  for (let i=0; i<9; i++) sum += parseInt(c[i])*(10-i)
  let r = (sum*10)%11
  if (r===10||r===11) r=0
  if (r!==parseInt(c[9])) return false
  sum=0
  for (let i=0; i<10; i++) sum += parseInt(c[i])*(11-i)
  r=(sum*10)%11
  if (r===10||r===11) r=0
  return r===parseInt(c[10])
}

export default function Cadastro() {
  const [step, setStep] = useState(1)
  const [form, setForm] = useState({
    nome:'', email:'', senha:'', confirma:'',
    instagram:'', nicho:'', seguidores:'',
    telefone:'', whatsapp:'', cpf:'',
    data_nascimento:'', cep:'', endereco:'',
    numero:'', complemento:'', bairro:'', cidade:'', estado:''
  })
  const [erros, setErros] = useState({})
  const [erroGeral, setErroGeral] = useState('')
  const [loading, setLoading] = useState(false)
  const [concluido, setConcluido] = useState(false)
  const router = useRouter()

  function f(id) { return form[id] }
  function set(id, val) { setForm(p => ({ ...p, [id]: val })); setErros(e=>({...e,[id]:''})) }

  const inp = (id) => ({
    padding:'10px 12px',
    border: erros[id] ? '1.5px solid var(--red)' : '1px solid var(--rule)',
    borderRadius:4, fontSize:'.85rem', outline:'none',
    background: erros[id] ? 'var(--red-lt)' : 'var(--bg)',
    width:'100%', fontFamily:'var(--font)'
  })
  const lbl = { fontSize:'.6rem', textTransform:'uppercase', letterSpacing:'.12em', color:'var(--ink3)', fontWeight:700 }

  function mascaraCPF(v) {
    return v.replace(/\D/g,'').slice(0,11).replace(/(\d{3})(\d)/,'$1.$2').replace(/(\d{3})(\d)/,'$1.$2').replace(/(\d{3})(\d{1,2})$/,'$1-$2')
  }
  function mascaraTel(v) {
    return v.replace(/\D/g,'').slice(0,11).replace(/(\d{2})(\d)/,'($1) $2').replace(/(\d{5})(\d)/,'$1-$2')
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
      if (!d.erro) setForm(p=>({...p, endereco:d.logradouro||'', bairro:d.bairro||'', cidade:d.localidade||p.cidade, estado:d.uf||''}))
      else setErros(e=>({...e, cep:'CEP nao encontrado.'}))
    } catch(e){}
  }

  function validar1() {
    const e = {}
    if (!f('nome').trim()) e.nome = 'Informe seu nome completo.'
    if (!f('email').trim()) e.email = 'Informe seu e-mail.'
    else if (!/\S+@\S+\.\S+/.test(f('email'))) e.email = 'E-mail invalido.'
    if (!f('senha')) e.senha = 'Informe uma senha.'
    else if (f('senha').length < 6) e.senha = 'A senha deve ter pelo menos 6 caracteres.'
    if (!f('confirma')) e.confirma = 'Confirme sua senha.'
    else if (f('senha') !== f('confirma')) e.confirma = 'As senhas nao coincidem.'
    return e
  }

  function validar2() {
    const e = {}
    if (!f('instagram').trim()) e.instagram = 'Informe seu @ do Instagram.'
    return e
  }

  function validar3() {
    const e = {}
    if (!f('cpf').trim()) e.cpf = 'Informe seu CPF.'
    else if (!validarCPF(f('cpf'))) e.cpf = 'CPF invalido. Verifique os digitos.'
    if (!f('telefone').trim()) e.telefone = 'Informe seu telefone.'
    else if (f('telefone').replace(/\D/g,'').length < 10) e.telefone = 'Telefone incompleto.'
    if (!f('cep').trim()) e.cep = 'Informe seu CEP.'
    else if (f('cep').replace(/\D/g,'').length < 8) e.cep = 'CEP incompleto.'
    if (!f('endereco').trim()) e.endereco = 'Informe seu endereco.'
    if (!f('numero').trim()) e.numero = 'Informe o numero.'
    return e
  }

  function campo(label, id, type='text', placeholder='', opts=null, mascara=null) {
    return (
      <div style={{display:'flex',flexDirection:'column',gap:4}}>
        <label style={lbl}>{label}</label>
        {opts
          ? <select value={f(id)} onChange={e=>{set(id,e.target.value)}} style={inp(id)}>
              <option value="">Selecionar...</option>
              {opts.map(o=><option key={o}>{o}</option>)}
            </select>
          : <input type={type} value={f(id)}
              onChange={e=>{
                const val = mascara ? mascara(e.target.value) : e.target.value
                set(id, val)
                if (id==='cep' && val.replace(/\D/g,'').length===8) buscarCEP(val)
              }}
              style={inp(id)} placeholder={placeholder}/>
        }
        {erros[id] && <span style={{fontSize:'.65rem',color:'var(--red)',fontWeight:600}}>{erros[id]}</span>}
      </div>
    )
  }

  function avancar() {
    const e = step===1 ? validar1() : validar2()
    if (Object.keys(e).length > 0) { setErros(e); return }
    setErros({})
    setStep(s=>s+1)
  }

  async function cadastrar() {
    const e = validar3()
    if (Object.keys(e).length > 0) { setErros(e); return }
    setLoading(true); setErroGeral('')

    const { data, error } = await supabase.auth.signUp({
      email: f('email'), password: f('senha'),
      options: { data: { nome: f('nome') } }
    })

    if (error) {
      setErroGeral(error.message === 'User already registered' ? 'Este e-mail ja esta cadastrado.' : 'Erro ao criar conta: ' + error.message)
      setLoading(false); return
    }

    const userId = data.user?.id
    if (!userId) { setErroGeral('Erro ao criar conta. Tente novamente.'); setLoading(false); return }

    await supabase.from('perfis').insert({ id:userId, nome:f('nome'), email:f('email'), tipo:'creator' })
    await supabase.from('creators').insert({
      user_id:userId, nome:f('nome'),
      instagram:f('instagram').replace('@',''), nicho:f('nicho'),
      seguidores:parseInt(f('seguidores'))||0, cidade:f('cidade'),
      telefone:f('telefone'), whatsapp:f('whatsapp')||f('telefone'),
      cpf:f('cpf'), data_nascimento:f('data_nascimento')||null,
      cep:f('cep'), endereco:f('endereco'), numero:f('numero'),
      complemento:f('complemento'), bairro:f('bairro'), estado:f('estado'),
      comissao_pct:15.00, status:'recrutamento',
      data_inicio:new Date().toISOString().split('T')[0]
    })

    setLoading(false)
    setConcluido(true)
    setTimeout(() => router.push('/creator'), 2000)
  }

  if (concluido) return (
    <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'var(--bg)'}}>
      <div style={{textAlign:'center'}}>
        <div style={{fontSize:'3rem',marginBottom:12}}>✅</div>
        <div style={{fontFamily:'var(--serif)',fontSize:'1.5rem',fontWeight:700,color:'var(--navy)',marginBottom:8}}>Conta criada!</div>
        <div style={{fontSize:'.82rem',color:'var(--ink3)'}}>Redirecionando para o seu portal...</div>
      </div>
    </div>
  )

  const stepLabels = ['Acesso','Perfil','Dados pessoais']

  return (
    <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'var(--bg)',padding:24}}>
      <div style={{width:460,background:'var(--card)',border:'1px solid var(--rule)',borderRadius:8,overflow:'hidden'}}>
        <div style={{background:'var(--navy)',padding:'24px 32px'}}>
          <div style={{fontFamily:'var(--serif)',fontSize:'.72rem',fontWeight:600,letterSpacing:'.2em',textTransform:'uppercase',color:'var(--teal)',marginBottom:6}}>A Farmacia Natural</div>
          <div style={{fontFamily:'var(--serif)',fontSize:'1.7rem',fontWeight:700,color:'#fff',lineHeight:1.1,marginBottom:8}}>
            {step===1?'Criar conta':step===2?'Seu perfil':'Dados pessoais'}
          </div>
          <div style={{display:'flex',gap:0,marginBottom:8}}>
            {stepLabels.map((l,i)=>(
              <div key={i} style={{flex:1,textAlign:'center',fontSize:'.6rem',fontWeight:600,color:i+1===step?'#fff':i+1<step?'var(--teal)':'rgba(255,255,255,.3)',textTransform:'uppercase',letterSpacing:'.1em'}}>
                {i+1<step?'✓ ':''}{l}
              </div>
            ))}
          </div>
          <div style={{height:3,background:'rgba(255,255,255,.15)',borderRadius:99,overflow:'hidden'}}>
            <div style={{height:'100%',background:'var(--teal)',borderRadius:99,width:((step/3)*100)+'%',transition:'width .4s ease'}}/>
          </div>
        </div>

        <div style={{padding:'24px 32px',display:'flex',flexDirection:'column',gap:12}}>
          {step===1 && (<>
            {campo('Nome completo','nome','text','Seu nome completo')}
            {campo('E-mail','email','email','seu@email.com')}
            {campo('Senha','senha','password','Minimo 6 caracteres')}
            {campo('Confirmar senha','confirma','password','Repita a senha')}
          </>)}

          {step===2 && (<>
            {campo('Instagram','instagram','text','@seuinstagram')}
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
              {campo('Nicho','nicho','text','',['Saude e bem-estar','Fitness','Alimentacao saudavel','Maternidade','Moda e beleza','Lifestyle','Musica','Religiosidade','Empreendedorismo','Outro'])}
              {campo('Seguidores','seguidores','number','ex: 15000')}
            </div>
          </>)}

          {step===3 && (<>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
              {campo('CPF','cpf','text','000.000.000-00',null,mascaraCPF)}
              {campo('Data de nascimento','data_nascimento','date')}
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
              {campo('Telefone','telefone','text','(00) 00000-0000',null,mascaraTel)}
              {campo('WhatsApp','whatsapp','text','(00) 00000-0000',null,mascaraTel)}
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 2fr',gap:12}}>
              {campo('CEP','cep','text','00000-000',null,mascaraCEP)}
              {campo('Endereco','endereco','text','Rua, Avenida...')}
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 2fr 1fr',gap:12}}>
              {campo('Numero','numero','text','123')}
              {campo('Complemento','complemento','text','Apto...')}
              {campo('Estado','estado','text','SP')}
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
              {campo('Bairro','bairro','text','Bairro')}
              {campo('Cidade','cidade','text','Cidade')}
            </div>
          </>)}

          {erroGeral && <div style={{fontSize:'.76rem',color:'var(--red)',background:'var(--red-lt)',padding:'8px 12px',borderRadius:4,fontWeight:600}}>{erroGeral}</div>}

          <div style={{display:'flex',gap:10,marginTop:4}}>
            {step>1 && <button onClick={()=>{setStep(s=>s-1);setErros({})}} style={{padding:'10px 16px',border:'1px solid var(--rule)',borderRadius:4,background:'transparent',fontSize:'.78rem',color:'var(--ink3)'}}>Voltar</button>}
            {step<3
              ? <button onClick={avancar} style={{flex:1,background:'var(--navy)',color:'#fff',border:'none',borderRadius:4,padding:11,fontSize:'.82rem',fontWeight:700}}>Continuar</button>
              : <button onClick={cadastrar} disabled={loading} style={{flex:1,background:'var(--navy)',color:'#fff',border:'none',borderRadius:4,padding:11,fontSize:'.82rem',fontWeight:700,opacity:loading?.6:1}}>
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
