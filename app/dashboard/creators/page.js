'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

const statusColors = { ativa:'var(--green)', pausa:'var(--amber)', inativa:'var(--red)', recrutamento:'var(--teal-d)' }
const statusBg = { ativa:'var(--green-lt)', pausa:'var(--amber-lt)', inativa:'var(--red-lt)', recrutamento:'var(--teal-lt)' }

export default function Creators() {
  const [creators, setCreators] = useState([])
  const [produtos, setProdutos] = useState([])
  const [modal, setModal] = useState(false)
  const [editando, setEditando] = useState(null)
  const [form, setForm] = useState({ nome:'', instagram:'', nicho:'', seguidores:'', cidade:'', produto_id:'', comissao_pct:15, status:'ativa', data_inicio:'', obs_internas:'' })
  const [busca, setBusca] = useState('')
  const [salvando, setSalvando] = useState(false)

  useEffect(() => { carregar() }, [])

  async function carregar() {
    const [{ data: cs }, { data: ps }] = await Promise.all([
      supabase.from('creators').select('*,produtos(nome)').order('nome'),
      supabase.from('produtos').select('id,nome').eq('ativo',true),
    ])
    setCreators(cs||[])
    setProdutos(ps||[])
  }

  function abrir(c=null) {
    setEditando(c)
    setForm(c ? { nome:c.nome||'', instagram:c.instagram||'', nicho:c.nicho||'', seguidores:c.seguidores||'', cidade:c.cidade||'', produto_id:c.produto_id||'', comissao_pct:c.comissao_pct||15, status:c.status||'ativa', data_inicio:c.data_inicio||'', obs_internas:c.obs_internas||'' }
              : { nome:'', instagram:'', nicho:'', seguidores:'', cidade:'', produto_id:'', comissao_pct:15, status:'ativa', data_inicio:'', obs_internas:'' })
    setModal(true)
  }

  async function salvar() {
    if (!form.nome) return
    setSalvando(true)
    const payload = { ...form, seguidores: parseInt(form.seguidores)||0, comissao_pct: parseFloat(form.comissao_pct)||15 }
    if (editando) await supabase.from('creators').update(payload).eq('id', editando.id)
    else await supabase.from('creators').insert(payload)
    setSalvando(false); setModal(false); carregar()
  }

  async function excluir(id) {
    if (!confirm('Excluir essa creator? Os dados de campanhas serão mantidos.')) return
    await supabase.from('creators').delete().eq('id', id)
    carregar()
  }

  const filtradas = creators.filter(c => c.nome.toLowerCase().includes(busca.toLowerCase()) || (c.instagram||'').toLowerCase().includes(busca.toLowerCase()))

  const fld = (label, id, type='text', opts=null) => (
    <div style={{display:'flex',flexDirection:'column',gap:5}}>
      <label style={{fontSize:'.6rem',textTransform:'uppercase',letterSpacing:'.1em',color:'var(--ink3)',fontWeight:700}}>{label}</label>
      {opts ? (
        <select value={form[id]} onChange={e=>setForm({...form,[id]:e.target.value})}
          style={{padding:'9px 11px',border:'1px solid var(--rule)',borderRadius:4,fontSize:'.8rem',background:'var(--bg)',outline:'none'}}>
          {opts.map(o=><option key={o.v} value={o.v}>{o.l}</option>)}
        </select>
      ) : (
        <input type={type} value={form[id]} onChange={e=>setForm({...form,[id]:e.target.value})}
          style={{padding:'9px 11px',border:'1px solid var(--rule)',borderRadius:4,fontSize:'.8rem',background:'var(--bg)',outline:'none'}}/>
      )}
    </div>
  )

  return (
    <div>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:20}}>
        <div style={{fontSize:'.6rem',textTransform:'uppercase',letterSpacing:'.2em',color:'var(--teal)',fontWeight:700}}>
          {filtradas.length} creator{filtradas.length!==1?'s':''} cadastrada{filtradas.length!==1?'s':''}
        </div>
        <div style={{display:'flex',gap:10}}>
          <input value={busca} onChange={e=>setBusca(e.target.value)} placeholder="Buscar por nome ou @..."
            style={{padding:'8px 12px',border:'1px solid var(--rule)',borderRadius:4,fontSize:'.78rem',background:'var(--card)',outline:'none',width:220}}/>
          <button onClick={()=>abrir()} style={{background:'var(--navy)',color:'#fff',border:'none',borderRadius:4,padding:'8px 16px',fontSize:'.75rem',fontWeight:600}}>
            + Nova creator
          </button>
        </div>
      </div>

      <div style={{background:'var(--card)',border:'1px solid var(--rule)',borderRadius:6,overflow:'hidden'}}>
        {filtradas.length===0 ? (
          <div style={{textAlign:'center',padding:48,color:'var(--ink3)'}}>
            <div style={{fontSize:'2rem',opacity:.25,marginBottom:10}}>👤</div>
            <p style={{fontSize:'.78rem'}}>Nenhuma creator encontrada. Clique em "+ Nova creator" para cadastrar.</p>
          </div>
        ) : (
          <table style={{width:'100%',borderCollapse:'collapse'}}>
            <thead><tr style={{borderBottom:'2px solid var(--navy)'}}>
              {['Nome','Instagram','Nicho','Seguidores','Produto','Comissão','Status','Ações'].map(h=>(
                <th key={h} style={{fontSize:'.58rem',textTransform:'uppercase',letterSpacing:'.1em',color:'var(--ink3)',fontWeight:700,padding:'11px 14px',textAlign:'left',background:'var(--bg)'}}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {filtradas.map(c=>(
                <tr key={c.id} style={{borderBottom:'1px solid var(--rule)'}}>
                  <td style={{padding:'11px 14px',fontWeight:600,color:'var(--ink)'}}>{c.nome}</td>
                  <td style={{padding:'11px 14px',fontSize:'.76rem',color:'var(--teal-d)'}}>@{c.instagram||'—'}</td>
                  <td style={{padding:'11px 14px',fontSize:'.76rem',color:'var(--ink2)'}}>{c.nicho||'—'}</td>
                  <td style={{padding:'11px 14px',fontSize:'.76rem',color:'var(--ink2)'}}>{(c.seguidores||0).toLocaleString('pt-BR')}</td>
                  <td style={{padding:'11px 14px',fontSize:'.76rem',color:'var(--ink2)'}}>{c.produtos?.nome||'—'}</td>
                  <td style={{padding:'11px 14px',fontSize:'.76rem',color:'var(--ink2)',fontWeight:600}}>{c.comissao_pct||15}%</td>
                  <td style={{padding:'11px 14px'}}>
                    <span style={{fontSize:'.6rem',fontWeight:700,padding:'3px 8px',borderRadius:3,background:statusBg[c.status],color:statusColors[c.status]}}>
                      {c.status}
                    </span>
                  </td>
                  <td style={{padding:'11px 14px',display:'flex',gap:8}}>
                    <a href={"/dashboard/creators/"+c.id} style={{fontSize:'.7rem',color:'var(--teal-d)',background:'none',border:'none',fontWeight:600,textDecoration:'underline',textUnderlineOffset:2,cursor:'pointer'}}>Ver perfil</a>
                    <button onClick={()=>abrir(c)} style={{fontSize:'.7rem',color:'var(--navy)',background:'none',border:'none',fontWeight:600,textDecoration:'underline',textUnderlineOffset:2}}>Editar</button>
                    <button onClick={()=>excluir(c.id)} style={{fontSize:'.7rem',color:'var(--red)',background:'none',border:'none',fontWeight:600,textDecoration:'underline',textUnderlineOffset:2}}>Excluir</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {modal && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.5)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:100}}>
          <div style={{background:'var(--card)',width:600,maxHeight:'90vh',overflowY:'auto',borderRadius:8,border:'1px solid var(--rule)'}}>
            <div style={{background:'var(--navy)',padding:'20px 24px',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
              <div style={{fontFamily:'var(--serif)',fontSize:'1.1rem',fontWeight:700,color:'#fff'}}>{editando?'Editar Creator':'Nova Creator'}</div>
              <button onClick={()=>setModal(false)} style={{color:'rgba(255,255,255,.5)',background:'none',border:'none',fontSize:'1.2rem'}}>✕</button>
            </div>
            <div style={{padding:'24px',display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
              {fld('Nome completo','nome')}
              {fld('@ Instagram','instagram')}
              {fld('Nicho / categoria','nicho')}
              {fld('Seguidores','seguidores','number')}
              {fld('Cidade','cidade')}
              {fld('Data de início','data_inicio','date')}
              {fld('Produto',  'produto_id', 'select', [{v:'',l:'Selecionar...'},...produtos.map(p=>({v:p.id,l:p.nome}))])}
              {fld('Comissão (%)','comissao_pct','number')}
              {fld('Status','status','select',[{v:'ativa',l:'Ativa'},{v:'pausa',l:'Em pausa'},{v:'inativa',l:'Inativa'},{v:'recrutamento',l:'Em recrutamento'}])}
              <div style={{gridColumn:'1/-1',display:'flex',flexDirection:'column',gap:5}}>
                <label style={{fontSize:'.6rem',textTransform:'uppercase',letterSpacing:'.1em',color:'var(--ink3)',fontWeight:700}}>Obs. internas (só equipe AFN vê)</label>
                <textarea value={form.obs_internas} onChange={e=>setForm({...form,obs_internas:e.target.value})} rows={3}
                  style={{padding:'9px 11px',border:'1px solid var(--rule)',borderRadius:4,fontSize:'.8rem',background:'var(--bg)',outline:'none',resize:'vertical'}}/>
              </div>
            </div>
            <div style={{padding:'0 24px 24px',display:'flex',gap:10,justifyContent:'flex-end'}}>
              <button onClick={()=>setModal(false)} style={{padding:'9px 16px',border:'1px solid var(--rule)',borderRadius:4,background:'transparent',fontSize:'.78rem',color:'var(--ink3)'}}>Cancelar</button>
              <button onClick={salvar} disabled={salvando} style={{padding:'9px 20px',background:'var(--navy)',color:'#fff',border:'none',borderRadius:4,fontSize:'.78rem',fontWeight:700}}>
                {salvando?'Salvando...':'Salvar creator →'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
