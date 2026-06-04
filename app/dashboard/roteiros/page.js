'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

const tipoColors = { educativo:'var(--teal-d)', indireto:'var(--amber)', cta:'var(--green)', lifestyle:'var(--navy)' }
const tipoBg = { educativo:'var(--teal-lt)', indireto:'var(--amber-lt)', cta:'var(--green-lt)', lifestyle:'var(--navy-xs)' }
const statusColors = { planejado:'var(--ink3)', em_producao:'var(--amber)', publicado:'var(--green)', cancelado:'var(--red)' }

export default function Roteiros() {
  const [roteiros, setRoteiros] = useState([])
  const [creators, setCreators] = useState([])
  const [modal, setModal] = useState(false)
  const [gerando, setGerando] = useState(false)
  const [filtroCreator, setFiltroCreator] = useState('')
  const [form, setForm] = useState({ creator_id:'', data_post:'', tipo:'educativo', formato:'reels', tema:'', desenvolvimento:'', gancho_01:'', premissa_01:'', premissa_02:'', premissa_03:'', gancho_02:'', cta:'', status:'planejado' })

  useEffect(() => { carregar() }, [filtroCreator])

  async function carregar() {
    let q = supabase.from('roteiros').select('*,creators(nome)').order('data_post',{ascending:true})
    if (filtroCreator) q = q.eq('creator_id', filtroCreator)
    const { data } = await q.limit(100)
    setRoteiros(data||[])
    supabase.from('creators').select('id,nome').eq('status','ativa').order('nome').then(({data:cs})=>setCreators(cs||[]))
  }

  async function gerarComIA() {
    if (!form.tema || !form.creator_id) { alert('Preencha o tema e selecione a creator.'); return }
    setGerando(true)
    const creator = creators.find(c=>c.id===form.creator_id)
    try {
      const res = await fetch('/api/ai',{
        method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({messages:[{role:'user',content:`Você é especialista em Marketing de Premissas para A Farmácia Natural (AFN), suplementos femininos. Crie um roteiro condensado para a creator ${creator?.nome||''}.

Tema: "${form.tema}"
Tipo: ${form.tipo} | Formato: ${form.formato}

Retorne APENAS um JSON válido sem markdown:
{
  "desenvolvimento": "descrição do objetivo do conteúdo em 2 linhas",
  "gancho_01": "frase de abertura impactante",
  "premissa_01": "primeira premissa lógica",
  "premissa_02": "segunda premissa lógica",
  "premissa_03": "terceira premissa (se aplicável, senão vazio)",
  "gancho_02": "gancho de fechamento antes do CTA",
  "cta": "chamada para ação (se for conteúdo de venda, senão vazio)"
}`}]})
      })
      const d = await res.json()
      if (!res.ok || d.error) throw new Error(d.error || 'Erro na API')
      const texto = d.content?.find(b=>b.type==='text')?.text||''
      if (!texto) throw new Error('Resposta vazia da IA')
      const jsonMatch = texto.match(/\{[\s\S]*\}/)
      if (!jsonMatch) throw new Error('JSON não encontrado')
      const parsed = JSON.parse(jsonMatch[0])
      setForm(f=>({...f,...parsed, gerado_por_ia:true}))
    } catch(e) { alert('Erro ao gerar roteiro.') }
    setGerando(false)
  }

  async function salvar() {
    if (!form.creator_id || !form.tema) { alert('Creator e tema são obrigatórios.'); return }
    await supabase.from('roteiros').insert(form)
    setModal(false)
    setForm({ creator_id:'', data_post:'', tipo:'educativo', formato:'reels', tema:'', desenvolvimento:'', gancho_01:'', premissa_01:'', premissa_02:'', premissa_03:'', gancho_02:'', cta:'', status:'planejado' })
    carregar()
  }

  async function atualizarStatus(id, status) {
    await supabase.from('roteiros').update({ status }).eq('id',id)
    carregar()
  }

  const fld = (label,id,type='text',full=false,opts=null) => (
    <div style={{display:'flex',flexDirection:'column',gap:4,gridColumn:full?'1/-1':''}}>
      <label style={{fontSize:'.58rem',textTransform:'uppercase',letterSpacing:'.1em',color:'var(--ink3)',fontWeight:700}}>{label}</label>
      {opts?(
        <select value={form[id]} onChange={e=>setForm({...form,[id]:e.target.value})} style={{padding:'8px 10px',border:'1px solid var(--rule)',borderRadius:4,fontSize:'.78rem',background:'var(--bg)',outline:'none'}}>
          {opts.map(o=><option key={o.v} value={o.v}>{o.l}</option>)}
        </select>
      ):type==='textarea'?(
        <textarea value={form[id]} onChange={e=>setForm({...form,[id]:e.target.value})} rows={3} style={{padding:'8px 10px',border:'1px solid var(--rule)',borderRadius:4,fontSize:'.78rem',background:'var(--bg)',outline:'none',resize:'vertical'}}/>
      ):(
        <input type={type} value={form[id]} onChange={e=>setForm({...form,[id]:e.target.value})} style={{padding:'8px 10px',border:'1px solid var(--rule)',borderRadius:4,fontSize:'.78rem',background:'var(--bg)',outline:'none'}}/>
      )}
    </div>
  )

  return (
    <div>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
        <select value={filtroCreator} onChange={e=>setFiltroCreator(e.target.value)} style={{padding:'8px 12px',border:'1px solid var(--rule)',borderRadius:4,fontSize:'.78rem',background:'var(--card)',outline:'none'}}>
          <option value="">Todas as creators</option>
          {creators.map(c=><option key={c.id} value={c.id}>{c.nome}</option>)}
        </select>
        <button onClick={()=>setModal(true)} style={{background:'var(--navy)',color:'#fff',border:'none',borderRadius:4,padding:'8px 16px',fontSize:'.75rem',fontWeight:600}}>
          + Novo roteiro
        </button>
      </div>

      <div style={{display:'grid',gap:10}}>
        {roteiros.length===0 ? (
          <div style={{textAlign:'center',padding:48,color:'var(--ink3)',background:'var(--card)',border:'1px solid var(--rule)',borderRadius:6}}>
            <div style={{fontSize:'2rem',opacity:.25,marginBottom:10}}>📝</div>
            <p style={{fontSize:'.78rem'}}>Nenhum roteiro cadastrado.</p>
          </div>
        ) : roteiros.map(r=>(
          <div key={r.id} style={{background:'var(--card)',border:'1px solid var(--rule)',borderRadius:6,overflow:'hidden'}}>
            <div style={{display:'flex',alignItems:'center',gap:10,padding:'12px 16px',borderBottom:'1px solid var(--rule)',background:'var(--bg)'}}>
              <span style={{fontSize:'.62rem',fontWeight:700,padding:'3px 8px',borderRadius:3,background:tipoBg[r.tipo],color:tipoColors[r.tipo]}}>{r.tipo}</span>
              <span style={{fontSize:'.62rem',padding:'3px 8px',borderRadius:3,background:'var(--navy-xs)',color:'var(--navy)',fontWeight:700}}>{r.formato}</span>
              <span style={{fontSize:'.78rem',fontWeight:600,color:'var(--ink)'}}>{r.creators?.nome}</span>
              {r.data_post && <span style={{fontSize:'.7rem',color:'var(--ink3)'}}>{new Date(r.data_post+'T00:00:00').toLocaleDateString('pt-BR')}</span>}
              <div style={{marginLeft:'auto',display:'flex',gap:8,alignItems:'center'}}>
                <span style={{fontSize:'.62rem',fontWeight:700,color:statusColors[r.status]}}>{r.status?.replace('_',' ')}</span>
                {r.status!=='publicado' && (
                  <button onClick={()=>atualizarStatus(r.id,'publicado')} style={{fontSize:'.68rem',color:'var(--green)',background:'none',border:'none',fontWeight:600,textDecoration:'underline'}}>
                    Marcar publicado
                  </button>
                )}
              </div>
            </div>
            <div style={{padding:'14px 16px'}}>
              <div style={{fontSize:'.88rem',fontWeight:700,color:'var(--navy)',marginBottom:10}}>{r.tema}</div>
              {r.desenvolvimento && <p style={{fontSize:'.76rem',color:'var(--ink2)',marginBottom:10,lineHeight:1.55,fontStyle:'italic'}}>{r.desenvolvimento}</p>}
              <div style={{display:'grid',gap:5}}>
                {[['Gancho 01',r.gancho_01,'#f0eeff','var(--navy)'],['Premissa 01',r.premissa_01,'#edfbff','#1a6e8a'],['Premissa 02',r.premissa_02,'#edfbff','#1a6e8a'],['Premissa 03',r.premissa_03,'#edfbff','#1a6e8a'],['Gancho 02',r.gancho_02,'#f0eeff','var(--navy)'],['CTA',r.cta,'var(--green-lt)','var(--green)']].filter(([,v])=>v).map(([label,val,bg,color])=>(
                  <div key={label} style={{display:'grid',gridTemplateColumns:'90px 1fr',border:'1px solid var(--rule)',borderRadius:3,overflow:'hidden'}}>
                    <div style={{padding:'7px 10px',background:bg,borderRight:'1px solid var(--rule)',fontSize:'.58rem',textTransform:'uppercase',letterSpacing:'.1em',fontWeight:700,color,display:'flex',alignItems:'center'}}>{label}</div>
                    <div style={{padding:'7px 12px',fontSize:'.78rem',color:'var(--ink)',lineHeight:1.5}}>{val}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      {modal && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.55)',display:'flex',alignItems:'flex-start',justifyContent:'center',zIndex:100,paddingTop:40,overflowY:'auto'}}>
          <div style={{background:'var(--card)',width:640,borderRadius:8,border:'1px solid var(--rule)',marginBottom:40}}>
            <div style={{background:'var(--navy)',padding:'18px 24px',display:'flex',alignItems:'center',justifyContent:'space-between',borderRadius:'8px 8px 0 0'}}>
              <div style={{fontFamily:'var(--serif)',fontSize:'1.1rem',fontWeight:700,color:'#fff'}}>Novo Roteiro</div>
              <button onClick={()=>setModal(false)} style={{color:'rgba(255,255,255,.5)',background:'none',border:'none',fontSize:'1.2rem'}}>✕</button>
            </div>
            <div style={{padding:24,display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
              {fld('Creator','creator_id','text',false,[{v:'',l:'Selecionar...'},...creators.map(c=>({v:c.id,l:c.nome}))])}
              {fld('Data do post','data_post','date')}
              {fld('Tipo','tipo','text',false,[{v:'educativo',l:'Educativo'},{v:'indireto',l:'Indireto'},{v:'cta',l:'Publicidade + CTA'},{v:'lifestyle',l:'Lifestyle/Treino'}])}
              {fld('Formato','formato','text',false,[{v:'reels',l:'Reels'},{v:'stories',l:'Stories'},{v:'feed',l:'Feed'},{v:'live',l:'Live'}])}
              {fld('Tema / título','tema','text',true)}
              <div style={{gridColumn:'1/-1'}}>
                <button onClick={gerarComIA} disabled={gerando||!form.tema||!form.creator_id}
                  style={{background:gerando||!form.tema||!form.creator_id?'var(--ink3)':'var(--teal-d)',color:'#fff',border:'none',borderRadius:4,padding:'8px 16px',fontSize:'.75rem',fontWeight:700,width:'100%',marginBottom:12}}>
                  {gerando?'⏳ Gerando roteiro...':'🤖 Gerar roteiro com IA →'}
                </button>
              </div>
              {fld('Desenvolvimento','desenvolvimento','textarea',true)}
              {fld('Gancho 01','gancho_01','textarea')}
              {fld('Premissa 01','premissa_01','textarea')}
              {fld('Premissa 02','premissa_02','textarea')}
              {fld('Premissa 03','premissa_03','textarea')}
              {fld('Gancho 02','gancho_02','textarea')}
              {fld('CTA','cta','textarea')}
            </div>
            <div style={{padding:'0 24px 24px',display:'flex',gap:10,justifyContent:'flex-end'}}>
              <button onClick={()=>setModal(false)} style={{padding:'9px 16px',border:'1px solid var(--rule)',borderRadius:4,background:'transparent',fontSize:'.78rem',color:'var(--ink3)'}}>Cancelar</button>
              <button onClick={salvar} style={{padding:'9px 20px',background:'var(--navy)',color:'#fff',border:'none',borderRadius:4,fontSize:'.78rem',fontWeight:700}}>Salvar →</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
