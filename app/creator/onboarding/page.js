'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

const PERGUNTAS = [
  {
    id: 'nicho',
    pergunta: 'Qual melhor descreve o seu conteúdo principal?',
    opcoes: ['Saúde e bem-estar', 'Fitness e academia', 'Alimentação saudável', 'Maternidade e família', 'Moda e beleza', 'Lifestyle e dia a dia', 'Música e entretenimento', 'Religiosidade e fé', 'Empreendedorismo', 'Outro']
  },
  {
    id: 'publico_idade',
    pergunta: 'Qual a faixa etária predominante do seu público?',
    opcoes: ['18–24 anos', '25–34 anos', '35–44 anos', '45–54 anos', 'Misto / não sei ao certo']
  },
  {
    id: 'publico_genero',
    pergunta: 'Qual o gênero predominante do seu público?',
    opcoes: ['Majoritariamente feminino (70%+)', 'Majoritariamente masculino (70%+)', 'Equilibrado entre os dois']
  },
  {
    id: 'publico_dor',
    pergunta: 'Qual dor ou desejo o seu público mais expressa nos comentários e DMs?',
    opcoes: ['Emagrecer e perder medidas', 'Ter mais disposição e energia', 'Melhorar a pele, cabelo e unhas', 'Equilibrar alimentação sem sofrimento', 'Reduzir ansiedade e compulsão por doce', 'Ganhar massa e definição muscular', 'Cuidar da saúde após os 35', 'Recuperar autoestima e bem-estar']
  },
  {
    id: 'publico_poder',
    pergunta: 'Como você descreveria o poder de compra do seu público?',
    opcoes: ['Baixo — muito sensível a preço', 'Médio — compra com pesquisa', 'Médio-alto — investe em qualidade', 'Alto — pouco sensível a preço']
  },
  {
    id: 'estilo_conteudo',
    pergunta: 'Como você costuma fazer conteúdo de produto?',
    opcoes: ['Mostro na rotina de forma natural, sem parecer anúncio', 'Faço reviews e testes honestos', 'Sigo roteiros e scripts da marca', 'Crio conteúdo educativo sobre o tema do produto', 'Ainda não fiz conteúdo de produto antes']
  },
  {
    id: 'frequencia',
    pergunta: 'Com que frequência você consegue postar conteúdo de parceria?',
    opcoes: ['1–2x por semana', '3–4x por semana', '5x ou mais por semana', 'Menos de 1x por semana']
  },
  {
    id: 'formato_forte',
    pergunta: 'Em qual formato você performa melhor?',
    opcoes: ['Reels curtos (até 30s)', 'Reels longos (30s–2min)', 'Stories com enquete e interação', 'Lives', 'Feed / carrossel', 'Todos funcionam bem']
  },
  {
    id: 'experiencia_supl',
    pergunta: 'Você já usou ou usa algum suplemento ou nutracêutico?',
    opcoes: ['Sim, uso regularmente', 'Já usei, mas parei', 'Nunca usei, mas tenho interesse', 'Nunca usei e não costumo usar']
  },
  {
    id: 'restricao',
    pergunta: 'Você tem alguma restrição ou condição de saúde relevante?',
    opcoes: ['Nenhuma restrição', 'Gestante ou amamentando', 'Hipertensão ou problema cardíaco', 'Hipotireoidismo ou problema tireoidiano', 'Diabetes ou resistência à insulina', 'Prefiro não informar']
  },
  {
    id: 'objetivo_parceria',
    pergunta: 'O que você mais busca nessa parceria?',
    opcoes: ['Renda extra consistente por comissão', 'Produto que eu realmente use e acredite', 'Crescer meu perfil com conteúdo de qualidade', 'Construir uma parceria de longo prazo com a marca', 'Tudo isso junto']
  },
  {
    id: 'disponibilidade',
    pergunta: 'Você está disponível para começar a produzir conteúdo em quanto tempo?',
    opcoes: ['Imediatamente', 'Em até 1 semana', 'Em 2 semanas', 'Em 1 mês ou mais']
  }
]

export default function Onboarding() {
  const [creator, setCreator] = useState(null)
  const [atual, setAtual] = useState(0)
  const [respostas, setRespostas] = useState({})
  const [enviando, setEnviando] = useState(false)
  const [concluido, setConcluido] = useState(false)
  const [jaFez, setJaFez] = useState(false)
  const router = useRouter()

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) { router.push('/login'); return }
      const { data: c } = await supabase.from('creators').select('*').eq('user_id', data.user.id).single()
      if (!c) { router.push('/creator'); return }
      setCreator(c)
      const { data: ob } = await supabase.from('onboarding').select('id,status').eq('creator_id', c.id).single()
      if (ob) setJaFez(true)
    })
  }, [])

  function responder(opcao) {
    const p = PERGUNTAS[atual]
    setRespostas(r => ({ ...r, [p.id]: opcao }))
    if (atual < PERGUNTAS.length - 1) {
      setTimeout(() => setAtual(a => a + 1), 300)
    }
  }

  async function finalizar() {
    if (Object.keys(respostas).length < PERGUNTAS.length) {
      alert('Por favor responda todas as perguntas.')
      return
    }
    setEnviando(true)
    const { error } = await supabase.from('onboarding').insert({
      creator_id: creator.id,
      respostas,
      status: 'pendente'
    })
    setEnviando(false)
    if (error) {
      console.error('Erro onboarding:', error)
      alert('Erro ao salvar: ' + error.message + '. Tente novamente.')
      return
    }
    setConcluido(true)
  }

  const progresso = Math.round((Object.keys(respostas).length / PERGUNTAS.length) * 100)
  const perguntaAtual = PERGUNTAS[atual]
  const respostaAtual = respostas[perguntaAtual?.id]
  const todasRespondidas = Object.keys(respostas).length === PERGUNTAS.length

  if (jaFez) return (
    <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'var(--bg)',padding:24}}>
      <div style={{maxWidth:480,textAlign:'center'}}>
        <div style={{fontSize:'3rem',marginBottom:16}}>✅</div>
        <h2 style={{fontFamily:'var(--serif)',fontSize:'1.6rem',fontWeight:700,color:'var(--navy)',marginBottom:12}}>Perfil já enviado</h2>
        <p style={{fontSize:'.85rem',color:'var(--ink2)',lineHeight:1.7,marginBottom:24}}>Você já preencheu o questionário de perfil. Seu gerente entrará em contato em breve.</p>
        <button onClick={()=>router.push('/creator')} style={{background:'var(--navy)',color:'#fff',border:'none',borderRadius:4,padding:'10px 24px',fontSize:'.82rem',fontWeight:600}}>Voltar ao portal →</button>
      </div>
    </div>
  )

  if (concluido) return (
    <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'var(--bg)',padding:24}}>
      <div style={{maxWidth:480,textAlign:'center'}}>
        <div style={{fontSize:'3rem',marginBottom:16}}>🌿</div>
        <h2 style={{fontFamily:'var(--serif)',fontSize:'1.8rem',fontWeight:700,color:'var(--navy)',marginBottom:12}}>Perfil preenchido!</h2>
        <p style={{fontSize:'.88rem',color:'var(--ink2)',lineHeight:1.75,marginBottom:24}}>Recebemos suas respostas. Nosso time vai analisar seu perfil e em breve você receberá as orientações sobre os produtos que vamos trabalhar juntas.</p>
        <div style={{background:'var(--navy-xs)',border:'1px solid var(--rule)',borderRadius:6,padding:'16px 20px',marginBottom:24,fontSize:'.8rem',color:'var(--ink2)',lineHeight:1.65}}>
          Enquanto isso, fique à vontade para explorar o portal e conhecer melhor a A Farmácia Natural.
        </div>
        <button onClick={()=>router.push('/creator')} style={{background:'var(--navy)',color:'#fff',border:'none',borderRadius:4,padding:'10px 24px',fontSize:'.82rem',fontWeight:600}}>Ir para o meu portal →</button>
      </div>
    </div>
  )

  if (!creator) return <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',color:'var(--ink3)'}}>Carregando...</div>

  return (
    <div style={{minHeight:'100vh',background:'var(--bg)',padding:'40px 24px'}}>
      <div style={{maxWidth:600,margin:'0 auto'}}>

        {/* HEADER */}
        <div style={{textAlign:'center',marginBottom:40}}>
          <div style={{fontFamily:'var(--serif)',fontSize:'.75rem',fontWeight:600,letterSpacing:'.2em',textTransform:'uppercase',color:'var(--teal)',marginBottom:8}}>A Farmácia Natural</div>
          <h1 style={{fontFamily:'var(--serif)',fontSize:'2rem',fontWeight:700,color:'var(--navy)',marginBottom:8}}>Seu perfil de creator</h1>
          <p style={{fontSize:'.82rem',color:'var(--ink3)'}}>Responda com calma — isso nos ajuda a encontrar os produtos certos para você.</p>
        </div>

        {/* PROGRESSO */}
        <div style={{marginBottom:32}}>
          <div style={{display:'flex',justifyContent:'space-between',fontSize:'.68rem',color:'var(--ink3)',marginBottom:8}}>
            <span>{Object.keys(respostas).length} de {PERGUNTAS.length} perguntas</span>
            <span>{progresso}%</span>
          </div>
          <div style={{height:4,background:'var(--rule)',borderRadius:99,overflow:'hidden'}}>
            <div style={{height:'100%',background:'var(--teal)',borderRadius:99,width:progresso+'%',transition:'width .4s ease'}}/>
          </div>
        </div>

        {/* PERGUNTA ATUAL */}
        <div style={{background:'var(--card)',border:'1px solid var(--rule)',borderRadius:8,padding:'28px 28px 24px',marginBottom:20}}>
          <div style={{fontSize:'.62rem',textTransform:'uppercase',letterSpacing:'.14em',color:'var(--teal)',fontWeight:700,marginBottom:10}}>
            Pergunta {atual + 1} de {PERGUNTAS.length}
          </div>
          <h2 style={{fontSize:'1.05rem',fontWeight:700,color:'var(--navy)',marginBottom:20,lineHeight:1.4}}>
            {perguntaAtual.pergunta}
          </h2>
          <div style={{display:'flex',flexDirection:'column',gap:8}}>
            {perguntaAtual.opcoes.map(op => (
              <button key={op} onClick={() => responder(op)}
                style={{
                  padding:'12px 16px',
                  border: respostaAtual === op ? '2px solid var(--navy)' : '1px solid var(--rule)',
                  borderRadius:6,
                  background: respostaAtual === op ? 'var(--navy-xs)' : '#fff',
                  color: respostaAtual === op ? 'var(--navy)' : 'var(--ink2)',
                  fontSize:'.82rem',
                  fontWeight: respostaAtual === op ? 700 : 400,
                  textAlign:'left',
                  cursor:'pointer',
                  transition:'all .15s',
                  display:'flex',
                  alignItems:'center',
                  gap:10
                }}>
                <span style={{width:18,height:18,borderRadius:'50%',border: respostaAtual === op ? '2px solid var(--navy)' : '1.5px solid var(--rule)',background: respostaAtual === op ? 'var(--navy)' : '#fff',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                  {respostaAtual === op && <span style={{width:8,height:8,borderRadius:'50%',background:'#fff',display:'block'}}/>}
                </span>
                {op}
              </button>
            ))}
          </div>
        </div>

        {/* NAVEGAÇÃO */}
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:12}}>
          <button onClick={() => setAtual(a => Math.max(0, a-1))} disabled={atual === 0}
            style={{padding:'9px 16px',border:'1px solid var(--rule)',borderRadius:4,background:'transparent',fontSize:'.78rem',color:'var(--ink3)',opacity:atual===0?.4:1}}>
            ← Anterior
          </button>

          <div style={{display:'flex',gap:6,flex:1,justifyContent:'center'}}>
            {PERGUNTAS.map((p, i) => (
              <div key={i} onClick={() => setAtual(i)} style={{width:8,height:8,borderRadius:'50%',background:respostas[p.id]?'var(--navy)':i===atual?'var(--teal)':'var(--rule)',cursor:'pointer',transition:'all .2s',flexShrink:0}}/>
            ))}
          </div>

          {atual < PERGUNTAS.length - 1 ? (
            <button onClick={() => setAtual(a => a+1)} disabled={!respostaAtual}
              style={{padding:'9px 16px',border:'none',borderRadius:4,background:'var(--navy)',color:'#fff',fontSize:'.78rem',fontWeight:600,opacity:respostaAtual?1:.4}}>
              Próxima →
            </button>
          ) : (
            <button onClick={finalizar} disabled={!todasRespondidas || enviando}
              style={{padding:'9px 20px',border:'none',borderRadius:4,background:todasRespondidas?'var(--green)':'var(--ink3)',color:'#fff',fontSize:'.82rem',fontWeight:700}}>
              {enviando ? 'Enviando...' : 'Finalizar perfil ✓'}
            </button>
          )}
        </div>

      </div>
    </div>
  )
}
