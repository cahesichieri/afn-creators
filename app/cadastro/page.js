'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function Cadastro() {
  const [step, setStep] = useState(1)
  const [form, setForm] = useState({
    nome: '', email: '', senha: '', confirma: '',
    instagram: '', nicho: '', seguidores: '', cidade: ''
  })
  const [erro, setErro] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  function f(id) { return form[id] }
  function set(id, val) { setForm(p => ({ ...p, [id]: val })) }

  const inputStyle = {
    padding: '10px 12px', border: '1px solid var(--rule)',
    borderRadius: 4, fontSize: '.85rem', outline: 'none',
    background: 'var(--bg)', width: '100%', fontFamily: 'var(--font)'
  }
  const labelStyle = {
    fontSize: '.6rem', textTransform: 'uppercase',
    letterSpacing: '.12em', color: 'var(--ink3)', fontWeight: 700
  }

  function validarStep1() {
    if (!f('nome').trim()) return 'Informe seu nome completo.'
    if (!f('email').trim()) return 'Informe seu e-mail.'
    if (!f('senha') || f('senha').length < 6) return 'A senha deve ter pelo menos 6 caracteres.'
    if (f('senha') !== f('confirma')) return 'As senhas nao coincidem.'
    return null
  }

  async function avancar() {
    const err = validarStep1()
    if (err) { setErro(err); return }
    setErro('')
    setStep(2)
  }

  async function cadastrar() {
    if (!f('instagram').trim()) { setErro('Informe seu @ do Instagram.'); return }
    setLoading(true); setErro('')

    const { data, error } = await supabase.auth.signUp({
      email: f('email'),
      password: f('senha'),
      options: { data: { nome: f('nome') } }
    })

    if (error) {
      setErro(error.message === 'User already registered'
        ? 'Este e-mail ja esta cadastrado.'
        : 'Erro ao criar conta: ' + error.message)
      setLoading(false); return
    }

    const userId = data.user?.id
    if (!userId) { setErro('Erro ao criar conta. Tente novamente.'); setLoading(false); return }

    await supabase.from('perfis').insert({
      id: userId, nome: f('nome'), email: f('email'), tipo: 'creator'
    })

    await supabase.from('creators').insert({
      user_id: userId,
      nome: f('nome'),
      instagram: f('instagram').replace('@', ''),
      nicho: f('nicho'),
      seguidores: parseInt(f('seguidores')) || 0,
      cidade: f('cidade'),
      comissao_pct: 15.00,
      status: 'recrutamento',
      data_inicio: new Date().toISOString().split('T')[0]
    })

    setLoading(false)
    router.push('/creator')
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', padding: 24 }}>
      <div style={{ width: 440, background: 'var(--card)', border: '1px solid var(--rule)', borderRadius: 8, overflow: 'hidden' }}>
        <div style={{ background: 'var(--navy)', padding: '28px 32px' }}>
          <div style={{ fontFamily: 'var(--serif)', fontSize: '.75rem', fontWeight: 600, letterSpacing: '.2em', textTransform: 'uppercase', color: 'var(--teal)', marginBottom: 8 }}>A Farmacia Natural</div>
          <div style={{ fontFamily: 'var(--serif)', fontSize: '1.8rem', fontWeight: 700, color: '#fff', lineHeight: 1.1 }}>
            {step === 1 ? 'Criar conta' : 'Seu perfil'}
          </div>
          <div style={{ fontSize: '.72rem', color: 'rgba(255,255,255,.45)', marginTop: 6 }}>
            {step === 1 ? 'Passo 1 de 2 · Acesso' : 'Passo 2 de 2 · Informacoes'}
          </div>
          <div style={{ marginTop: 14, height: 3, background: 'rgba(255,255,255,.15)', borderRadius: 99, overflow: 'hidden' }}>
            <div style={{ height: '100%', background: 'var(--teal)', borderRadius: 99, width: step === 1 ? '50%' : '100%', transition: 'width .4s ease' }} />
          </div>
        </div>

        <div style={{ padding: '28px 32px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          {step === 1 ? (
            <>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                <label style={labelStyle}>Nome completo</label>
                <input value={f('nome')} onChange={e => set('nome', e.target.value)} style={inputStyle} placeholder="Seu nome completo" />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                <label style={labelStyle}>E-mail</label>
                <input type="email" value={f('email')} onChange={e => set('email', e.target.value)} style={inputStyle} placeholder="seu@email.com" />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                <label style={labelStyle}>Senha</label>
                <input type="password" value={f('senha')} onChange={e => set('senha', e.target.value)} style={inputStyle} placeholder="Minimo 6 caracteres" />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                <label style={labelStyle}>Confirmar senha</label>
                <input type="password" value={f('confirma')} onChange={e => set('confirma', e.target.value)} style={inputStyle} placeholder="Repita a senha" onKeyDown={e => e.key === 'Enter' && avancar()} />
              </div>
              {erro && <div style={{ fontSize: '.76rem', color: 'var(--red)', background: 'var(--red-lt)', padding: '8px 12px', borderRadius: 4 }}>{erro}</div>}
              <button onClick={avancar} style={{ background: 'var(--navy)', color: '#fff', border: 'none', borderRadius: 4, padding: 11, fontSize: '.82rem', fontWeight: 700 }}>
                Continuar
              </button>
            </>
          ) : (
            <>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                <label style={labelStyle}>Instagram</label>
                <input value={f('instagram')} onChange={e => set('instagram', e.target.value)} style={inputStyle} placeholder="@seuinstagram" />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                  <label style={labelStyle}>Nicho principal</label>
                  <select value={f('nicho')} onChange={e => set('nicho', e.target.value)} style={inputStyle}>
                    <option value="">Selecionar...</option>
                    {['Saude e bem-estar','Fitness','Alimentacao saudavel','Maternidade','Moda e beleza','Lifestyle','Musica','Religiosidade','Empreendedorismo','Outro'].map(o => <option key={o}>{o}</option>)}
                  </select>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                  <label style={labelStyle}>Seguidores</label>
                  <input type="number" value={f('seguidores')} onChange={e => set('seguidores', e.target.value)} style={inputStyle} placeholder="ex: 15000" />
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                <label style={labelStyle}>Cidade</label>
                <input value={f('cidade')} onChange={e => set('cidade', e.target.value)} style={inputStyle} placeholder="ex: Sao Paulo, SP" />
              </div>
              {erro && <div style={{ fontSize: '.76rem', color: 'var(--red)', background: 'var(--red-lt)', padding: '8px 12px', borderRadius: 4 }}>{erro}</div>}
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={() => { setStep(1); setErro('') }} style={{ padding: '10px 16px', border: '1px solid var(--rule)', borderRadius: 4, background: 'transparent', fontSize: '.78rem', color: 'var(--ink3)' }}>
                  Voltar
                </button>
                <button onClick={cadastrar} disabled={loading} style={{ flex: 1, background: 'var(--navy)', color: '#fff', border: 'none', borderRadius: 4, padding: 11, fontSize: '.82rem', fontWeight: 700, opacity: loading ? .6 : 1 }}>
                  {loading ? 'Criando conta...' : 'Criar minha conta'}
                </button>
              </div>
            </>
          )}
          <div style={{ textAlign: 'center', fontSize: '.74rem', color: 'var(--ink3)', paddingTop: 8, borderTop: '1px solid var(--rule)' }}>
            Ja tem conta? <a href="/login" style={{ color: 'var(--navy)', fontWeight: 600 }}>Entrar</a>
          </div>
        </div>
      </div>
    </div>
  )
}
