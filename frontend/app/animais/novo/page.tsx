'use client'
import { useRouter } from 'next/navigation'

export default function NovoAnimalPage() {
  const router = useRouter()

export default function AnimalForm({ initial, id }: Props) {
  const router = useRouter()
  const [form, setForm] = useState(initial ?? {
    nome: '', sexo: 'M', porte: 'M', nascimento: '',
    castrado: false, status: 'disponivel', observacoes: ''
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  function validate() {
    const e: Record<string, string> = {}
    if (!form.nome) e.nome = 'Nome obrigatório'
    if (!form.nascimento) e.nascimento = 'Data obrigatória'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return
    if (id) {
      await api.put(`/animais/${id}/`, form)
    } else {
      await api.post('/animais/', form)
    }
    router.push('/animais')
  }

  const field = (label: string, key: string, type = 'text') => (
    <div>
      <label className="block text-sm font-medium mb-1">{label}</label>
      <input type={type} value={form[key]}
        onChange={e => setForm({ ...form, [key]: e.target.value })}
        className="border w-full p-2 rounded" />
      {errors[key] && <p className="text-red-500 text-xs">{errors[key]}</p>}
    </div>
  )

  return (
    <form onSubmit={handleSubmit} className="max-w-lg mx-auto p-6 space-y-4">
      <h1 className="text-2xl font-bold">{id ? 'Editar' : 'Novo'} Animal</h1>
      {field('Nome', 'nome')}
      {field('Nascimento', 'nascimento', 'date')}
      <div>
        <label className="block text-sm font-medium mb-1">Sexo</label>
        <select value={form.sexo} onChange={e => setForm({ ...form, sexo: e.target.value })} className="border w-full p-2 rounded">
          <option value="M">Macho</option>
          <option value="F">Fêmea</option>
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Porte</label>
        <select value={form.porte} onChange={e => setForm({ ...form, porte: e.target.value })} className="border w-full p-2 rounded">
          <option value="P">Pequeno</option>
          <option value="M">Médio</option>
          <option value="G">Grande</option>
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Status</label>
        <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })} className="border w-full p-2 rounded">
          <option value="disponivel">Disponível</option>
          <option value="adotado">Adotado</option>
          <option value="tratamento">Em Tratamento</option>
        </select>
      </div>
      <div className="flex items-center gap-2">
        <input type="checkbox" checked={form.castrado}
          onChange={e => setForm({ ...form, castrado: e.target.checked })} />
        <label>Castrado</label>
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Observações</label>
        <textarea value={form.observacoes}
          onChange={e => setForm({ ...form, observacoes: e.target.value })}
          className="border w-full p-2 rounded" rows={3} />
      </div>
      <div className="flex gap-2">
        <button type="submit" className="bg-blue-600 text-white px-6 py-2 rounded">Salvar</button>
        <button type="button" onClick={() => router.back()} className="border px-6 py-2 rounded">Cancelar</button>
      </div>
    </form>
  )
}
