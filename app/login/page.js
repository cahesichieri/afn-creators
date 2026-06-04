'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function Login() {
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function entrar(e) {
    e.preventDefault()
    setLoading(true)
    setErro('')
    const { data, error } = await supabase.auth.signInWithPassword({ email, password: senha })
    if (error) {
      const msg = error.message?.toLowerCase() || ''
      if (msg.includes('rate') || msg.includes('too many') || msg.includes('limit')) {
        setErro('Muitas tentativas seguidas. Aguarde 30 segundos e tente novamente.')
      } else if (msg.includes('invalid') || msg.includes('email') || msg.includes('password') || msg.includes('credentials')) {
        setErro('E-mail ou senha incorretos.')
      } else {
        setErro('Erro ao entrar. Tente novamente em alguns segundos.')
      }
      setLoading(false); return
    }
    const userId = data.user?.id
    const { data: p } = await supabase.from('perfis').select('tipo').eq('id', userId).single()
    if (p?.tipo === 'creator') { router.push('/creator') }
    else { router.push('/dashboard') }
  }

  return (
    <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'var(--bg)'}}>
      <div style={{width:400,background:'var(--card)',border:'1px solid var(--rule)',borderRadius:8,overflow:'hidden'}}>
        <div style={{background:'var(--navy)',padding:'28px 32px'}}>
          <div style={{fontFamily:'var(--serif)',fontSize:'.75rem',fontWeight:600,letterSpacing:'.2em',textTransform:'uppercase',color:'var(--teal)',marginBottom:8}}>A Farmacia Natural</div>
          <div style={{fontFamily:'var(--serif)',fontSize:'2rem',fontWeight:700,color:'#fff',lineHeight:1.1}}>Creator Platform</div>
        </div>
        <form onSubmit={entrar} style={{padding:'28px 32px',display:'flex',flexDirection:'column',gap:16}}>
          <div style={{display:'flex',flexDirection:'column',gap:5}}>
            <label style={{fontSize:'.6rem',textTransform:'uppercase',letterSpacing:'.12em',color:'var(--ink3)',fontWeight:700}}>E-mail</label>
            <input type="email" value={email} onChange={e=>setEmail(e.target.value)} required
              style={{padding:'10px 12px',border:'1px solid var(--rule)',borderRadius:4,fontSize:'.85rem',outline:'none',background:'var(--bg)'}} placeholder="seu@email.com"/>
          </div>
          <div style={{display:'flex',flexDirection:'column',gap:5}}>
            <label style={{fontSize:'.6rem',textTransform:'uppercase',letterSpacing:'.12em',color:'var(--ink3)',fontWeight:700}}>Senha</label>
            <input type="password" value={senha} onChange={e=>setSenha(e.target.value)} required
              style={{padding:'10px 12px',border:'1px solid var(--rule)',borderRadius:4,fontSize:'.85rem',outline:'none',background:'var(--bg)'}} placeholder="••••••••"/>
          </div>
          {erro && <div style={{fontSize:'.76rem',color:'var(--red)',background:'var(--red-lt)',padding:'8px 12px',borderRadius:4}}>{erro}</div>}
          <button type="submit" disabled={loading} style={{background:'var(--navy)',color:'#fff',border:'none',borderRadius:4,padding:'11px',fontSize:'.82rem',fontWeight:700,opacity:loading?0.6:1}}>
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
          <div style={{textAlign:'center',fontSize:'.74rem',color:'var(--ink3)',paddingTop:8,borderTop:'1px solid var(--rule)'}}>
            Creator nova? <a href="/cadastro" style={{color:'var(--navy)',fontWeight:600}}>Criar conta</a>
          </div>
        </form>
      </div>
    </div>
  )
}
