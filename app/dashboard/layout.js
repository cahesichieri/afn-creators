'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'

const nav = [
  { href:'/dashboard',             icon:'📊', label:'Dashboard'   },
  { href:'/dashboard/creators',    icon:'👤', label:'Creators'    },
  { href:'/dashboard/campanhas',   icon:'📥', label:'Campanhas'   },
  { href:'/dashboard/roteiros',    icon:'📝', label:'Roteiros'    },
  { href:'/dashboard/comissoes',   icon:'💰', label:'Comissões'   },
  { href:'/dashboard/analise',     icon:'🤖', label:'Análise IA'  },
]

export default function DashboardLayout({ children }) {
  const [perfil, setPerfil] = useState(null)
  const [total, setTotal] = useState(0)
  const router = useRouter()
  const path = usePathname()

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data?.user) { router.push('/login'); return }
      supabase.from('perfis').select('*').eq('id', data.user.id).single()
        .then(({ data: p }) => { if (p) setPerfil(p); else router.push('/login') })
    })
    supabase.from('creators').select('id', { count:'exact', head:true })
      .then(({ count }) => setTotal(count||0))
  }, [])

  async function sair() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <div style={{display:'grid',gridTemplateColumns:'220px 1fr',minHeight:'100vh'}}>
      <aside style={{background:'var(--navy)',display:'flex',flexDirection:'column',position:'sticky',top:0,height:'100vh'}}>
        <div style={{padding:'24px 22px 20px',borderBottom:'1px solid rgba(255,255,255,.08)'}}>
          <div style={{fontFamily:'var(--serif)',fontSize:'.72rem',fontWeight:600,letterSpacing:'.2em',textTransform:'uppercase',color:'var(--teal)',marginBottom:4}}>A Farmácia Natural</div>
          <div style={{fontSize:'.88rem',fontWeight:700,color:'#fff'}}>Creator Platform</div>
        </div>
        <div style={{padding:'8px 0',flex:1}}>
          <div style={{fontSize:'.55rem',textTransform:'uppercase',letterSpacing:'.18em',color:'rgba(255,255,255,.25)',fontWeight:700,padding:'12px 22px 6px'}}>Menu</div>
          {nav.map(item => {
            const active = path === item.href || (item.href !== '/dashboard' && path.startsWith(item.href))
            return (
              <Link key={item.href} href={item.href} style={{display:'flex',alignItems:'center',gap:9,padding:'9px 22px',fontSize:'.78rem',fontWeight:500,color:active?'#fff':'rgba(255,255,255,.5)',borderLeft:active?'2px solid var(--teal)':'2px solid transparent',background:active?'rgba(66,194,214,.1)':'transparent',transition:'all .15s'}}>
                <span style={{fontSize:'.85rem',width:16,textAlign:'center'}}>{item.icon}</span>
                {item.label}
              </Link>
            )
          })}
        </div>
        <div style={{padding:'16px 22px',borderTop:'1px solid rgba(255,255,255,.08)'}}>
          <div style={{fontSize:'.55rem',textTransform:'uppercase',letterSpacing:'.12em',color:'rgba(255,255,255,.25)',marginBottom:4}}>Creators ativas</div>
          <div style={{fontFamily:'var(--serif)',fontSize:'1.6rem',fontWeight:700,color:'var(--teal)',lineHeight:1,marginBottom:12}}>{total}</div>
          {perfil && <div style={{fontSize:'.68rem',color:'rgba(255,255,255,.4)',marginBottom:8}}>{perfil.nome} · {perfil.tipo}</div>}
          <button onClick={sair} style={{fontSize:'.68rem',color:'rgba(255,255,255,.35)',background:'none',border:'1px solid rgba(255,255,255,.1)',borderRadius:3,padding:'5px 10px',width:'100%'}}>Sair</button>
        </div>
      </aside>
      <main style={{background:'var(--bg)',overflowY:'auto'}}>
        <div style={{background:'var(--card)',borderBottom:'1px solid var(--rule)',padding:'14px 32px',position:'sticky',top:0,zIndex:10,display:'flex',alignItems:'center',justifyContent:'space-between'}}>
          <div>
            <div style={{fontFamily:'var(--serif)',fontSize:'1.2rem',fontWeight:700,color:'var(--navy)'}}>AFN · <span style={{color:'var(--teal-d)'}}>Creator Platform</span></div>
            <div style={{fontSize:'.65rem',color:'var(--ink3)',textTransform:'uppercase',letterSpacing:'.1em'}}>Performance · Conteúdo · Conversão</div>
          </div>
        </div>
        <div style={{padding:'28px 32px'}}>{children}</div>
      </main>
    </div>
  )
}
