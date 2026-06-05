'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { callAI } from '@/lib/aiQueue'

const fmt = n => (n||0).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2})

// ── MESES ──────────────────────────────────────────────────────────
const MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']

export default function Campanhas() {
  const [aba, setAba] = useState('campanhas')

  return (
    <div>
      {/* TABS */}
      <div style={{display:'flex',gap:0,border:'1px solid var(--rule)',borderRadius:6,overflow:'hidden',marginBottom:24,background:'var(--card)',width:'fit-content'}}>
        {[['campanhas','📥 Campanhas'],['estrategia','📅 Estratégia do Mês']].map(([id,label])=>(
          <button key={id} onClick={()=>setAba(id)}
            style={{padding:'9px 20px',fontSize:'.76rem',fontWeight:600,color:aba===id?'#fff':'var(--ink3)',background:aba===id?'var(--navy)':'transparent',border:'none',borderRight:'1px solid var(--rule)'}}>
            {label}
          </button>
        ))}
      </div>

      {aba==='campanhas' && <TabCampanhas />}
      {aba==='estrategia' && <TabEstrategia />}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════
// TAB 1 — CAMPANHAS (existente)
// ══════════════════════════════════════════════════════════════════
function TabCampanhas() {
  const [campanhas, setCampanhas] = useState([])
  const [creators, setCreators] = useState([])
  const [produtos, setProdutos] = useState([])
  const [modal, setModal] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [analisando, setAnalisando] = useState(false)
  const [uploads, setUploads] = useState([])
  const [produtosSelecionados, setProdutosSelecionados] = useState([])
  const [form, setForm] = useState({
    creator_id:null, data_inicio:'', data_fim:'', fonte:'manual', produto_id:null,
    leads:0, checkouts:0, pedidos_gerados:0, pedidos_pagos:0, receita:0,
    alcance:0, impressoes:0, views_reels:0, comentarios:0, dms:0,
    reels:0, stories_cta:0, stories_ind:0, lifestyle:0, lives:0,
    seguiu_roteiros:'', usou_vip:'', melhor_formato:'',
    positivo:'', negativo:'', observacoes:'', analise_ia:'',
  })

  useEffect(() => { carregar() }, [])

  async function carregar() {
    const [{ data: cs }, { data: camps }, { data: ps }] = await Promise.all([
      supabase.from('creators').select('id,nome').in('status',['ativa','recrutamento']).order('nome'),
      supabase.from('campanhas').select('*,creators(nome),produtos(nome)').order('created_at',{ascending:false}).limit(50),
      supabase.from('produtos').select('id,nome').eq('ativo',true),
    ])
    setCreators(cs||[])
    setCampanhas(camps||[])
    setProdutos(ps||[])
  }

  function n(id) { return parseFloat(form[id])||0 }

  async function extrairPrints() {
    if (!uploads.length) { alert('Faça upload dos prints primeiro.'); return }
    setAnalisando(true)
    try {
      const imagens = await Promise.all(uploads.map(f => new Promise((res,rej) => {
        const r = new FileReader()
        r.onload = e => { const [h,d]=e.target.result.split(','); res({type:h.match(/:(.*?);/)[1],data:d}) }
        r.onerror = rej
        r.readAsDataURL(f)
      })))
      const content = [
        { type:'text', text:`Analise estes prints do Instagram Insights. Extraia TODOS os dados numéricos visíveis. Depois forneça uma análise de performance. Responda em português.\n\n## Dados Extraídos\n(liste cada métrica com valor exato)\n\n## Diagnóstico de Performance\n## Pontos Fortes  \n## O que Melhorar\n## Recomendações` },
        ...imagens.map(img=>({type:'image',source:{type:'base64',media_type:img.type,data:img.data}}))
      ]
      const texto = await callAI({ messages:[{role:'user',content}] })
      setForm(f=>({...f, analise_ia:texto, fonte:'prints_ia'}))
    } catch(e) { alert(`Erro ao analisar prints: ${e.message}`) }
    setAnalisando(false)
  }

  function periodoFormatado() {
    if (!form.data_inicio) return ''
    if (!form.data_fim) return form.data_inicio
    const fmt = d => { const [y,m,dia]=d.split('-'); return `${dia}/${m}/${y}` }
    return `${fmt(form.data_inicio)} a ${fmt(form.data_fim)}`
  }

  async function salvar() {
    if (!form.creator_id || !form.data_inicio) { alert('Creator e data de início são obrigatórios.'); return }
    setSalvando(true)
    const periodo = periodoFormatado()
    const produto_id = produtosSelecionados[0] || null
    const produtos_nomes = produtosSelecionados.map(id => produtos.find(p=>p.id===id)?.nome).filter(Boolean).join(', ')
    const payload = { ...form, periodo, produto_id,
      leads:n('leads'), checkouts:n('checkouts'),
      pedidos_gerados:n('pedidos_gerados'), pedidos_pagos:n('pedidos_pagos'),
      receita:n('receita'), alcance:n('alcance'), impressoes:n('impressoes'),
      views_reels:n('views_reels'), comentarios:n('comentarios'), dms:n('dms'),
      reels:n('reels'), stories_cta:n('stories_cta'), stories_ind:n('stories_ind'),
      lifestyle:n('lifestyle'), lives:n('lives'),
      observacoes: produtos_nomes ? `Produtos: ${produtos_nomes}${form.observacoes ? '\n'+form.observacoes : ''}` : form.observacoes,
    }
    delete payload.data_inicio
    delete payload.data_fim
    await supabase.from('campanhas').insert(payload)
    setSalvando(false); setModal(false)
    setForm(f=>({...f,creator_id:null,data_inicio:'',data_fim:'',leads:0,pedidos_pagos:0,receita:0}))
    setProdutosSelecionados([])
    setUploads([])
    carregar()
  }

  const fld = (label, id, type='text', full=false, opts=null) => (
    <div style={{display:'flex',flexDirection:'column',gap:5,gridColumn:full?'1/-1':''}}>
      <label style={{fontSize:'.58rem',textTransform:'uppercase',letterSpacing:'.1em',color:'var(--ink3)',fontWeight:700}}>{label}</label>
      {opts ? (
        <select value={form[id]} onChange={e=>setForm({...form,[id]:e.target.value})} style={{padding:'8px 10px',border:'1px solid var(--rule)',borderRadius:4,fontSize:'.78rem',background:'var(--bg)',outline:'none'}}>
          {opts.map(o=><option key={o.v} value={o.v}>{o.l}</option>)}
        </select>
      ) : type==='textarea' ? (
        <textarea value={form[id]} onChange={e=>setForm({...form,[id]:e.target.value})} rows={3}
          style={{padding:'8px 10px',border:'1px solid var(--rule)',borderRadius:4,fontSize:'.78rem',background:'var(--bg)',outline:'none',resize:'vertical'}}/>
      ) : (
        <input type={type} value={form[id]} onChange={e=>setForm({...form,[id]:e.target.value})}
          style={{padding:'8px 10px',border:'1px solid var(--rule)',borderRadius:4,fontSize:'.78rem',background:'var(--bg)',outline:'none'}}/>
      )}
    </div>
  )

  return (
    <div>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
        <div style={{fontSize:'.6rem',textTransform:'uppercase',letterSpacing:'.2em',color:'var(--teal)',fontWeight:700}}>
          {campanhas.length} campanha{campanhas.length!==1?'s':''} registrada{campanhas.length!==1?'s':''}
        </div>
        <button onClick={()=>setModal(true)} style={{background:'var(--navy)',color:'#fff',border:'none',borderRadius:4,padding:'8px 16px',fontSize:'.75rem',fontWeight:600}}>
          + Inserir campanha
        </button>
      </div>

      <div style={{background:'var(--card)',border:'1px solid var(--rule)',borderRadius:6,overflow:'hidden'}}>
        {campanhas.length===0 ? (
          <div style={{textAlign:'center',padding:48,color:'var(--ink3)'}}>
            <div style={{fontSize:'2rem',opacity:.25,marginBottom:10}}>📥</div>
            <p style={{fontSize:'.78rem'}}>Nenhuma campanha ainda.</p>
          </div>
        ) : (
          <table style={{width:'100%',borderCollapse:'collapse'}}>
            <thead><tr style={{borderBottom:'2px solid var(--navy)'}}>
              {['Creator','Período','Fonte','Leads','Vendas','Conv.','Receita','Comissão'].map(h=>(
                <th key={h} style={{fontSize:'.58rem',textTransform:'uppercase',letterSpacing:'.1em',color:'var(--ink3)',fontWeight:700,padding:'10px 14px',textAlign:'left',background:'var(--bg)'}}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {campanhas.map(c=>{
                const conv = c.leads>0?(c.pedidos_pagos/c.leads*100).toFixed(1):0
                const comissao = (c.receita||0)*0.15
                return (
                  <tr key={c.id} style={{borderBottom:'1px solid var(--rule)'}}>
                    <td style={{padding:'10px 14px',fontWeight:600,color:'var(--ink)',fontSize:'.82rem'}}>{c.creators?.nome||'—'}</td>
                    <td style={{padding:'10px 14px',fontSize:'.76rem',color:'var(--ink2)'}}>{c.periodo}</td>
                    <td style={{padding:'10px 14px'}}>
                      <span style={{fontSize:'.6rem',padding:'2px 7px',borderRadius:3,fontWeight:700,background:c.fonte==='prints_ia'?'var(--teal-lt)':c.fonte==='partnership_ads'?'#e8f0ff':'var(--navy-xs)',color:c.fonte==='prints_ia'?'var(--teal-d)':c.fonte==='partnership_ads'?'#2244aa':'var(--navy)'}}>
                        {c.fonte==='prints_ia'?'Prints IA':c.fonte==='partnership_ads'?'Partnership':'Manual'}
                      </span>
                    </td>
                    <td style={{padding:'10px 14px',fontSize:'.76rem',color:'var(--ink2)'}}>{(c.leads||0).toLocaleString('pt-BR')}</td>
                    <td style={{padding:'10px 14px',fontSize:'.76rem',color:'var(--ink2)'}}>{c.pedidos_pagos||0}</td>
                    <td style={{padding:'10px 14px'}}>
                      <span style={{fontSize:'.6rem',fontWeight:700,padding:'3px 8px',borderRadius:3,background:parseFloat(conv)>=5?'var(--green-lt)':parseFloat(conv)>=2?'var(--amber-lt)':'var(--red-lt)',color:parseFloat(conv)>=5?'var(--green)':parseFloat(conv)>=2?'var(--amber)':'var(--red)'}}>
                        {conv}%
                      </span>
                    </td>
                    <td style={{padding:'10px 14px',fontSize:'.76rem',color:'var(--green)',fontWeight:600}}>R$ {fmt(c.receita)}</td>
                    <td style={{padding:'10px 14px',fontSize:'.76rem',color:'var(--amber)',fontWeight:600}}>R$ {fmt(comissao)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {modal && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.55)',display:'flex',alignItems:'flex-start',justifyContent:'center',zIndex:100,paddingTop:40,overflowY:'auto'}}>
          <div style={{background:'var(--card)',width:680,borderRadius:8,border:'1px solid var(--rule)',marginBottom:40}}>
            <div style={{background:'var(--navy)',padding:'18px 24px',display:'flex',alignItems:'center',justifyContent:'space-between',borderRadius:'8px 8px 0 0'}}>
              <div style={{fontFamily:'var(--serif)',fontSize:'1.1rem',fontWeight:700,color:'#fff'}}>Inserir Campanha</div>
              <button onClick={()=>setModal(false)} style={{color:'rgba(255,255,255,.5)',background:'none',border:'none',fontSize:'1.2rem'}}>✕</button>
            </div>
            <div style={{padding:24}}>
              <div style={{fontSize:'.62rem',textTransform:'uppercase',letterSpacing:'.12em',color:'var(--navy)',fontWeight:700,marginBottom:12,display:'flex',alignItems:'center',gap:8}}>
                <span style={{width:3,height:12,background:'var(--teal)',borderRadius:2,display:'inline-block'}}/>Identificação
              </div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:20}}>
                {fld('Creator','creator_id','text',false,[{v:'',l:'Selecionar creator...'},...creators.map(c=>({v:c.id,l:c.nome}))])}
                {fld('Fonte','fonte','text',false,[{v:'manual',l:'Manual'},{v:'prints_ia',l:'Prints IA'},{v:'partnership_ads',l:'Partnership Ads'}])}
                {fld('Início da campanha','data_inicio','date')}
                {fld('Fim da campanha','data_fim','date')}
              </div>
              <div style={{marginBottom:20}}>
                <div style={{fontSize:'.62rem',textTransform:'uppercase',letterSpacing:'.12em',color:'var(--navy)',fontWeight:700,marginBottom:10,display:'flex',alignItems:'center',gap:8}}>
                  <span style={{width:3,height:12,background:'var(--teal)',borderRadius:2,display:'inline-block'}}/>Produtos da campanha
                  {produtosSelecionados.length>0 && <span style={{fontSize:'.62rem',color:'var(--teal-d)',fontWeight:600,marginLeft:4}}>({produtosSelecionados.length} selecionado{produtosSelecionados.length>1?'s':''})</span>}
                </div>
                <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
                  {produtos.map(p=>{
                    const sel = produtosSelecionados.includes(p.id)
                    return (
                      <label key={p.id} style={{display:'flex',alignItems:'center',gap:6,padding:'7px 12px',border:`1px solid ${sel?'var(--teal-d)':'var(--rule)'}`,borderRadius:4,background:sel?'var(--teal-lt)':'var(--bg)',cursor:'pointer',fontSize:'.76rem',fontWeight:sel?700:400,color:sel?'var(--teal-d)':'var(--ink2)',transition:'all .15s'}}>
                        <input type="checkbox" checked={sel} onChange={()=>setProdutosSelecionados(s=>s.includes(p.id)?s.filter(x=>x!==p.id):[...s,p.id])} style={{accentColor:'var(--teal-d)',width:13,height:13}}/>
                        {p.nome}
                      </label>
                    )
                  })}
                </div>
              </div>
              <div style={{background:'var(--teal-lt)',border:'1px solid var(--rule)',borderRadius:4,padding:'14px 16px',marginBottom:20}}>
                <div style={{fontSize:'.65rem',fontWeight:700,color:'var(--teal-d)',textTransform:'uppercase',letterSpacing:'.1em',marginBottom:8}}>Upload de Prints (opcional)</div>
                <input type="file" accept="image/*" multiple onChange={e=>setUploads(Array.from(e.target.files))} style={{fontSize:'.76rem',color:'var(--ink2)',marginBottom:8,display:'block'}}/>
                {uploads.length>0 && <div style={{fontSize:'.72rem',color:'var(--teal-d)',fontWeight:600}}>{uploads.length} arquivo(s) selecionado(s)</div>}
                <button onClick={extrairPrints} disabled={analisando||!uploads.length}
                  style={{marginTop:10,background:analisando||!uploads.length?'var(--ink3)':'var(--teal-d)',color:'#fff',border:'none',borderRadius:4,padding:'7px 14px',fontSize:'.72rem',fontWeight:700}}>
                  {analisando?'⏳ Analisando...':'🤖 Extrair dados com IA →'}
                </button>
              </div>
              <div style={{fontSize:'.62rem',textTransform:'uppercase',letterSpacing:'.12em',color:'var(--navy)',fontWeight:700,marginBottom:12,display:'flex',alignItems:'center',gap:8}}>
                <span style={{width:3,height:12,background:'var(--teal)',borderRadius:2,display:'inline-block'}}/>Funil de Conversão
              </div>
              <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12,marginBottom:20}}>
                {fld('Leads','leads','number')}
                {fld('Checkouts','checkouts','number')}
                {fld('Ped. Gerados','pedidos_gerados','number')}
                {fld('Ped. Pagos','pedidos_pagos','number')}
                {fld('Receita (R$)','receita','number')}
                {fld('Alcance','alcance','number')}
                {fld('Views Reels','views_reels','number')}
                {fld('Comentários','comentarios','number')}
              </div>
              <div style={{fontSize:'.62rem',textTransform:'uppercase',letterSpacing:'.12em',color:'var(--navy)',fontWeight:700,marginBottom:12,display:'flex',alignItems:'center',gap:8}}>
                <span style={{width:3,height:12,background:'var(--teal)',borderRadius:2,display:'inline-block'}}/>Conteúdo Produzido
              </div>
              <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12,marginBottom:20}}>
                {fld('Reels','reels','number')}
                {fld('Stories CTA','stories_cta','number')}
                {fld('Stories Ind.','stories_ind','number')}
                {fld('Lifestyle','lifestyle','number')}
              </div>
              <div style={{fontSize:'.62rem',textTransform:'uppercase',letterSpacing:'.12em',color:'var(--navy)',fontWeight:700,marginBottom:12,display:'flex',alignItems:'center',gap:8}}>
                <span style={{width:3,height:12,background:'var(--teal)',borderRadius:2,display:'inline-block'}}/>Qualitativo
              </div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:8}}>
                {fld('O que funcionou','positivo','textarea')}
                {fld('O que não funcionou','negativo','textarea')}
              </div>
              {form.analise_ia && (
                <div style={{background:'var(--navy-xs)',border:'1px solid var(--rule)',borderRadius:4,padding:'12px 14px',marginBottom:12}}>
                  <div style={{fontSize:'.6rem',textTransform:'uppercase',letterSpacing:'.1em',color:'var(--navy)',fontWeight:700,marginBottom:6}}>✓ Análise IA extraída dos prints</div>
                  <div style={{fontSize:'.72rem',color:'var(--ink2)',lineHeight:1.6,maxHeight:100,overflow:'auto'}}>{form.analise_ia.substring(0,300)}...</div>
                </div>
              )}
            </div>
            <div style={{padding:'0 24px 24px',display:'flex',gap:10,justifyContent:'flex-end'}}>
              <button onClick={()=>setModal(false)} style={{padding:'9px 16px',border:'1px solid var(--rule)',borderRadius:4,background:'transparent',fontSize:'.78rem',color:'var(--ink3)'}}>Cancelar</button>
              <button onClick={salvar} disabled={salvando} style={{padding:'9px 20px',background:'var(--navy)',color:'#fff',border:'none',borderRadius:4,fontSize:'.78rem',fontWeight:700}}>
                {salvando?'Salvando...':'Salvar campanha →'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════
// TAB 2 — ESTRATÉGIA DO MÊS
// ══════════════════════════════════════════════════════════════════
function TabEstrategia() {
  const [creators, setCreators] = useState([])
  const [produtos, setProdutos] = useState([])
  const [estrategias, setEstrategias] = useState([])

  // Formulário de briefing
  const anoAtual = new Date().getFullYear()
  const mesAtual = new Date().getMonth() // 0-indexed
  const [briefing, setBriefing] = useState({
    mes: mesAtual,
    ano: anoAtual,
    produtos_foco: [],
    objetivo: '',
    contexto: '',
    tom: 'educativo_premissas',
  })

  // Seleção de creators
  const [creatorsSelected, setCreatorsSelected] = useState([]) // [] = nenhuma, ['all'] = todas
  const [todasCreators, setTodasCreators] = useState(false)

  // Estados da geração
  const [gerando, setGerando] = useState(false)
  const [preview, setPreview] = useState(null) // estratégia gerada pela IA
  const [salvando, setSalvando] = useState(false)
  const [salvoOk, setSalvoOk] = useState(false)

  // Expandir semana no preview
  const [semanaAberta, setSemanaAberta] = useState(0)

  useEffect(() => { carregarDados() }, [])

  async function carregarDados() {
    const [{ data: cs }, { data: ps }, { data: es }] = await Promise.all([
      supabase.from('creators').select('id,nome,instagram,nicho').in('status',['ativa','recrutamento']).order('nome'),
      supabase.from('produtos').select('id,nome,preco').eq('ativo',true),
      supabase.from('estrategias_mensais').select('*').order('created_at',{ascending:false}).limit(10),
    ])
    setCreators(cs||[])
    setProdutos(ps||[])
    setEstrategias(es||[])
  }

  function toggleCreator(id) {
    setCreatorsSelected(s => s.includes(id) ? s.filter(x=>x!==id) : [...s,id])
  }

  function toggleTodas() {
    if (todasCreators) {
      setTodasCreators(false)
      setCreatorsSelected([])
    } else {
      setTodasCreators(true)
      setCreatorsSelected(creators.map(c=>c.id))
    }
  }

  const creatorsAlvo = todasCreators ? creators : creators.filter(c=>creatorsSelected.includes(c.id))
  const produtosSelecionados = produtos.filter(p=>briefing.produtos_foco.includes(p.id))

  function toggleProduto(id) {
    setBriefing(b => ({
      ...b,
      produtos_foco: b.produtos_foco.includes(id)
        ? b.produtos_foco.filter(x=>x!==id)
        : [...b.produtos_foco, id]
    }))
  }

  async function gerarEstrategia() {
    if (briefing.produtos_foco.length === 0) { alert('Selecione pelo menos um produto.'); return }
    if (creatorsAlvo.length===0) { alert('Selecione pelo menos uma creator.'); return }
    if (!briefing.objetivo.trim()) { alert('Preencha o objetivo do mês.'); return }

    setGerando(true)
    setPreview(null)
    setSalvoOk(false)

    const nomeMes = MESES[briefing.mes]
    const numCreators = creatorsAlvo.length
    const nomeProdutos = produtosSelecionados.map(p=>p.nome).join(', ')

    const prompt = `Você é a IA da A Farmácia Natural (AFN), especialista em Marketing de Premissas para o Instagram.

BRIEFING DO MÊS:
- Mês: ${nomeMes}/${briefing.ano}
- Produto(s) foco: ${nomeProdutos}
- Objetivo: ${briefing.objetivo}
- Contexto/Sazonalidade: ${briefing.contexto || 'Nenhum contexto adicional'}
- Tom: Educativo com premissas científicas, acolhedor, sem promessas miraculosas
- Estratégia: Reels engaja → Stories converte (Marketing de Premissas)

METODOLOGIA:
- Semana 1: Conscientização — Reel educativo de problema/dor. Stories de premissa leve.
- Semana 2: Premissa 1 — Reel com dado/ciência que valida o produto. Stories com prova social.
- Semana 3: Premissa 2 — Reel aprofundando benefício específico. Stories com bastidor/uso.
- Semana 4: Conversão — Reel CTA direto. Stories com oferta/link.

Gere uma estratégia completa para ${numCreators} creator(s) no mês de ${nomeMes}.
Para cada semana, entregue 1 roteiro de Reel + 2 roteiros de Stories.

FORMATO DE RESPOSTA — JSON puro, sem markdown, sem explicação:
{
  "titulo": "Estratégia ${nomeMes}/${briefing.ano} — ${nomeProdutos}",
  "resumo": "Resumo executivo em 2 linhas",
  "semanas": [
    {
      "numero": 1,
      "tema": "Nome do tema da semana",
      "foco": "conscientizacao",
      "conteudos": [
        {
          "tipo": "educativo",
          "formato": "reel",
          "tema": "Título do Reel",
          "gancho_01": "Frase de abertura que para o scroll (máx 15 palavras)",
          "premissa_01": "Premissa científica ou dado que valida (máx 25 palavras)",
          "premissa_02": "Desenvolvimento ou segunda premissa (máx 25 palavras)",
          "gancho_02": "Virada ou pergunta reflexiva (máx 15 palavras)",
          "cta": "Call to action específico (máx 15 palavras)"
        },
        {
          "tipo": "indireto",
          "formato": "stories",
          "tema": "Título do Stories 1",
          "gancho_01": "Abertura do Stories",
          "premissa_01": "Conteúdo principal",
          "cta": "Swipe up ou resposta"
        },
        {
          "tipo": "indireto",
          "formato": "stories",
          "tema": "Título do Stories 2",
          "gancho_01": "Abertura do Stories",
          "premissa_01": "Conteúdo principal",
          "cta": "Swipe up ou resposta"
        }
      ]
    },
    { "numero": 2, "tema": "...", "foco": "premissa_1", "conteudos": [...] },
    { "numero": 3, "tema": "...", "foco": "premissa_2", "conteudos": [...] },
    { "numero": 4, "tema": "...", "foco": "conversao", "conteudos": [...] }
  ]
}`

    try {
      const texto = await callAI(
        { messages:[{role:'user',content:prompt}], max_tokens:6000 },
        { onRetry: (n, ms) => console.log(`Estratégia: tentativa ${n}, aguardando ${ms}ms...`) }
      )
      if (!texto) throw new Error('A IA retornou uma resposta vazia.')

      // Parse JSON da resposta — tenta encontrar o bloco JSON
      let estrategia
      const jsonMatch = texto.match(/\{[\s\S]*\}/)
      if (!jsonMatch) throw new Error('A IA não retornou o formato esperado. Tente gerar novamente.')
      try {
        estrategia = JSON.parse(jsonMatch[0])
      } catch {
        throw new Error('Erro ao interpretar resposta da IA. Tente gerar novamente.')
      }
      if (!estrategia.semanas?.length) throw new Error('Estratégia incompleta. Tente gerar novamente.')
      setPreview(estrategia)
      setSemanaAberta(0)
    } catch(e) {
      alert('Erro ao gerar estratégia: ' + e.message)
    }
    setGerando(false)
  }

  async function salvarEstrategia() {
    if (!preview) return
    setSalvando(true)

    const nomeMes = MESES[briefing.mes]
    const mesRef = `${nomeMes}/${briefing.ano}`

    // 1. Salva na tabela estrategias_mensais
    const { data: est } = await supabase.from('estrategias_mensais').insert({
      mes_referencia: mesRef,
      produtos_ids: briefing.produtos_foco,
      objetivo: briefing.objetivo,
      contexto: briefing.contexto,
      creators_ids: creatorsAlvo.map(c=>c.id),
      conteudo_json: JSON.stringify(preview),
    }).select().single()

    // 2. Cria roteiros para cada creator selecionada
    const ano = briefing.ano
    const mesNum = briefing.mes // 0-indexed

    const roteiros = []
    for (const creator of creatorsAlvo) {
      for (let s = 0; s < preview.semanas.length; s++) {
        const semana = preview.semanas[s]
        // Data de início da semana (segunda-feira da semana correspondente)
        const diaBase = 1 + s * 7
        const dataPost = new Date(ano, mesNum, Math.min(diaBase, 28))
        const dataStr = dataPost.toISOString().split('T')[0]

        for (const c of semana.conteudos) {
          roteiros.push({
            creator_id: creator.id,
            tema: c.tema,
            tipo: c.tipo,
            formato: c.formato,
            data_post: dataStr,
            gancho_01: c.gancho_01 || null,
            premissa_01: c.premissa_01 || null,
            premissa_02: c.premissa_02 || null,
            gancho_02: c.gancho_02 || null,
            cta: c.cta || null,
            semana: semana.numero,
            mes_referencia: mesRef,
            status: 'pendente',
          })
        }
      }
    }

    await supabase.from('roteiros').insert(roteiros)
    setSalvando(false)
    setSalvoOk(true)
    carregarDados()
  }

  const focoLabel = { conscientizacao:'👁 Consciência', premissa_1:'🔬 Premissa 1', premissa_2:'💡 Premissa 2', conversao:'🛒 Conversão' }
  const focoColor = { conscientizacao:'var(--teal-d)', premissa_1:'var(--navy)', premissa_2:'var(--amber)', conversao:'var(--green)' }
  const focoBg = { conscientizacao:'var(--teal-lt)', premissa_1:'var(--navy-xs)', premissa_2:'var(--amber-lt)', conversao:'var(--green-lt)' }

  return (
    <div>
      <div style={{display:'grid',gridTemplateColumns:'360px 1fr',gap:24,alignItems:'start'}}>

        {/* ── COLUNA ESQUERDA: BRIEFING ─────────────────────────── */}
        <div>

          {/* Briefing */}
          <div style={{background:'var(--card)',border:'1px solid var(--rule)',borderRadius:8,overflow:'hidden',marginBottom:16}}>
            <div style={{background:'var(--navy)',padding:'14px 18px'}}>
              <div style={{fontFamily:'var(--serif)',fontSize:'1rem',fontWeight:700,color:'#fff'}}>Briefing do Mês</div>
              <div style={{fontSize:'.62rem',color:'rgba(255,255,255,.45)',marginTop:2}}>Preencha para gerar a estratégia</div>
            </div>
            <div style={{padding:18,display:'flex',flexDirection:'column',gap:12}}>

              {/* Mês/Ano */}
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
                <div style={{display:'flex',flexDirection:'column',gap:4}}>
                  <label style={{fontSize:'.58rem',textTransform:'uppercase',letterSpacing:'.1em',color:'var(--ink3)',fontWeight:700}}>Mês</label>
                  <select value={briefing.mes} onChange={e=>setBriefing(b=>({...b,mes:parseInt(e.target.value)}))}
                    style={{padding:'8px 10px',border:'1px solid var(--rule)',borderRadius:4,fontSize:'.78rem',background:'var(--bg)',outline:'none'}}>
                    {MESES.map((m,i)=><option key={i} value={i}>{m}</option>)}
                  </select>
                </div>
                <div style={{display:'flex',flexDirection:'column',gap:4}}>
                  <label style={{fontSize:'.58rem',textTransform:'uppercase',letterSpacing:'.1em',color:'var(--ink3)',fontWeight:700}}>Ano</label>
                  <input type="number" value={briefing.ano} onChange={e=>setBriefing(b=>({...b,ano:parseInt(e.target.value)}))}
                    style={{padding:'8px 10px',border:'1px solid var(--rule)',borderRadius:4,fontSize:'.78rem',background:'var(--bg)',outline:'none'}}/>
                </div>
              </div>

              {/* Produtos foco — multi-select via checkboxes */}
              <div style={{display:'flex',flexDirection:'column',gap:6}}>
                <label style={{fontSize:'.58rem',textTransform:'uppercase',letterSpacing:'.1em',color:'var(--ink3)',fontWeight:700}}>Produto(s) foco</label>
                <div style={{display:'flex',flexDirection:'column',gap:4}}>
                  {produtos.map(p => {
                    const sel = briefing.produtos_foco.includes(p.id)
                    return (
                      <label key={p.id} onClick={()=>toggleProduto(p.id)}
                        style={{display:'flex',alignItems:'center',gap:8,padding:'7px 10px',borderRadius:4,border:`1px solid ${sel?'var(--navy)':'var(--rule)'}`,background:sel?'var(--navy-xs)':'var(--bg)',cursor:'pointer',fontSize:'.78rem',userSelect:'none'}}>
                        <span style={{width:14,height:14,borderRadius:3,border:`2px solid ${sel?'var(--navy)':'var(--ink3)'}`,background:sel?'var(--navy)':'transparent',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                          {sel && <span style={{color:'#fff',fontSize:9,fontWeight:900,lineHeight:1}}>✓</span>}
                        </span>
                        <span style={{fontWeight:sel?600:400,color:sel?'var(--navy)':'var(--ink1)'}}>{p.nome}</span>
                      </label>
                    )
                  })}
                </div>
              </div>

              {/* Objetivo */}
              <div style={{display:'flex',flexDirection:'column',gap:4}}>
                <label style={{fontSize:'.58rem',textTransform:'uppercase',letterSpacing:'.1em',color:'var(--ink3)',fontWeight:700}}>Objetivo do mês</label>
                <input type="text" value={briefing.objetivo} placeholder="ex: aumentar vendas do AFN32+, conquistar 50 leads..."
                  onChange={e=>setBriefing(b=>({...b,objetivo:e.target.value}))}
                  style={{padding:'8px 10px',border:'1px solid var(--rule)',borderRadius:4,fontSize:'.78rem',background:'var(--bg)',outline:'none'}}/>
              </div>

              {/* Contexto */}
              <div style={{display:'flex',flexDirection:'column',gap:4}}>
                <label style={{fontSize:'.58rem',textTransform:'uppercase',letterSpacing:'.1em',color:'var(--ink3)',fontWeight:700}}>Contexto / Sazonalidade</label>
                <textarea value={briefing.contexto} rows={2} placeholder="ex: Dia das Mães, verão, lançamento novo produto, promoção especial..."
                  onChange={e=>setBriefing(b=>({...b,contexto:e.target.value}))}
                  style={{padding:'8px 10px',border:'1px solid var(--rule)',borderRadius:4,fontSize:'.78rem',background:'var(--bg)',outline:'none',resize:'vertical'}}/>
              </div>
            </div>
          </div>

          {/* Seleção de Creators */}
          <div style={{background:'var(--card)',border:'1px solid var(--rule)',borderRadius:8,overflow:'hidden',marginBottom:16}}>
            <div style={{padding:'12px 18px',borderBottom:'1px solid var(--rule)',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
              <div style={{fontSize:'.62rem',textTransform:'uppercase',letterSpacing:'.12em',color:'var(--navy)',fontWeight:700}}>
                Creators ({creatorsAlvo.length} selecionada{creatorsAlvo.length!==1?'s':''})
              </div>
              <label style={{display:'flex',alignItems:'center',gap:6,cursor:'pointer',fontSize:'.72rem',color:'var(--teal-d)',fontWeight:600}}>
                <input type="checkbox" checked={todasCreators} onChange={toggleTodas} style={{accentColor:'var(--teal-d)',width:13,height:13}}/>
                Todas
              </label>
            </div>
            <div style={{padding:'10px 14px',maxHeight:200,overflowY:'auto',display:'flex',flexDirection:'column',gap:4}}>
              {creators.map(c=>{
                const sel = todasCreators || creatorsSelected.includes(c.id)
                return (
                  <label key={c.id} style={{display:'flex',alignItems:'center',gap:8,padding:'7px 10px',borderRadius:4,background:sel?'var(--teal-lt)':'transparent',cursor:'pointer',transition:'background .1s'}}>
                    <input type="checkbox" checked={sel} onChange={()=>{ if(!todasCreators) toggleCreator(c.id) }}
                      style={{accentColor:'var(--teal-d)',width:13,height:13,flexShrink:0}}/>
                    <div>
                      <div style={{fontSize:'.78rem',fontWeight:sel?700:400,color:sel?'var(--navy)':'var(--ink2)'}}>{c.nome}</div>
                      <div style={{fontSize:'.62rem',color:'var(--ink3)'}}>@{c.instagram} · {c.nicho}</div>
                    </div>
                  </label>
                )
              })}
              {creators.length===0 && <div style={{fontSize:'.75rem',color:'var(--ink3)',padding:'8px 4px'}}>Nenhuma creator cadastrada.</div>}
            </div>
          </div>

          {/* Botão Gerar */}
          <button onClick={gerarEstrategia} disabled={gerando}
            style={{width:'100%',padding:'13px',background:gerando?'var(--ink3)':'var(--teal-d)',color:'#fff',border:'none',borderRadius:6,fontSize:'.84rem',fontWeight:700,cursor:gerando?'not-allowed':'pointer',transition:'background .2s'}}>
            {gerando ? '⏳ Gerando estratégia...' : '✨ Gerar estratégia com IA →'}
          </button>
        </div>

        {/* ── COLUNA DIREITA: PREVIEW ───────────────────────────── */}
        <div>
          {!preview && !gerando && (
            <div style={{background:'var(--card)',border:'1px solid var(--rule)',borderRadius:8,padding:40,textAlign:'center',color:'var(--ink3)'}}>
              <div style={{fontSize:'2.5rem',opacity:.2,marginBottom:12}}>📅</div>
              <div style={{fontSize:'.82rem',fontWeight:600,color:'var(--ink2)',marginBottom:6}}>Estratégia não gerada ainda</div>
              <div style={{fontSize:'.74rem',lineHeight:1.6}}>Preencha o briefing à esquerda,<br/>selecione as creators e clique em Gerar.</div>
            </div>
          )}

          {gerando && (
            <div style={{background:'var(--card)',border:'1px solid var(--rule)',borderRadius:8,padding:40,textAlign:'center'}}>
              <div style={{fontSize:'2rem',marginBottom:12,animation:'pulse 1.5s infinite'}}>🤖</div>
              <div style={{fontSize:'.84rem',fontWeight:600,color:'var(--navy)',marginBottom:6}}>Gerando estratégia...</div>
              <div style={{fontSize:'.74rem',color:'var(--ink3)',lineHeight:1.6}}>A IA está criando o plano das 4 semanas<br/>com roteiros de Reels e Stories.</div>
            </div>
          )}

          {preview && (
            <div>
              {/* Header do preview */}
              <div style={{background:'var(--navy)',borderRadius:'8px 8px 0 0',padding:'16px 20px',display:'flex',alignItems:'flex-start',justifyContent:'space-between'}}>
                <div>
                  <div style={{fontFamily:'var(--serif)',fontSize:'1.1rem',fontWeight:700,color:'#fff',marginBottom:4}}>{preview.titulo}</div>
                  <div style={{fontSize:'.72rem',color:'rgba(255,255,255,.55)',lineHeight:1.5}}>{preview.resumo}</div>
                  <div style={{marginTop:8,fontSize:'.62rem',color:'var(--teal)',fontWeight:600}}>
                    {creatorsAlvo.length} creator{creatorsAlvo.length!==1?'s':''} · {preview.semanas?.reduce((a,s)=>a+(s.conteudos?.length||0),0)} roteiros
                  </div>
                </div>
              </div>

              {/* Semanas */}
              <div style={{background:'var(--card)',border:'1px solid var(--rule)',borderRadius:'0 0 8px 8px',overflow:'hidden',marginBottom:16}}>
                {preview.semanas?.map((semana, si) => (
                  <div key={si} style={{borderBottom:'1px solid var(--rule)'}}>
                    {/* Header da semana */}
                    <div onClick={()=>setSemanaAberta(semanaAberta===si?-1:si)}
                      style={{padding:'12px 18px',display:'flex',alignItems:'center',gap:12,cursor:'pointer',background:semanaAberta===si?'var(--navy-xs)':'transparent',transition:'background .15s'}}>
                      <span style={{fontSize:'.6rem',fontWeight:700,padding:'3px 9px',borderRadius:3,background:focoBg[semana.foco],color:focoColor[semana.foco],whiteSpace:'nowrap'}}>
                        {focoLabel[semana.foco]||`Semana ${semana.numero}`}
                      </span>
                      <div style={{flex:1}}>
                        <div style={{fontSize:'.82rem',fontWeight:600,color:'var(--ink)'}}>Semana {semana.numero} — {semana.tema}</div>
                        <div style={{fontSize:'.62rem',color:'var(--ink3)',marginTop:2}}>{semana.conteudos?.length||0} conteúdos</div>
                      </div>
                      <span style={{color:'var(--ink3)',fontSize:'.8rem'}}>{semanaAberta===si?'▲':'▼'}</span>
                    </div>

                    {/* Conteúdos da semana */}
                    {semanaAberta===si && semana.conteudos?.map((c, ci) => (
                      <div key={ci} style={{margin:'0 16px 14px',background:'var(--bg)',border:'1px solid var(--rule)',borderRadius:6,overflow:'hidden'}}>
                        {/* Header do conteúdo */}
                        <div style={{padding:'8px 14px',background:c.formato==='reel'?'var(--navy)':'var(--teal-lt)',display:'flex',alignItems:'center',gap:8}}>
                          <span style={{fontSize:'.78rem'}}>{c.formato==='reel'?'🎬':'📱'}</span>
                          <span style={{fontSize:'.68rem',fontWeight:700,color:c.formato==='reel'?'#fff':'var(--teal-d)',textTransform:'uppercase',letterSpacing:'.08em'}}>{c.formato==='reel'?'Reel':'Stories'}</span>
                          <span style={{fontSize:'.78rem',fontWeight:600,color:c.formato==='reel'?'rgba(255,255,255,.85)':'var(--ink)',marginLeft:4}}>{c.tema}</span>
                        </div>
                        {/* Campos do roteiro */}
                        <div style={{padding:'10px 14px',display:'grid',gap:5}}>
                          {[
                            ['Gancho 01', c.gancho_01, '#f0eeff', 'var(--navy)'],
                            ['Premissa 01', c.premissa_01, '#edfbff', '#1a6e8a'],
                            c.premissa_02 && ['Premissa 02', c.premissa_02, '#edfbff', '#1a6e8a'],
                            c.gancho_02 && ['Gancho 02', c.gancho_02, '#f0eeff', 'var(--navy)'],
                            ['CTA', c.cta, 'var(--green-lt)', 'var(--green)'],
                          ].filter(Boolean).map(([label,val,bg,color])=>val&&(
                            <div key={label} style={{display:'grid',gridTemplateColumns:'90px 1fr',border:'1px solid var(--rule)',borderRadius:3,overflow:'hidden'}}>
                              <div style={{padding:'6px 10px',background:bg,borderRight:'1px solid var(--rule)',fontSize:'.55rem',textTransform:'uppercase',letterSpacing:'.1em',fontWeight:700,color,display:'flex',alignItems:'center'}}>{label}</div>
                              <div style={{padding:'6px 12px',fontSize:'.76rem',color:'var(--ink)',lineHeight:1.5}}>{val}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>

              {/* Ações */}
              {salvoOk ? (
                <div style={{background:'var(--green-lt)',border:'1px solid var(--green)',borderRadius:6,padding:'14px 18px',textAlign:'center',fontSize:'.82rem',fontWeight:700,color:'var(--green)'}}>
                  ✓ Estratégia salva! {creatorsAlvo.length * (preview.semanas?.reduce((a,s)=>a+(s.conteudos?.length||0),0)||0)} roteiros criados nas abas de cada creator.
                </div>
              ) : (
                <div style={{display:'flex',gap:10,justifyContent:'flex-end'}}>
                  <button onClick={gerarEstrategia} disabled={gerando}
                    style={{padding:'9px 16px',border:'1px solid var(--rule)',borderRadius:4,background:'transparent',fontSize:'.78rem',color:'var(--ink3)',cursor:'pointer'}}>
                    🔄 Regerar
                  </button>
                  <button onClick={salvarEstrategia} disabled={salvando}
                    style={{padding:'10px 24px',background:'var(--navy)',color:'#fff',border:'none',borderRadius:4,fontSize:'.82rem',fontWeight:700,cursor:salvando?'not-allowed':'pointer'}}>
                    {salvando?'Salvando...':'✓ Salvar e criar roteiros →'}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Histórico de estratégias */}
          {estrategias.length>0 && (
            <div style={{marginTop:24}}>
              <div style={{fontSize:'.6rem',textTransform:'uppercase',letterSpacing:'.2em',color:'var(--ink3)',fontWeight:700,marginBottom:10}}>Estratégias anteriores</div>
              <div style={{display:'flex',flexDirection:'column',gap:6}}>
                {estrategias.map(e=>(
                  <div key={e.id} style={{background:'var(--card)',border:'1px solid var(--rule)',borderRadius:6,padding:'10px 14px',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                    <div>
                      <div style={{fontSize:'.8rem',fontWeight:600,color:'var(--ink)'}}>{e.mes_referencia}</div>
                      <div style={{fontSize:'.66rem',color:'var(--ink3)',marginTop:2}}>{e.objetivo}</div>
                    </div>
                    <div style={{fontSize:'.62rem',color:'var(--ink3)'}}>{new Date(e.created_at).toLocaleDateString('pt-BR')}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
