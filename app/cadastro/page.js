'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

function validarCPF(cpf) {
  const c = cpf.replace(/\D/g, '')
  if (c.length !== 11 || /^(\d)\1+$/.test(c)) return false
  let soma = 0
  for (let i = 0; i < 9; i++) soma += parseInt(c[i]) * (10 - i)
  let r = (soma * 10) % 11
  if (r === 10 || r === 11) r = 0
  if (r !== parseInt(c[9])) return false
  soma = 0
  for (let i = 0; i < 10; i++) soma += parseInt(c[i]) * (11 - i)
  r = (soma * 10) % 11
  if (r === 10 || r === 11) r = 0
  return r === parseInt(c[10])
}
function mascaraCPF(v) { return v.replace(/\D/g,'').slice(0,11).replace(/(\d{3})(\d)/,'$1.$2').replace(/(\d{3})(\d)/,'$1.$2').replace(/(\d{3})(\d{1,2})$/,'$1-$2') }
function mascaraTel(v) { return v.replace(/\D/g,'').slice(0,11).replace(/(\d{2})(\d)/,'($1) $2').replace(/(\d{5})(\d)/,'$1-$2') }
function mascaraCEP(v) { return v.replace(/\D/g,'').slice(0,8).replace(/(\d{5})(\d)/,'$1-$2') }

function Campo({ label, id, type, placeholder, opcoes, mascara, valor, erro, onChange }) {
  const border = erro ? '1.5px solid #c0392b' : '1px solid #e8e4f0'
  const bg = erro ? '#fdf0ef' : '#f8f7fc'
  const base = { padding:'10px 12px', borderRadius:4, fontSize:'.85rem', outline:'none', width:'100%', fontFamily:'inherit', border, background:bg }
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
      <label style={{ fontSize:'.6rem', textTransform:'uppercase', letterSpacing:'.12em', color:'#9090b0', fontWeight:700 }}>{label}</label>
      {opcoes ? (
        <select value={valor} onChange={e => onChange(id, e.target.value)} style={base}>
          <option value="">Selecionar...</option>
          {opcoes.map(o => <option key={o}>{o}</option>)}
        </select>
      ) : (
        <input type={type||'text'} value={valor} onChange={e => { const val = mascara ? mascara(e.target.value) : e.target.value; onChange(id, val) }} style={base} placeholder={placeholder||''} />
      )}
      {erro && <span style={{ fontSize:'.65rem', color:'#c0392b', fontWeight:600 }}>{erro}</span>}
    </div>
  )
}

const NICHOS = ['Saude e bem-estar','Fitness','Alimentacao saudavel','Maternidade','Moda e beleza','Lifestyle','Musica','Religiosidade','Empreendedorismo','Outro']

export default function Cadastro() {
  const [step, setStep] = useState(1)
  const [form, setForm] = useState({ nome:'', email:'', senha:'', confirma:'', instagram:'', nicho:'', seguidores:'', telefone:'', whatsapp:'', cpf:'', data_nascimento:'', cep:'', endereco:'', numero:'', complemento:'', bairro:'', cidade:'', estado:'' })
  const [erros, setErros] = useState({})
  const [erroGeral, setErroGeral] = useState('')
  const [loading, setLoading] = useState(false)
  const [concluido, setConcluido] = useState(false)
  const router = useRouter()

  function handleChange(id, val) { setForm(f=>({...f,[id]:val})); setErros(e=>({...e,[id]:''})) }

  function avancar() {
    const e = {}
    if (step===1) {
      if (!form.nome.trim()) e.nome='Obrigatório'
      if (!form.email.trim()) e.email='Obrigatório'
      if (!form.senha||form.senha.length<6) e.senha='Mínimo 6 caracteres'
      if (form.senha!==form.confirma) e.confirma='Senhas não conferem'
    }
    if (step===2) {
      if (!form.instagram.trim()) e.instagram='Obrigatório'
      if (!form.nicho) e.nicho='Obrigatório'
      if (!form.seguidores) e.seguidores='Obrigatório'
    }
    if (Object.keys(e).length) { setErros(e); return }
    setStep(s=>s+1)
  }

  async function buscarCEP(cep) {
    const c = cep.replace(/\D/g,'')
    if (c.length!==8) return
    try { const r=await fetch(`https://viacep.com.br/ws/${c}/json/`); const d=await r.json(); if(!d.erro) setForm(f=>({...f,endereco:d.logradouro||'',bairro:d.bairro||'',cidade:d.localidade||'',estado:d.uf||''})) } catch {}
  }

  async function cadastrar() {
    const e = {}
    if (!validarCPF(form.cpf)) e.cpf='CPF inválido'
    if (!form.telefone) e.telefone='Obrigatório'
    if (!form.cep) e.cep='Obrigatório'
    if (!form.endereco) e.endereco='Obrigatório'
    if (!form.numero) e.numero='Obrigatório'
    if (!form.bairro) e.bairro='Obrigatório'
    if (!form.cidade) e.cidade='Obrigatório'
    if (!form.estado) e.estado='Obrigatório'
    if (Object.keys(e).length) { setErros(e); return }
    setLoading(true); setErroGeral('')

    const { data, error } = await supabase.auth.signUp({ email:form.email, password:form.senha, options:{ data:{ nome:form.nome } } })
    if (error) { setErroGeral(error.message); setLoading(false); return }
    const userId = data.user?.id
    if (!userId) { setErroGeral('Erro ao criar conta. Tente novamente.'); setLoading(false); return }

    const { error: erroPerfil } = await supabase.from('perfis').insert({ id:userId, nome:form.nome, email:form.email, tipo:'creator' })
    if (erroPerfil) console.error('Erro perfis:', erroPerfil)

    const { error: erroCreator } = await supabase.from('creators').insert({
      user_id:userId, nome:form.nome, instagram:form.instagram.replace('@',''), nicho:form.nicho,
      seguidores:parseInt(form.seguidores)||0, cidade:form.cidade, telefone:form.telefone,
      whatsapp:form.whatsapp||form.telefone, cpf:form.cpf, data_nascimento:form.data_nascimento||null,
      cep:form.cep, endereco:form.endereco, numero:form.numero, complemento:form.complemento,
      bairro:form.bairro, estado:form.estado, comissao_pct:15.00, status:'recrutamento',
      data_inicio:new Date().toISOString().split('T')[0]
    })
    if (erroCreator) { setErroGeral(`Erro ao salvar perfil: ${erroCreator.message}. Tente novamente.`); setLoading(false); return }

    setLoading(false); setConcluido(true)
    setTimeout(()=>router.push('/creator'), 3000)
  }

  if (concluido) return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'#f8f7fc' }}>
      <div style={{ textAlign:'center' }}>
        <div style={{ fontSize:'3rem', marginBottom:12 }}>✅</div>
        <div style={{ fontSize:'1.5rem', fontWeight:700, color:'#2d2864', marginBottom:8 }}>Conta criada!</div>
        <div style={{ fontSize:'.82rem', color:'#9090b0' }}>Redirecionando para o seu portal...</div>
      </div>
    </div>
  )

  return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'#f8f7fc', padding:24 }}>
      <div style={{ width:460, background:'#fff', border:'1px solid #e8e4f0', borderRadius:8, overflow:'hidden' }}>
        <div style={{ background:'#2d2864', padding:'24px 32px' }}>
          <div style={{ fontSize:'.72rem', fontWeight:600, letterSpacing:'.2em', textTransform:'uppercase', color:'#42c2d6', marginBottom:6 }}>A Farmacia Natural</div>
          <div style={{ fontSize:'1.7rem', fontWeight:700, color:'#fff', lineHeight:1.1, marginBottom:8 }}>{step===1?'Criar conta':step===2?'Seu perfil':'Dados pessoais'}</div>
          <div style={{ display:'flex', marginBottom:8 }}>
            {['Acesso','Perfil','Dados pessoais'].map((l,i)=>(
              <div key={i} style={{ flex:1, textAlign:'center', fontSize:'.6rem', fontWeight:600, textTransform:'uppercase', letterSpacing:'.1em', color:i+1===step?'#fff':i+1<step?'#42c2d6':'rgba(255,255,255,.3)' }}>
                {i+1<step?'✓ ':''}{l}
              </div>
            ))}
          </div>
          <div style={{ height:3, background:'rgba(255,255,255,.15)', borderRadius:99, overflow:'hidden' }}>
            <div style={{ height:'100%', background:'#42c2d6', borderRadius:99, width:((step/3)*100)+'%', transition:'width .4s ease' }} />
          </div>
        </div>
        <div style={{ padding:'24px 32px', display:'flex', flexDirection:'column', gap:12 }}>
          {step===1 && (<>
            <Campo label="Nome completo" id="nome" placeholder="Seu nome completo" valor={form.nome} erro={erros.nome} onChange={handleChange} />
            <Campo label="E-mail" id="email" type="email" placeholder="seu@email.com" valor={form.email} erro={erros.email} onChange={handleChange} />
            <Campo label="Senha" id="senha" type="password" placeholder="Minimo 6 caracteres" valor={form.senha} erro={erros.senha} onChange={handleChange} />
            <Campo label="Confirmar senha" id="confirma" type="password" placeholder="Repita a senha" valor={form.confirma} erro={erros.confirma} onChange={handleChange} />
          </>)}
          {step===2 && (<>
            <Campo label="Instagram" id="instagram" placeholder="@seuinstagram" valor={form.instagram} erro={erros.instagram} onChange={handleChange} />
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
              <Campo label="Nicho principal" id="nicho" opcoes={NICHOS} valor={form.nicho} erro={erros.nicho} onChange={handleChange} />
              <Campo label="Seguidores" id="seguidores" type="number" placeholder="ex: 15000" valor={form.seguidores} erro={erros.seguidores} onChange={handleChange} />
            </div>
          </>)}
          {step===3 && (<>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
              <Campo label="CPF" id="cpf" placeholder="000.000.000-00" mascara={mascaraCPF} valor={form.cpf} erro={erros.cpf} onChange={handleChange} />
              <Campo label="Data de nascimento" id="data_nascimento" type="date" valor={form.data_nascimento} erro={erros.data_nascimento} onChange={handleChange} />
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
              <Campo label="Telefone" id="telefone" placeholder="(00) 00000-0000" mascara={mascaraTel} valor={form.telefone} erro={erros.telefone} onChange={handleChange} />
              <Campo label="WhatsApp" id="whatsapp" placeholder="(00) 00000-0000" mascara={mascaraTel} valor={form.whatsapp} erro={erros.whatsapp} onChange={handleChange} />
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 2fr', gap:12 }}>
              <Campo label="CEP" id="cep" placeholder="00000-000" mascara={mascaraCEP} valor={form.cep} erro={erros.cep} onChange={(id,val)=>{ handleChange(id,val); buscarCEP(val) }} />
              <Campo label="Endereco" id="endereco" placeholder="Rua, Avenida..." valor={form.endereco} erro={erros.endereco} onChange={handleChange} />
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 2fr 1fr', gap:12 }}>
              <Campo label="Numero" id="numero" placeholder="123" valor={form.numero} erro={erros.numero} onChange={handleChange} />
              <Campo label="Complemento" id="complemento" placeholder="Apto..." valor={form.complemento} erro={erros.complemento} onChange={handleChange} />
              <Campo label="Estado" id="estado" placeholder="SP" valor={form.estado} erro={erros.estado} onChange={handleChange} />
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
              <Campo label="Bairro" id="bairro" placeholder="Bairro" valor={form.bairro} erro={erros.bairro} onChange={handleChange} />
              <Campo label="Cidade" id="cidade" placeholder="Cidade" valor={form.cidade} erro={erros.cidade} onChange={handleChange} />
            </div>
          </>)}
          {erroGeral && <div style={{ fontSize:'.76rem', color:'#c0392b', background:'#fdf0ef', padding:'8px 12px', borderRadius:4, fontWeight:600 }}>{erroGeral}</div>}
          <div style={{ display:'flex', gap:10, marginTop:4 }}>
            {step>1 && <button onClick={()=>{ setStep(s=>s-1); setErros({}) }} style={{ padding:'10px 16px', border:'1px solid #e8e4f0', borderRadius:4, background:'transparent', fontSize:'.78rem', color:'#9090b0', cursor:'pointer' }}>Voltar</button>}
            {step<3 ? (
              <button onClick={avancar} style={{ flex:1, background:'#2d2864', color:'#fff', border:'none', borderRadius:4, padding:11, fontSize:'.82rem', fontWeight:700, cursor:'pointer' }}>Continuar</button>
            ) : (
              <button onClick={cadastrar} disabled={loading} style={{ flex:1, background:'#2d2864', color:'#fff', border:'none', borderRadius:4, padding:11, fontSize:'.82rem', fontWeight:700, cursor:'pointer', opacity:loading?0.6:1 }}>{loading?'Criando conta...':'Criar minha conta'}</button>
            )}
          </div>
          <div style={{ textAlign:'center', fontSize:'.74rem', color:'#9090b0', paddingTop:8, borderTop:'1px solid #e8e4f0' }}>
            Ja tem conta? <a href="/login" style={{ color:'#2d2864', fontWeight:600 }}>Entrar</a>
          </div>
        </div>
      </div>
    </div>
  )
}
