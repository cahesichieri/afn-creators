'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

function validarCPF(cpf) {
  const c = cpf.replace(/\D/g, '')
  if (c.length !== 11) return false
  if (/^(\d)\1+$/.test(c)) return false
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

function mascaraCPF(v) {
  return v.replace(/\D/g, '').slice(0, 11)
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2')
}

function mascaraTel(v) {
  return v.replace(/\D/g, '').slice(0, 11)
    .replace(/(\d{2})(\d)/, '($1) $2')
    .replace(/(\d{5})(\d)/, '$1-$2')
}

function mascaraCEP(v) {
  return v.replace(/\D/g, '').slice(0, 8).replace(/(\d{5})(\d)/, '$1-$2')
}

export default function Cadastro() {
  const [step, setStep] = useState(1)
  const [form, setForm] = useState({
    nome: '', email: '', senha: '', confirma: '',
    instagram: '', nicho: '', seguidores: '',
    telefone: '', whatsapp: '', cpf: '',
    data_nascimento: '', cep: '', endereco: '',
    numero: '', complemento: '', bairro: '', cidade: '', estado: ''
  })
  const [erros, setErros] = useState({})
  const [erroGeral, setErroGeral] = useState('')
  const [loading, setLoading] = useState(false)
  const [concluido, setConcluido] = useState(false)
  const router = useRouter()

  function getF(id) { return form[id] }
  function setF(id, val) {
    setForm(p => ({ ...p, [id]: val }))
    setErros(e => ({ ...e, [id]: '' }))
  }

  async function buscarCEP(cep) {
    const c = cep.replace(/\D/g, '')
    if (c.length !== 8) return
    try {
      const res = await fetch('https://viacep.com.br/ws/' + c + '/json/')
      const d = await res.json()
      if (!d.erro) {
        setForm(p => ({
          ...p,
          endereco: d.logradouro || '',
          bairro: d.bairro || '',
          cidade: d.localidade || p.cidade,
          estado: d.uf || ''
        }))
      } else {
        setErros(e => ({ ...e, cep: 'CEP nao encontrado.' }))
      }
    } catch (err) {}
  }

  function validar1() {
    const e = {}
    if (!getF('nome').trim()) e.nome = 'Informe seu nome completo.'
    if (!getF('email').trim()) e.email = 'Informe seu e-mail.'
    else if (!/\S+@\S+\.\S+/.test(getF('email'))) e.email = 'E-mail invalido.'
    if (!getF('senha')) e.senha = 'Informe uma senha.'
    else if (getF('senha').length < 6) e.senha = 'Minimo 6 caracteres.'
    if (getF('senha') !== getF('confirma')) e.confirma = 'As senhas nao coincidem.'
    return e
  }

  function validar2() {
    const e = {}
    if (!getF('instagram').trim()) e.instagram = 'Informe seu @ do Instagram.'
    return e
  }

  function validar3() {
    const e = {}
    if (!getF('cpf').trim()) e.cpf = 'Informe seu CPF.'
    else if (!validarCPF(getF('cpf'))) e.cpf = 'CPF invalido. Verifique os digitos.'
    if (!getF('telefone').trim()) e.telefone = 'Informe seu telefone.'
    else if (getF('telefone').replace(/\D/g, '').length < 10) e.telefone = 'Telefone incompleto.'
    if (!getF('cep').trim()) e.cep = 'Informe seu CEP.'
    else if (getF('cep').replace(/\D/g, '').length < 8) e.cep = 'CEP incompleto.'
    if (!getF('endereco').trim()) e.endereco = 'Informe seu endereco.'
    if (!getF('numero').trim()) e.numero = 'Informe o numero.'
    if (!getF('bairro').trim()) e.bairro = 'Informe seu bairro.'
    if (!getF('cidade').trim()) e.cidade = 'Informe sua cidade.'
    return e
  }

  function avancar() {
    const e = step === 1 ? validar1() : validar2()
    if (Object.keys(e).length > 0) { setErros(e); return }
    setErros({})
    setStep(s => s + 1)
  }

  async function cadastrar() {
    const e = validar3()
    if (Object.keys(e).length > 0) { setErros(e); return }
    setLoading(true)
    setErroGeral('')

    const { data, error } = await supabase.auth.signUp({
      email: getF('email'),
      password: getF('senha'),
      options: { data: { nome: getF('nome') } }
    })

    if (error) {
      setErroGeral(
        error.message === 'User already registered'
          ? 'Este e-mail ja esta cadastrado.'
          : 'Erro ao criar conta: ' + error.message
      )
      setLoading(false)
      return
    }

    const userId = data.user?.id
    if (!userId) {
      setErroGeral('Erro ao criar conta. Tente novamente.')
      setLoading(false)
      return
    }

    await supabase.from('perfis').insert({
      id: userId, nome: getF('nome'), email: getF('email'), tipo: 'creator'
    })

    await supabase.from('creators').insert({
      user_id: userId,
      nome: getF('nome'),
      instagram: getF('instagram').replace('@', ''),
      nicho: getF('nicho'),
      seguidores: parseInt(getF('seguidores')) || 0,
      cidade: getF('cidade'),
      telefone: getF('telefone'),
      whatsapp: getF('whatsapp') || getF('telefone'),
      cpf: getF('cpf'),
      data_nascimento: getF('data_nascimento') || null,
      cep: getF('cep'),
      endereco: getF('endereco'),
      numero: getF('numero'),
      complemento: getF('complemento'),
      bairro: getF('bairro'),
      estado: getF('estado'),
      comissao_pct: 15.00,
      status: 'recrutamento',
      data_inicio: new Date().toISOString().split('T')[0]
    })

    setLoading(false)
    setConcluido(true)
    setTimeout(() => router.push('/creator'), 2000)
  }

  const borderColor = (id) => erros[id] ? '#c0392b' : '#e8e4f0'
  const bgColor = (id) => erros[id] ? '#fdf0ef' : '#f8f7fc'

  const baseInp = {
    padding: '10px 12px', borderRadius: 4, fontSize: '.85rem',
    outline: 'none', width: '100%', fontFamily: 'inherit'
  }

  function Campo({ label, id, type = 'text', placeholder = '', opcoes = null, mascara = null }) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <label style={{ fontSize: '.6rem', textTransform: 'uppercase', letterSpacing: '.12em', color: '#9090b0', fontWeight: 700 }}>
          {label}
        </label>
        {opcoes ? (
          <select
            value={getF(id)}
            onChange={e => setF(id, e.target.value)}
            style={{ ...baseInp, border: '1px solid ' + borderColor(id), background: bgColor(id) }}
          >
            <option value="">Selecionar...</option>
            {opcoes.map(o => <option key={o}>{o}</option>)}
          </select>
        ) : (
          <input
            type={type}
            value={getF(id)}
            onChange={e => {
              const val = mascara ? mascara(e.target.value) : e.target.value
              setF(id, val)
              if (id === 'cep' && val.replace(/\D/g, '').length === 8) buscarCEP(val)
            }}
            style={{ ...baseInp, border: '1px solid ' + borderColor(id), background: bgColor(id) }}
            placeholder={placeholder}
          />
        )}
        {erros[id] && (
          <span style={{ fontSize: '.65rem', color: '#c0392b', fontWeight: 600 }}>{erros[id]}</span>
        )}
      </div>
    )
  }

  if (concluido) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8f7fc' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '3rem', marginBottom: 12 }}>✅</div>
        <div style={{ fontFamily: 'serif', fontSize: '1.5rem', fontWeight: 700, color: '#2d2864', marginBottom: 8 }}>Conta criada!</div>
        <div style={{ fontSize: '.82rem', color: '#9090b0' }}>Redirecionando para o seu portal...</div>
      </div>
    </div>
  )

  const nichos = ['Saude e bem-estar', 'Fitness', 'Alimentacao saudavel', 'Maternidade', 'Moda e beleza', 'Lifestyle', 'Musica', 'Religiosidade', 'Empreendedorismo', 'Outro']
  const stepLabels = ['Acesso', 'Perfil', 'Dados pessoais']

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8f7fc', padding: 24 }}>
      <div style={{ width: 460, background: '#fff', border: '1px solid #e8e4f0', borderRadius: 8, overflow: 'hidden' }}>

        <div style={{ background: '#2d2864', padding: '24px 32px' }}>
          <div style={{ fontSize: '.72rem', fontWeight: 600, letterSpacing: '.2em', textTransform: 'uppercase', color: '#42c2d6', marginBottom: 6 }}>A Farmacia Natural</div>
          <div style={{ fontSize: '1.7rem', fontWeight: 700, color: '#fff', lineHeight: 1.1, marginBottom: 8 }}>
            {step === 1 ? 'Criar conta' : step === 2 ? 'Seu perfil' : 'Dados pessoais'}
          </div>
          <div style={{ display: 'flex', marginBottom: 8 }}>
            {stepLabels.map((l, i) => (
              <div key={i} style={{ flex: 1, textAlign: 'center', fontSize: '.6rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.1em', color: i + 1 === step ? '#fff' : i + 1 < step ? '#42c2d6' : 'rgba(255,255,255,.3)' }}>
                {i + 1 < step ? '✓ ' : ''}{l}
              </div>
            ))}
          </div>
          <div style={{ height: 3, background: 'rgba(255,255,255,.15)', borderRadius: 99, overflow: 'hidden' }}>
            <div style={{ height: '100%', background: '#42c2d6', borderRadius: 99, width: ((step / 3) * 100) + '%', transition: 'width .4s ease' }} />
          </div>
        </div>

        <div style={{ padding: '24px 32px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {step === 1 && (
            <>
              <Campo label="Nome completo" id="nome" placeholder="Seu nome completo" />
              <Campo label="E-mail" id="email" type="email" placeholder="seu@email.com" />
              <Campo label="Senha" id="senha" type="password" placeholder="Minimo 6 caracteres" />
              <Campo label="Confirmar senha" id="confirma" type="password" placeholder="Repita a senha" />
            </>
          )}

          {step === 2 && (
            <>
              <Campo label="Instagram" id="instagram" placeholder="@seuinstagram" />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <Campo label="Nicho principal" id="nicho" opcoes={nichos} />
                <Campo label="Seguidores" id="seguidores" type="number" placeholder="ex: 15000" />
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <Campo label="CPF" id="cpf" placeholder="000.000.000-00" mascara={mascaraCPF} />
                <Campo label="Data de nascimento" id="data_nascimento" type="date" />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <Campo label="Telefone" id="telefone" placeholder="(00) 00000-0000" mascara={mascaraTel} />
                <Campo label="WhatsApp" id="whatsapp" placeholder="(00) 00000-0000" mascara={mascaraTel} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 12 }}>
                <Campo label="CEP" id="cep" placeholder="00000-000" mascara={mascaraCEP} />
                <Campo label="Endereco" id="endereco" placeholder="Rua, Avenida..." />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr 1fr', gap: 12 }}>
                <Campo label="Numero" id="numero" placeholder="123" />
                <Campo label="Complemento" id="complemento" placeholder="Apto..." />
                <Campo label="Estado" id="estado" placeholder="SP" />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <Campo label="Bairro" id="bairro" placeholder="Bairro" />
                <Campo label="Cidade" id="cidade" placeholder="Cidade" />
              </div>
            </>
          )}

          {erroGeral && (
            <div style={{ fontSize: '.76rem', color: '#c0392b', background: '#fdf0ef', padding: '8px 12px', borderRadius: 4, fontWeight: 600 }}>
              {erroGeral}
            </div>
          )}

          <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
            {step > 1 && (
              <button onClick={() => { setStep(s => s - 1); setErros({}) }} style={{ padding: '10px 16px', border: '1px solid #e8e4f0', borderRadius: 4, background: 'transparent', fontSize: '.78rem', color: '#9090b0', cursor: 'pointer' }}>
                Voltar
              </button>
            )}
            {step < 3 ? (
              <button onClick={avancar} style={{ flex: 1, background: '#2d2864', color: '#fff', border: 'none', borderRadius: 4, padding: 11, fontSize: '.82rem', fontWeight: 700, cursor: 'pointer' }}>
                Continuar
              </button>
            ) : (
              <button onClick={cadastrar} disabled={loading} style={{ flex: 1, background: '#2d2864', color: '#fff', border: 'none', borderRadius: 4, padding: 11, fontSize: '.82rem', fontWeight: 700, cursor: 'pointer', opacity: loading ? 0.6 : 1 }}>
                {loading ? 'Criando conta...' : 'Criar minha conta'}
              </button>
            )}
          </div>

          <div style={{ textAlign: 'center', fontSize: '.74rem', color: '#9090b0', paddingTop: 8, borderTop: '1px solid #e8e4f0' }}>
            Ja tem conta? <a href="/login" style={{ color: '#2d2864', fontWeight: 600 }}>Entrar</a>
          </div>
        </div>
      </div>
    </div>
  )
}
