'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

const fmt = n => (n||0).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2})

export default function Campanhas() {
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
        { type:'text', text:`Analise estes prints do Instagram Insights. Extraia TODOS os dados numéricos visíveis. Depois forneça uma análise de performance. Responda em português.

## Dados Extraídos
(liste cada métrica com valor exato)

## Diagnóstico de Performance
## Pontos Fortes  
## O que Melhorar
## Recomendações` },
        ...imagens.map(img=>({type:'image',source:{type:'base64',media_type:img.type,data:img.data}}))
      ]
      const resp = await fetch('/api/ai',{
        method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({messages:[{role:'user',content}]})
      })
      const data = await resp.json()
      const texto = data.content?.find(b=>b.type==='text')?.text||''
      setForm(f=>({...f, analise_ia:texto, fonte:'prints_ia'}))
    } catch(e) { alert('Erro ao analisar prints.') }
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

              {/* IDENTIFICAÇÃO */}
              <div style={{fontSize:'.62rem',textTransform:'uppercase',letterSpacing:'.12em',color:'var(--navy)',fontWeight:700,marginBottom:12,display:'flex',alignItems:'center',gap:8}}>
                <span style={{width:3,height:12,background:'var(--teal)',borderRadius:2,display:'inline-block'}}/>Identificação
              </div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:20}}>
                {fld('Creator','creator_id','text',false,[{v:'',l:'Selecionar creator...'},...creators.map(c=>({v:c.id,l:c.nome}))])}
                {fld('Fonte','fonte','text',false,[{v:'manual',l:'Manual'},{v:'prints_ia',l:'Prints IA'},{v:'partnership_ads',l:'Partnership Ads'}])}
                {fld('Início da campanha','data_inicio','date')}
                {fld('Fim da campanha','data_fim','date')}
              </div>

              {/* PRODUTOS */}
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
                        <input type="checkbox" checked={sel}
                          onChange={()=>setProdutosSelecionados(s=>s.includes(p.id)?s.filter(x=>x!==p.id):[...s,p.id])}
                          style={{accentColor:'var(--teal-d)',width:13,height:13}}/>
                        {p.nome}
                      </label>
                    )
                  })}
                </div>
              </div>

              {/* UPLOAD PRINTS */}
              <div style={{background:'var(--teal-lt)',border:'1px solid var(--rule)',borderRadius:4,padding:'14px 16px',marginBottom:20}}>
                <div style={{fontSize:'.65rem',fontWeight:700,color:'var(--teal-d)',textTransform:'uppercase',letterSpacing:'.1em',marginBottom:8}}>Upload de Prints (opcional)</div>
                <input type="file" accept="image/*" multiple onChange={e=>setUploads(Array.from(e.target.files))}
                  style={{fontSize:'.76rem',color:'var(--ink2)',marginBottom:8,display:'block'}}/>
                {uploads.length>0 && <div style={{fontSize:'.72rem',color:'var(--teal-d)',fontWeight:600}}>{uploads.length} arquivo(s) selecionado(s)</div>}
                <button onClick={extrairPrints} disabled={analisando||!uploads.length}
                  style={{marginTop:10,background:analisando||!uploads.length?'var(--ink3)':'var(--teal-d)',color:'#fff',border:'none',borderRadius:4,padding:'7px 14px',fontSize:'.72rem',fontWeight:700}}>
                  {analisando?'⏳ Analisando...':'🤖 Extrair dados com IA →'}
                </button>
              </div>

              {/* FUNIL */}
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

              {/* CONTEÚDO */}
              <div style={{fontSize:'.62rem',textTransform:'uppercase',letterSpacing:'.12em',color:'var(--navy)',fontWeight:700,marginBottom:12,display:'flex',alignItems:'center',gap:8}}>
                <span style={{width:3,height:12,background:'var(--teal)',borderRadius:2,display:'inline-block'}}/>Conteúdo Produzido
              </div>
              <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12,marginBottom:20}}>
                {fld('Reels','reels','number')}
                {fld('Stories CTA','stories_cta','number')}
                {fld('Stories Ind.','stories_ind','number')}
                {fld('Lifestyle','lifestyle','number')}
              </div>

              {/* QUALITATIVO */}
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
