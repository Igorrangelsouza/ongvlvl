'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import api from '@/lib/api'
import { logout } from '@/lib/auth'

type Animal = { id: number
  nome: string
  sexo: string
  porte: string
  status: string  // <-- adicionar essa linha
  raca?: string
  foto?: string
  foto_url?: string }

type Registro = {
    id: number; animal: number; animal_nome: string; tipo: string; tipo_display: string
    nome_produto: string; data_aplicacao: string; proxima_dose?: string
    observacoes: string; status_dose: string
}
type Alerta = {
    animal_id: number; animal_nome: string; animal_foto_url?: string
    tipo: string; tipo_display: string; proxima_dose: string
    status: string; dias_restantes: number
}

const TIPO_COLORS: Record<string, { bg: string; color: string }> = {
    ANTIRABICA: { bg: 'rgba(64,191,193,0.1)', color: '#40BFC1' },
    V10: { bg: 'rgba(64,191,193,0.1)', color: '#40BFC1' },
    OUTRA_VACINA: { bg: 'rgba(64,191,193,0.1)', color: '#40BFC1' },
    VERMIFUGO: { bg: '#FFEDD5', color: '#E6A15C' },
    CARRAPATICIDA: { bg: '#D1FAE5', color: '#059669' },
}

const STATUS_DOSE_COLORS: Record<string, { bg: string; color: string; border: string }> = {
    EM_DIA: { bg: '#D1FAE5', color: '#059669', border: '#D1FAE5' },
    VENCENDO: { bg: '#FFEDD5', color: '#E6A15C', border: '#FFEDD5' },
    VENCIDA: { bg: '#FEE2E2', color: '#DC2626', border: '#FEE2E2' },
    SEM_RECORRENCIA: { bg: '#F1F5F9', color: '#64748B', border: '#F1F5F9' },
    APLICADO: { bg: '#EDE9FE', color: '#7C3AED', border: '#EDE9FE' },
}

const STATUS_DOSE_LABELS: Record<string, string> = {
    EM_DIA: 'Em dia', VENCENDO: 'Vencendo', VENCIDA: 'Vencida',
    SEM_RECORRENCIA: 'Sem recorrência', APLICADO: 'Já aplicado'
}

export default function SaudePage() {
    const router = useRouter()
    const [animais, setAnimais] = useState<Animal[]>([])
    const [registros, setRegistros] = useState<Registro[]>([])
    const [alertas, setAlertas] = useState<Alerta[]>([])
    const [loading, setLoading] = useState(true)
    const [tab, setTab] = useState<'historico' | 'alertas'>('historico')
    const [animalSelecionado, setAnimalSelecionado] = useState<number | ''>('')
    const [filtroTipo, setFiltroTipo] = useState('')
    const [search, setSearch] = useState('')
    const [showModal, setShowModal] = useState(false)
    const [alertaAplicar, setAlertaAplicar] = useState<Alerta | null>(null)
    const [dataAplicacao, setDataAplicacao] = useState('')
    const [proximaDoseCalculada, setProximaDoseCalculada] = useState('')
    const [viewRegistro, setViewRegistro] = useState<Registro | null>(null)
    const [editRegistro, setEditRegistro] = useState<Registro | null>(null)
    const [animalAtivo, setAnimalAtivo] = useState<Animal | null>(null)
    const [filtroStatus, setFiltroStatus] = useState('')
    const [filtroPorte, setFiltroPorte] = useState('')
    const [filtroSexo, setFiltroSexo] = useState('')
    const [form, setForm] = useState({
        animal: '', tipo: 'ANTIRABICA', nome_produto: '',
        data_aplicacao: '', proxima_dose: '', observacoes: ''
    })
    const [formErrors, setFormErrors] = useState<Record<string, string>>({})

    function calcularProximaDose(tipo: string, dataAplicacao: string): string {
        if (!dataAplicacao) return ''
        const data = new Date(dataAplicacao)
        switch (tipo) {
            case 'ANTIRABICA': data.setFullYear(data.getFullYear() + 1); break  // 12 meses
            case 'V10': data.setFullYear(data.getFullYear() + 1); break  // 12 meses
            case 'OUTRA_VACINA': return ''                                         // sem recorrência
            case 'VERMIFUGO': data.setMonth(data.getMonth() + 4); break        // 4 meses
            case 'CARRAPATICIDA': data.setMonth(data.getMonth() + 3); break        // 3 meses
            default: return ''
        }
        return data.toISOString().split('T')[0]
    }

    async function fetchTudo() {
        setLoading(true)
        try {
            const [animaisRes, registrosRes, alertasRes] = await Promise.all([
                api.get('/animais/'),
                api.get('/saude/registros/'),
                api.get('/saude/alertas/'),
            ])
            const animaisData = Array.isArray(animaisRes.data) ? animaisRes.data : animaisRes.data.results || []
            const registrosData = Array.isArray(registrosRes.data) ? registrosRes.data : registrosRes.data.results || []
            setAnimais(animaisData)
            setRegistros(registrosData)
            setAlertas(alertasRes.data)
        } catch (err) {
            console.error(err)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => { fetchTudo() }, [])

    function openNew() {
        setEditRegistro(null)
        setForm({ animal: '', tipo: 'ANTIRABICA', nome_produto: '', data_aplicacao: '', proxima_dose: '', observacoes: '' })
        setFormErrors({})
        setShowModal(true)
    }

    function openEdit(r: Registro) {
        setEditRegistro(r)
        setForm({
            animal: String(r.animal), tipo: r.tipo, nome_produto: r.nome_produto,
            data_aplicacao: r.data_aplicacao, proxima_dose: r.proxima_dose || '', observacoes: r.observacoes
        })
        setFormErrors({})
        setShowModal(true)
    }

    async function handleDelete(id: number) {
        if (confirm('Deseja excluir este registro?')) {
            await api.delete(`/saude/registros/${id}/`)
            fetchTudo()
        }
    }

    function validate() {
        const e: Record<string, string> = {}
        if (!form.animal) e.animal = 'Selecione um animal'
        if (!form.data_aplicacao) e.data_aplicacao = 'Data obrigatória'
        setFormErrors(e)
        return Object.keys(e).length === 0
    }

    async function handleSave() {
        if (!validate()) return
        try {
            const payload = {
                animal: Number(form.animal), tipo: form.tipo,
                nome_produto: form.nome_produto, data_aplicacao: form.data_aplicacao,
                proxima_dose: form.proxima_dose || null, observacoes: form.observacoes,
            }
            if (editRegistro) {
                await api.put(`/saude/registros/${editRegistro.id}/`, payload)
            } else {
                await api.post('/saude/registros/', payload)
            }
            setShowModal(false)
            fetchTudo()
        } catch (err: any) {
            setFormErrors({ general: 'Erro ao salvar. Verifique os dados.' })
        }
    }

    async function handleAplicar() {
        if (!alertaAplicar || !dataAplicacao) return
        try {
            const proxima = calcularProximaDose(alertaAplicar.tipo, dataAplicacao)
            await api.post('/saude/registros/', {
                animal: alertaAplicar.animal_id,
                tipo: alertaAplicar.tipo,
                data_aplicacao: dataAplicacao,
                proxima_dose: proxima || null,
                observacoes: 'Registrado via painel de alertas',
            })
            setAlertaAplicar(null)
            setDataAplicacao('')
            setProximaDoseCalculada('')
            fetchTudo()
        } catch {
            alert('Erro ao registrar aplicação.')
        }
    }

    const registrosFiltrados = registros.filter(r => {
        if (animalSelecionado && r.animal !== animalSelecionado) return false
        if (filtroTipo && r.tipo !== filtroTipo) return false
        if (search && !r.animal_nome.toLowerCase().includes(search.toLowerCase())) return false
        return true
    })

    const inputStyle = (hasError = false) => ({
        width: '100%', padding: '10px 12px',
        border: `1.5px solid ${hasError ? '#ef4444' : '#E2E8F0'}`,
        borderRadius: '8px', fontSize: '0.875rem', outline: 'none',
        boxSizing: 'border-box' as const, backgroundColor: '#F8FAFC',
        color: '#0F172A', fontFamily: 'Manrope, sans-serif',
    })

    const selectStyle = {
        padding: '9px 36px 9px 14px', border: '1.5px solid #E2E8F0',
        borderRadius: '8px', fontSize: '0.85rem', color: '#475569',
        backgroundColor: '#fff', appearance: 'none' as const, cursor: 'pointer',
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%238a9ab0' d='M6 8L1 3h10z'/%3E%3C/svg%3E")`,
        backgroundRepeat: 'no-repeat' as const, backgroundPosition: 'right 12px center', outline: 'none',
    }

    return (
        <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#F6F8F8', fontFamily: 'Manrope, sans-serif' }}>

            {/* SIDEBAR */}
            <aside style={{ width: '288px', minWidth: '288px', backgroundColor: '#fff', borderRight: '1px solid #E2E8F0', display: 'flex', flexDirection: 'column' }}>
                <div style={{ padding: '24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '48px', height: '48px', borderRadius: '9999px', backgroundColor: '#40BFC1', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.3rem', flexShrink: 0 }}>🐾</div>
                    <div>
                        <div style={{ fontWeight: 700, fontSize: '18px', color: '#0F172A', lineHeight: '22px' }}>Vira Lata</div>
                        <div style={{ fontSize: '12px', fontWeight: 600, color: '#64748B', letterSpacing: '0.6px', textTransform: 'uppercase' }}>VIRA LUXO</div>
                    </div>
                </div>

                <nav style={{ padding: '24px 16px', flex: 1, display: 'flex', flexDirection: 'column', gap: '32px' }}>
                    <div>
                        <p style={{ fontSize: '12px', fontWeight: 700, color: '#94A3B8', letterSpacing: '1.2px', textTransform: 'uppercase', padding: '0 12px', marginBottom: '16px' }}>PELUDOS</p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            {[
                                { icon: '🐾', label: 'Cadastro de Animais', active: false, href: '/animais' },
                                { icon: '💊', label: 'Saúde dos animais', active: true, href: '/saude' },
                                { icon: '📄', label: 'Exportação de dados', active: false, href: '/exportacao' },
                            ].map(item => (
                                <div key={item.label} onClick={() => router.push(item.href)}
                                    style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 12px', borderRadius: '8px', cursor: 'pointer', backgroundColor: item.active ? 'rgba(64,191,193,0.1)' : 'transparent', color: item.active ? '#40BFC1' : '#334155', fontWeight: item.active ? 600 : 500, fontSize: '14px', borderRight: item.active ? '4px solid #40BFC1' : '4px solid transparent' }}>
                                    <span>{item.icon}</span> {item.label}
                                </div>
                            ))}
                        </div>
                    </div>

                    <div>
                        <p style={{ fontSize: '12px', fontWeight: 700, color: '#94A3B8', letterSpacing: '1.2px', textTransform: 'uppercase', padding: '0 12px', marginBottom: '16px' }}>CONTROLE FINANCEIRO</p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            {[
                                { icon: '📋', label: 'Lançamento de contas', href: '/financeiro', active: false },
                            ].map(item => (
                                <div key={item.label} onClick={() => router.push(item.href)}
                                    style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 12px', borderRadius: '8px', cursor: 'pointer', color: '#334155', fontSize: '14px', fontWeight: 500, borderRight: '4px solid transparent' }}>
                                    <span>{item.icon}</span> {item.label}
                                </div>
                            ))}
                        </div>
                    </div>
                </nav>

                <div style={{ padding: '24px', borderTop: '1px solid #E2E8F0' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '8px', backgroundColor: '#F8FAFC', borderRadius: '12px' }}>
                        <div style={{ width: '40px', height: '40px', borderRadius: '9999px', backgroundColor: '#CBD5E1', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: '14px', flexShrink: 0 }}>A</div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A' }}>Admin Vira Lata</div>
                            <div style={{ fontSize: '12px', color: '#64748B' }}>Sair do sistema</div>
                        </div>
                        <button onClick={logout} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8', fontSize: '18px', flexShrink: 0 }}>↪</button>
                    </div>
                </div>
            </aside>

            {/* MAIN */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

                {/* HEADER */}
                <header style={{ backgroundColor: '#fff', borderBottom: '1px solid #E2E8F0', padding: '0 32px', height: '64px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ fontSize: '14px', color: '#94A3B8', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        Peludos <span style={{ color: '#CBD5E1' }}>›</span>
                        <span style={{ color: '#0F172A', fontWeight: 600 }}>Saúde dos Animais</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <div style={{ position: 'relative' }}>
                            <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8', fontSize: '14px' }}>⌕</span>
                            <input
                                placeholder="Buscar animal pelo nome..."
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                style={{ padding: '8px 16px 8px 34px', border: 'none', borderRadius: '8px', fontSize: '14px', width: '256px', outline: 'none', backgroundColor: '#F1F5F9', color: '#6B7280' }}
                            />
                        </div>
                        <button onClick={openNew} style={{ backgroundColor: '#40BFC1', color: '#fff', border: 'none', borderRadius: '8px', padding: '8px 20px', fontSize: '14px', fontWeight: 700, cursor: 'pointer', boxShadow: '0px 1px 2px rgba(64,191,193,0.2)', fontFamily: 'Manrope, sans-serif' }}>
                            + Novo registro
                        </button>
                    </div>
                </header>

                <main style={{ padding: '32px', flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>

                    {/* TITLE */}
                    <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
                        <div>
                            <h1 style={{ fontSize: '30px', fontWeight: 800, color: '#0F172A', lineHeight: '36px', marginBottom: '4px' }}>Saúde dos Animais</h1>
                            <p style={{ fontSize: '16px', color: '#64748B', fontWeight: 400 }}>Gerencie vacinas, vermífugos e alertas de saúde dos peludos.</p>
                        </div>
                    </div>

                    {/* PAINEL DE ALERTAS */}
                    <div style={{ backgroundColor: '#fff', borderRadius: '16px', border: '1px solid #E2E8F0', boxShadow: '0px 1px 2px rgba(0,0,0,0.05)', padding: '24px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                            <div>
                                <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#0F172A', marginBottom: '2px' }}>Painel de Alertas</h2>
                                <p style={{ fontSize: '12px', color: '#64748B' }}>Doses vencidas ou vencendo nos próximos 30 dias</p>
                            </div>
                            <span style={{ backgroundColor: alertas.length > 0 ? '#FEE2E2' : '#D1FAE5', color: alertas.length > 0 ? '#DC2626' : '#059669', padding: '4px 12px', borderRadius: '9999px', fontSize: '12px', fontWeight: 700 }}>
                                {alertas.length} alerta{alertas.length !== 1 ? 's' : ''}
                            </span>
                        </div>

                        {alertas.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '32px', color: '#94A3B8', fontSize: '14px' }}>
                                ✓ Todos os animais estão com as doses em dia!
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                {alertas.map((alerta, i) => {
                                    const isVencida = alerta.status === 'VENCIDA'
                                    return (
                                        <div key={i} style={{
                                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                            padding: '16px', borderRadius: '12px',
                                            backgroundColor: isVencida ? 'rgba(255,247,237,0.3)' : 'rgba(248,250,252,0.5)',
                                            border: `1px solid ${isVencida ? '#FFEDD5' : '#F1F5F9'}`,
                                        }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                                <div style={{ width: '40px', height: '40px', borderRadius: '9999px', backgroundColor: isVencida ? '#FFEDD5' : '#D1FAE5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem' }}>
                                                    {alerta.animal_foto_url
                                                        ? <img src={alerta.animal_foto_url} style={{ width: '40px', height: '40px', borderRadius: '9999px', objectFit: 'cover' }} />
                                                        : '🐾'}
                                                </div>
                                                <div>
                                                    <div style={{ fontSize: '14px', fontWeight: 700, color: '#1E293B' }}>{alerta.animal_nome}</div>
                                                    <div style={{ fontSize: '12px', color: '#64748B' }}>{alerta.tipo_display} • Próxima: {new Date(alerta.proxima_dose).toLocaleDateString('pt-BR')}</div>
                                                </div>
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <div style={{ backgroundColor: isVencida ? '#FFEDD5' : '#FEF3C7', padding: '3.5px 8px', borderRadius: '4px' }}>
                                                    <span style={{ fontSize: '10px', fontWeight: 700, color: isVencida ? '#E6A15C' : '#B45309', textTransform: 'uppercase' }}>
                                                        {isVencida ? `${Math.abs(alerta.dias_restantes)}d atrasada` : `${alerta.dias_restantes}d restantes`}
                                                    </span>
                                                </div>
                                                <button
                                                    onClick={() => {
                                                        setAlertaAplicar(alerta)
                                                        setDataAplicacao('')
                                                        setProximaDoseCalculada('')
                                                    }}
                                                    style={{ backgroundColor: '#40BFC1', color: '#fff', border: 'none', borderRadius: '8px', padding: '6px 14px', fontSize: '12px', fontWeight: 700, cursor: 'pointer', fontFamily: 'Manrope, sans-serif', whiteSpace: 'nowrap' }}>
                                                    ✓ Aplicado
                                                </button>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        )}
                    </div>

                    {/* LISTA DE ANIMAIS + HISTÓRICO */}
                    <div style={{ display: 'flex', gap: '0', backgroundColor: '#fff', borderRadius: '16px', border: '1px solid #E2E8F0', boxShadow: '0px 1px 2px rgba(0,0,0,0.05)', overflow: 'hidden', minHeight: '500px' }}>

                        {/* COLUNA ESQUERDA — lista de animais */}
                        <div style={{ width: '330px', minWidth: '330px', borderRight: '1px solid #E2E8F0', display: 'flex', flexDirection: 'column' }}>

                            {/* Header da lista */}
                            <div style={{ padding: '16px', borderBottom: '1px solid #F1F5F9', display: 'flex', flexDirection: 'column', gap: '10px' }}>

                                {/* Busca */}
                                <div style={{ position: 'relative', isolation: 'isolate' }}>
                                    <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8', fontSize: '13px', zIndex: 1 }}>⌕</span>
                                    <input
                                        placeholder="Buscar animal..."
                                        value={search}
                                        onChange={e => setSearch(e.target.value)}
                                        style={{ width: '100%', padding: '8px 12px 8px 32px', border: '1px solid #E2E8F0', borderRadius: '8px', fontSize: '12px', outline: 'none', backgroundColor: '#fff', color: '#0F172A', fontFamily: 'Manrope, sans-serif', boxSizing: 'border-box' as const }}
                                    />
                                </div>

                                {/* Filtros */}
                                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' as const }}>
                                    <select value={filtroStatus} onChange={e => setFiltroStatus(e.target.value)}
                                        style={{ flex: 1, minWidth: '80px', padding: '6px 24px 6px 8px', border: '1px solid #E2E8F0', borderRadius: '8px', fontSize: '11px', color: '#475569', backgroundColor: '#fff', appearance: 'none' as const, outline: 'none', cursor: 'pointer', fontFamily: 'Manrope, sans-serif', backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 12 12'%3E%3Cpath fill='%236B7280' d='M6 8L1 3h10z'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat' as const, backgroundPosition: 'right 8px center' }}>
                                        <option value="">Status</option>
                                        <option value="NO_ABRIGO">No Abrigo</option>
                                        <option value="ADOTADO">Adotado</option>
                                        <option value="FALECIDO">Falecido</option>
                                        <option value="DESAPARECIDO">Desaparecido</option>
                                        <option value="LT">Lar Temporário</option>
                                    </select>

                                    <select value={filtroPorte} onChange={e => setFiltroPorte(e.target.value)}
                                        style={{ flex: 1, minWidth: '70px', padding: '6px 24px 6px 8px', border: '1px solid #E2E8F0', borderRadius: '8px', fontSize: '11px', color: '#475569', backgroundColor: '#fff', appearance: 'none' as const, outline: 'none', cursor: 'pointer', fontFamily: 'Manrope, sans-serif', backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 12 12'%3E%3Cpath fill='%236B7280' d='M6 8L1 3h10z'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat' as const, backgroundPosition: 'right 8px center' }}>
                                        <option value="">Porte</option>
                                        <option value="PEQUENO">Pequeno</option>
                                        <option value="MEDIO">Médio</option>
                                        <option value="GRANDE">Grande</option>
                                    </select>

                                    <select value={filtroSexo} onChange={e => setFiltroSexo(e.target.value)}
                                        style={{ flex: 1, minWidth: '60px', padding: '6px 24px 6px 8px', border: '1px solid #E2E8F0', borderRadius: '8px', fontSize: '11px', color: '#475569', backgroundColor: '#fff', appearance: 'none' as const, outline: 'none', cursor: 'pointer', fontFamily: 'Manrope, sans-serif', backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 12 12'%3E%3Cpath fill='%236B7280' d='M6 8L1 3h10z'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat' as const, backgroundPosition: 'right 8px center' }}>
                                        <option value="">Sexo</option>
                                        <option value="M">Macho</option>
                                        <option value="F">Fêmea</option>
                                    </select>

                                    {(filtroStatus || filtroPorte || filtroSexo) && (
                                        <button onClick={() => { setFiltroStatus(''); setFiltroPorte(''); setFiltroSexo('') }}
                                            style={{ padding: '6px 8px', background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8', fontSize: '11px', fontFamily: 'Manrope, sans-serif', whiteSpace: 'nowrap' as const }}>
                                            ⊘ Limpar
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Lista */}
                            <div style={{ flex: 1, overflowY: 'auto' }}>
                                {loading ? (
                                    <div style={{ padding: '40px', textAlign: 'center', color: '#94A3B8', fontSize: '14px' }}>Carregando...</div>
                                ) : animais.filter(a =>
                                    a.nome.toLowerCase().includes(search.toLowerCase()) &&
                                    (!filtroStatus || a.status === filtroStatus) &&
                                    (!filtroPorte || a.porte === filtroPorte) &&
                                    (!filtroSexo || a.sexo === filtroSexo)
                                ).length === 0 ? (
                                    <div style={{ padding: '40px', textAlign: 'center', color: '#94A3B8', fontSize: '14px' }}>Nenhum animal encontrado.</div>
                                ) : animais.filter(a =>
                                    a.nome.toLowerCase().includes(search.toLowerCase()) &&
                                    (!filtroStatus || a.status === filtroStatus) &&
                                    (!filtroPorte || a.porte === filtroPorte) &&
                                    (!filtroSexo || a.sexo === filtroSexo)
                                ).map(animal => {
                                    const isAtivo = animalAtivo?.id === animal.id
                                    const totalRegistros = registros.filter(r => r.animal === animal.id).length
                                    const temAlerta = alertas.some(al => al.animal_id === animal.id)
                                    return (
                                        <div key={animal.id} onClick={() => setAnimalAtivo(isAtivo ? null : animal)}
                                            style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '16px', cursor: 'pointer', borderLeft: isAtivo ? '4px solid #40BFC1' : '4px solid transparent', backgroundColor: isAtivo ? 'rgba(64,191,193,0.05)' : 'transparent', borderTop: '1px solid #F1F5F9' }}
                                            onMouseEnter={e => { if (!isAtivo) e.currentTarget.style.backgroundColor = '#F8FAFC' }}
                                            onMouseLeave={e => { if (!isAtivo) e.currentTarget.style.backgroundColor = 'transparent' }}>

                                            <div style={{ width: '56px', height: '56px', borderRadius: '12px', overflow: 'hidden', backgroundColor: 'rgba(64,191,193,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.6rem', flexShrink: 0 }}>
                                                {(animal as any).foto_url
                                                    ? <img src={(animal as any).foto_url} alt={animal.nome} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                    : '🐾'}
                                            </div>

                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                                                    <span style={{ fontSize: '16px', fontWeight: 700, color: '#0F172A', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{animal.nome}</span>
                                                    {temAlerta && <span style={{ width: '8px', height: '8px', borderRadius: '9999px', backgroundColor: '#E6A15C', flexShrink: 0, display: 'inline-block' }} title="Possui alertas" />}
                                                </div>
                                                <span style={{ backgroundColor: 'rgba(64,191,193,0.1)', color: '#40BFC1', padding: '2px 8px', borderRadius: '9999px', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase' as const }}>
                                                    {totalRegistros} registro{totalRegistros !== 1 ? 's' : ''}
                                                </span>
                                            </div>

                                            <span style={{ color: '#94A3B8', fontSize: '12px' }}>›</span>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>

                        {/* COLUNA DIREITA — histórico */}
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>

                            {!animalAtivo ? (
                                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px', padding: '40px', color: '#94A3B8' }}>
                                    <div style={{ fontSize: '3rem', opacity: 0.4 }}>💊</div>
                                    <div style={{ fontSize: '16px', fontWeight: 700, color: '#64748B' }}>Selecione um animal</div>
                                    <div style={{ fontSize: '14px', color: '#94A3B8', textAlign: 'center' }}>Clique em um animal na lista ao lado para ver o histórico de saúde.</div>
                                </div>
                            ) : (
                                <>
                                    {/* Header do histórico */}
                                    <div style={{ padding: '24px 24px 0', borderBottom: '1px solid #F1F5F9' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                <div style={{ width: '40px', height: '40px', borderRadius: '8px', overflow: 'hidden', backgroundColor: 'rgba(64,191,193,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', flexShrink: 0 }}>
                                                    {(animalAtivo as any).foto_url
                                                        ? <img src={(animalAtivo as any).foto_url} alt={animalAtivo.nome} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                        : '🐾'}
                                                </div>
                                                <div>
                                                    <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#0F172A', marginBottom: '2px' }}>{animalAtivo.nome}</h3>
                                                    <span style={{ fontSize: '12px', color: '#64748B' }}>Histórico de Registros</span>
                                                </div>
                                            </div>
                                            <button onClick={() => {
                                                setEditRegistro(null)
                                                setForm({ animal: String(animalAtivo.id), tipo: 'ANTIRABICA', nome_produto: '', data_aplicacao: '', proxima_dose: '', observacoes: '' })
                                                setFormErrors({})
                                                setShowModal(true)
                                            }}
                                                style={{ backgroundColor: '#40BFC1', color: '#fff', border: 'none', borderRadius: '8px', padding: '8px 16px', fontSize: '12px', fontWeight: 700, cursor: 'pointer', fontFamily: 'Manrope, sans-serif' }}>
                                                + Novo registro
                                            </button>
                                        </div>

                                        {/* Tabs de tipo */}
                                        <div style={{ display: 'flex', gap: '0', overflowX: 'auto' }}>
                                            {[
                                                { value: '', label: 'Todos' },
                                                { value: 'ANTIRABICA', label: 'Antirrábica' },
                                                { value: 'V10', label: 'V10' },
                                                { value: 'OUTRA_VACINA', label: 'Outra Vacina' },
                                                { value: 'VERMIFUGO', label: 'Vermífugo' },
                                                { value: 'CARRAPATICIDA', label: 'Carrapaticida' },
                                            ].map(t => (
                                                <button key={t.value} onClick={() => setFiltroTipo(t.value)}
                                                    style={{ padding: '16px 24px', border: 'none', background: 'none', cursor: 'pointer', fontSize: '14px', fontWeight: 700, color: filtroTipo === t.value ? '#40BFC1' : '#64748B', borderBottom: filtroTipo === t.value ? '2px solid #40BFC1' : '2px solid transparent', marginBottom: '-1px', whiteSpace: 'nowrap' as const, fontFamily: 'Manrope, sans-serif' }}>
                                                    {t.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Registros */}
                                    <div style={{ flex: 1, overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                        {registros.filter(r => r.animal === animalAtivo.id && (!filtroTipo || r.tipo === filtroTipo)).length === 0 ? (
                                            <div style={{ textAlign: 'center', padding: '40px', color: '#94A3B8', fontSize: '14px' }}>
                                                Nenhum registro encontrado para este animal.
                                            </div>
                                        ) : registros.filter(r => r.animal === animalAtivo.id && (!filtroTipo || r.tipo === filtroTipo)).map(r => {
                                            const tc = TIPO_COLORS[r.tipo] || { bg: '#F1F5F9', color: '#64748B' }
                                            const sc = STATUS_DOSE_COLORS[r.status_dose] || STATUS_DOSE_COLORS.SEM_RECORRENCIA
                                            return (
                                                <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', borderRadius: '12px', backgroundColor: 'rgba(248,250,252,0.5)', border: '1px solid #F1F5F9' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                                        <div style={{ width: '40px', height: '40px', borderRadius: '9999px', backgroundColor: tc.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem', flexShrink: 0 }}>💊</div>
                                                        <div>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                                                                <span style={{ fontSize: '14px', fontWeight: 700, color: '#1E293B' }}>{r.tipo_display}</span>
                                                                {r.nome_produto && <span style={{ fontSize: '12px', color: '#94A3B8' }}>• {r.nome_produto}</span>}
                                                            </div>
                                                            <div style={{ fontSize: '12px', color: '#64748B' }}>
                                                                Aplicado em {new Date(r.data_aplicacao).toLocaleDateString('pt-BR')}
                                                                {r.proxima_dose && ` • Próxima: ${new Date(r.proxima_dose).toLocaleDateString('pt-BR')}`}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                        <span style={{ backgroundColor: sc.bg, color: sc.color, padding: '3px 10px', borderRadius: '9999px', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase' as const }}>
                                                            {STATUS_DOSE_LABELS[r.status_dose]}
                                                        </span>
                                                        <button title="Visualizar" onClick={() => setViewRegistro(r)}
                                                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8', fontSize: '1rem', padding: '4px' }}
                                                            onMouseEnter={e => ((e.target as HTMLElement).style.color = '#40BFC1')}
                                                            onMouseLeave={e => ((e.target as HTMLElement).style.color = '#94A3B8')}>○</button>
                                                        <button title="Editar" onClick={() => openEdit(r)}
                                                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8', fontSize: '1rem', padding: '4px' }}
                                                            onMouseEnter={e => ((e.target as HTMLElement).style.color = '#40BFC1')}
                                                            onMouseLeave={e => ((e.target as HTMLElement).style.color = '#94A3B8')}>✎</button>
                                                        <button title="Excluir" onClick={() => handleDelete(r.id)}
                                                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8', fontSize: '1rem', padding: '4px' }}
                                                            onMouseEnter={e => ((e.target as HTMLElement).style.color = '#EF4444')}
                                                            onMouseLeave={e => ((e.target as HTMLElement).style.color = '#94A3B8')}>✕</button>
                                                    </div>
                                                </div>
                                            )
                                        })}
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </main>
            </div>
            {/* MODAL */}
            {showModal && (
                <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}
                    onClick={e => { if (e.target === e.currentTarget) setShowModal(false) }}>
                    <div style={{ background: '#fff', borderRadius: '16px', padding: '32px', width: '100%', maxWidth: '480px', boxShadow: '0 20px 60px rgba(0,0,0,0.15)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                            <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#0F172A' }}>{editRegistro ? 'Editar Registro' : 'Novo Registro de Saúde'}</h2>
                            <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.3rem', color: '#94A3B8' }}>✕</button>
                        </div>

                        {formErrors.general && (
                            <div style={{ background: '#fff5f5', border: '1px solid #fca5a5', borderRadius: '8px', padding: '10px 14px', color: '#dc2626', fontSize: '0.85rem', marginBottom: '16px' }}>
                                {formErrors.general}
                            </div>
                        )}

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxHeight: '60vh', overflowY: 'auto', paddingRight: '4px' }}>

                            <div>
                                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#0F172A', display: 'block', marginBottom: '5px' }}>Animal *</label>
                                <select value={form.animal} onChange={e => setForm({ ...form, animal: e.target.value })}
                                    style={{ ...selectStyle, width: '100%', boxSizing: 'border-box' as const, border: formErrors.animal ? '1.5px solid #ef4444' : '1.5px solid #E2E8F0' }}>
                                    <option value="">Selecione um animal</option>
                                    {animais.map(a => <option key={a.id} value={a.id}>{a.nome}</option>)}
                                </select>
                                {formErrors.animal && <p style={{ color: '#ef4444', fontSize: '0.72rem', marginTop: '3px' }}>{formErrors.animal}</p>}
                            </div>

                            <div>
                                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#0F172A', display: 'block', marginBottom: '5px' }}>Tipo</label>
                                <select value={form.tipo} onChange={e => {
                                    const novoTipo = e.target.value
                                    const proxima = calcularProximaDose(novoTipo, form.data_aplicacao)
                                    setForm({ ...form, tipo: novoTipo, proxima_dose: proxima })
                                }}
                                    style={{ ...selectStyle, width: '100%', boxSizing: 'border-box' as const }}>
                                    <option value="ANTIRABICA">Vacina Antirrábica</option>
                                    <option value="V10">Vacina V10</option>
                                    <option value="OUTRA_VACINA">Outra Vacina</option>
                                    <option value="VERMIFUGO">Vermífugo</option>
                                    <option value="CARRAPATICIDA">Carrapaticida</option>
                                </select>
                            </div>

                            <div>
                                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#0F172A', display: 'block', marginBottom: '5px' }}>
                                    Produto <span style={{ color: '#94A3B8', fontWeight: 400 }}>(opcional)</span>
                                </label>
                                <input value={form.nome_produto} onChange={e => setForm({ ...form, nome_produto: e.target.value })}
                                    placeholder="Ex: Nobivac, Drontal..." style={inputStyle()} />
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                <div>
                                    <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#0F172A', display: 'block', marginBottom: '5px' }}>Data de aplicação *</label>
                                    <input type="date" value={form.data_aplicacao} onChange={e => {
                                        const novaData = e.target.value
                                        const proxima = calcularProximaDose(form.tipo, novaData)
                                        setForm({ ...form, data_aplicacao: novaData, proxima_dose: proxima })
                                    }}
                                        style={inputStyle(!!formErrors.data_aplicacao)} />
                                    {formErrors.data_aplicacao && <p style={{ color: '#ef4444', fontSize: '0.72rem', marginTop: '3px' }}>{formErrors.data_aplicacao}</p>}
                                </div>
                                <div>
                                    <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#0F172A', display: 'block', marginBottom: '5px' }}>
                                        Próxima dose <span style={{ color: '#94A3B8', fontWeight: 400 }}>(auto)</span>
                                    </label>
                                    <input type="date" value={form.proxima_dose} onChange={e => setForm({ ...form, proxima_dose: e.target.value })}
                                        placeholder="Calculada automaticamente" style={inputStyle()} />
                                </div>
                            </div>

                            <div>
                                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#0F172A', display: 'block', marginBottom: '5px' }}>
                                    Observações <span style={{ color: '#94A3B8', fontWeight: 400 }}>(opcional)</span>
                                </label>
                                <textarea value={form.observacoes} onChange={e => setForm({ ...form, observacoes: e.target.value })}
                                    placeholder="Alguma observação sobre o procedimento..." rows={2}
                                    style={{ ...inputStyle(), resize: 'vertical' }} />
                            </div>

                        </div>

                        <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
                            <button onClick={() => setShowModal(false)} style={{ flex: 1, padding: '12px', border: '1.5px solid #E2E8F0', borderRadius: '8px', background: '#fff', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 600, color: '#475569' }}>Cancelar</button>
                            <button onClick={handleSave} style={{ flex: 1, padding: '12px', border: 'none', borderRadius: '8px', background: '#40BFC1', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 600, color: '#fff' }}>
                                {editRegistro ? 'Salvar alterações' : 'Registrar'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL APLICAR */}
            {alertaAplicar && (
                <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}
                    onClick={e => { if (e.target === e.currentTarget) { setAlertaAplicar(null); setDataAplicacao(''); setProximaDoseCalculada('') } }}>
                    <div style={{ background: '#fff', borderRadius: '16px', padding: '32px', width: '100%', maxWidth: '440px', boxShadow: '0 20px 60px rgba(0,0,0,0.15)' }}>

                        {/* Header */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                            <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#0F172A' }}>Registrar Aplicação</h2>
                            <button onClick={() => { setAlertaAplicar(null); setDataAplicacao(''); setProximaDoseCalculada('') }}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.3rem', color: '#94A3B8' }}>✕</button>
                        </div>

                        {/* Info do animal */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '16px', backgroundColor: '#F8FAFC', borderRadius: '12px', marginBottom: '24px' }}>
                            <div style={{ width: '48px', height: '48px', borderRadius: '8px', border: '1px solid #E2E8F0', overflow: 'hidden', backgroundColor: 'rgba(64,191,193,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem', flexShrink: 0 }}>
                                {alertaAplicar.animal_foto_url
                                    ? <img src={alertaAplicar.animal_foto_url} alt={alertaAplicar.animal_nome} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    : '🐾'}
                            </div>
                            <div>
                                <div style={{ fontSize: '16px', fontWeight: 700, color: '#0F172A', marginBottom: '2px' }}>{alertaAplicar.animal_nome}</div>
                                <span style={{ backgroundColor: 'rgba(64,191,193,0.1)', color: '#40BFC1', padding: '2px 8px', borderRadius: '9999px', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase' }}>
                                    {alertaAplicar.tipo_display}
                                </span>
                            </div>
                        </div>

                        {/* Data de aplicação */}
                        <div style={{ marginBottom: '16px' }}>
                            <label style={{ fontSize: '12px', fontWeight: 700, color: '#0F172A', display: 'block', marginBottom: '6px', letterSpacing: '0.3px' }}>
                                Data de aplicação *
                            </label>
                            <input
                                type="date"
                                value={dataAplicacao}
                                onChange={e => {
                                    const novaData = e.target.value
                                    const proxima = calcularProximaDose(alertaAplicar.tipo, novaData)
                                    setDataAplicacao(novaData)
                                    setProximaDoseCalculada(proxima)
                                }}
                                style={{ width: '100%', padding: '10px 12px', border: '1px solid #E2E8F0', borderRadius: '8px', fontSize: '14px', outline: 'none', boxSizing: 'border-box', backgroundColor: '#F8FAFC', color: '#0F172A', fontFamily: 'Manrope, sans-serif' }}
                            />
                        </div>

                        {/* Próxima dose calculada */}
                        {proximaDoseCalculada && (
                            <div style={{ backgroundColor: 'rgba(64,191,193,0.05)', border: '1px solid rgba(64,191,193,0.2)', borderRadius: '12px', padding: '16px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div style={{ width: '36px', height: '36px', borderRadius: '9999px', backgroundColor: 'rgba(64,191,193,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: '1rem' }}>📅</div>
                                <div>
                                    <div style={{ fontSize: '10px', fontWeight: 700, color: '#94A3B8', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '2px' }}>PRÓXIMA DOSE</div>
                                    <div style={{ fontSize: '14px', fontWeight: 700, color: '#40BFC1' }}>
                                        {new Date(proximaDoseCalculada + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
                                    </div>
                                </div>
                            </div>
                        )}

                        {!proximaDoseCalculada && dataAplicacao && alertaAplicar.tipo === 'OUTRA_VACINA' && (
                            <div style={{ backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '14px 16px', marginBottom: '24px', fontSize: '13px', color: '#64748B' }}>
                                Este tipo de vacina não possui recorrência automática.
                            </div>
                        )}

                        {/* Botões */}
                        <div style={{ display: 'flex', gap: '12px', marginTop: proximaDoseCalculada ? '0' : '24px' }}>
                            <button
                                onClick={() => { setAlertaAplicar(null); setDataAplicacao(''); setProximaDoseCalculada('') }}
                                style={{ flex: 1, padding: '12px', border: '1px solid #E2E8F0', borderRadius: '8px', background: '#fff', cursor: 'pointer', fontSize: '14px', fontWeight: 600, color: '#475569', fontFamily: 'Manrope, sans-serif' }}>
                                Cancelar
                            </button>
                            <button
                                onClick={handleAplicar}
                                disabled={!dataAplicacao}
                                style={{ flex: 1, padding: '12px', border: 'none', borderRadius: '8px', background: dataAplicacao ? '#40BFC1' : '#CBD5E1', cursor: dataAplicacao ? 'pointer' : 'not-allowed', fontSize: '14px', fontWeight: 700, color: '#fff', fontFamily: 'Manrope, sans-serif' }}>
                                Salvar registro
                            </button>
                        </div>

                    </div>
                </div>
            )}

            {/* MODAL DETALHES REGISTRO */}
            {viewRegistro && (
                <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}
                    onClick={e => { if (e.target === e.currentTarget) setViewRegistro(null) }}>
                    <div style={{ background: '#fff', borderRadius: '16px', padding: '32px', width: '100%', maxWidth: '480px', boxShadow: '0 20px 60px rgba(0,0,0,0.15)' }}>

                        {/* Header */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                            <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#0F172A' }}>Detalhes do Registro</h2>
                            <button onClick={() => setViewRegistro(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.3rem', color: '#94A3B8' }}>✕</button>
                        </div>

                        {/* Animal + Tipo */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px', padding: '16px', backgroundColor: '#F8FAFC', borderRadius: '12px' }}>
                            <div style={{ width: '56px', height: '56px', borderRadius: '12px', backgroundColor: (TIPO_COLORS[viewRegistro.tipo] || { bg: '#F1F5F9' }).bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.8rem', flexShrink: 0 }}>
                                💊
                            </div>
                            <div>
                                <div style={{ fontSize: '16px', fontWeight: 700, color: '#0F172A', marginBottom: '2px' }}>{viewRegistro.animal_nome}</div>
                                <div style={{ fontSize: '12px', color: '#64748B', marginBottom: '6px' }}>ID: #VL-{String(viewRegistro.animal).padStart(3, '0')}</div>
                                <span style={{ backgroundColor: (TIPO_COLORS[viewRegistro.tipo] || { bg: '#F1F5F9' }).bg, color: (TIPO_COLORS[viewRegistro.tipo] || { color: '#64748B' }).color, padding: '2px 8px', borderRadius: '9999px', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase' }}>
                                    {viewRegistro.tipo_display}
                                </span>
                            </div>
                        </div>

                        {/* Detalhes */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                            {[
                                { label: 'TIPO', value: viewRegistro.tipo_display },
                                { label: 'STATUS DA DOSE', value: STATUS_DOSE_LABELS[viewRegistro.status_dose] || viewRegistro.status_dose },
                                { label: 'DATA APLICAÇÃO', value: new Date(viewRegistro.data_aplicacao).toLocaleDateString('pt-BR') },
                                { label: 'PRÓXIMA DOSE', value: viewRegistro.proxima_dose ? new Date(viewRegistro.proxima_dose).toLocaleDateString('pt-BR') : 'Não definida' },
                            ].map(item => (
                                <div key={item.label} style={{ backgroundColor: '#F8FAFC', borderRadius: '8px', padding: '12px' }}>
                                    <div style={{ fontSize: '10px', fontWeight: 700, color: '#94A3B8', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '4px' }}>{item.label}</div>
                                    <div style={{ fontSize: '14px', fontWeight: 700, color: '#334155' }}>{item.value}</div>
                                </div>
                            ))}
                        </div>

                        {/* Produto */}
                        {viewRegistro.nome_produto && (
                            <div style={{ backgroundColor: '#F8FAFC', borderRadius: '8px', padding: '12px', marginBottom: '12px' }}>
                                <div style={{ fontSize: '10px', fontWeight: 700, color: '#94A3B8', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '4px' }}>PRODUTO</div>
                                <div style={{ fontSize: '14px', color: '#475569' }}>{viewRegistro.nome_produto}</div>
                            </div>
                        )}

                        {/* Observações */}
                        {viewRegistro.observacoes && (
                            <div style={{ backgroundColor: '#F8FAFC', borderRadius: '8px', padding: '12px', marginBottom: '16px' }}>
                                <div style={{ fontSize: '10px', fontWeight: 700, color: '#94A3B8', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '4px' }}>OBSERVAÇÕES</div>
                                <div style={{ fontSize: '14px', color: '#475569', lineHeight: '1.6' }}>{viewRegistro.observacoes}</div>
                            </div>
                        )}

                        {/* Botões */}
                        <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
                            <button onClick={() => setViewRegistro(null)}
                                style={{ flex: 1, padding: '12px', border: '1px solid #E2E8F0', borderRadius: '8px', background: '#fff', cursor: 'pointer', fontSize: '14px', fontWeight: 600, color: '#475569', fontFamily: 'Manrope, sans-serif' }}>
                                Fechar
                            </button>
                            <button onClick={() => { setViewRegistro(null); openEdit(viewRegistro) }}
                                style={{ flex: 1, padding: '12px', border: 'none', borderRadius: '8px', background: '#40BFC1', cursor: 'pointer', fontSize: '14px', fontWeight: 700, color: '#fff', fontFamily: 'Manrope, sans-serif' }}>
                                ✎ Editar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
