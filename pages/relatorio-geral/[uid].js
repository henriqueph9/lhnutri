import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'
import { collection, getDocs, getFirestore, orderBy, query, doc, setDoc } from 'firebase/firestore'
import { getAuth, onAuthStateChanged } from 'firebase/auth'
import { app } from '../../firebase'
import { format } from 'date-fns'
import { Pie } from 'react-chartjs-2'
import Chart from 'chart.js/auto'

export default function RelatorioGeral() {
  const router = useRouter()
  const { uid } = router.query
  const db = getFirestore(app)
  const auth = getAuth(app)
  const [registros, setRegistros] = useState([])
  const [nome, setNome] = useState('')
  const [anotacao, setAnotacao] = useState('')
  const [anotacaoSalva, setAnotacaoSalva] = useState('')
  const [dataInicio, setDataInicio] = useState('')
  const [dataFim, setDataFim] = useState('')
  const [acessoNegado, setAcessoNegado] = useState(false)
  const UID_ADMIN = 'GGT2USGNN2QbzhaTaXTlhHZVro12'

  useEffect(() => {
    onAuthStateChanged(auth, (user) => {
      if (!user || user.uid !== UID_ADMIN) {
        setAcessoNegado(true)
      } else {
        setAcessoNegado(false)
        carregarDados()
      }
    })
  }, [uid])

  const carregarDados = async () => {
    if (!uid) return;

    const userDoc = await getDocs(query(collection(db, 'usuarios')))
    const userData = userDoc.docs.find(doc => doc.id === uid)?.data()
    if (userData) {
      setNome(userData.nome)
      setAnotacaoSalva(userData.relatorioGeralObs || '')
      setAnotacao(userData.relatorioGeralObs || '')
    }

    const checklistsSnap = await getDocs(query(collection(db, `usuarios/${uid}/checklists`), orderBy('data')))
    const relatoriosSnap = await getDocs(query(collection(db, `usuarios/${uid}/relatorios`), orderBy('data')))

    const checklists = checklistsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }))
    const relatorios = relatoriosSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }))

    if (checklists.length > 0) {
      setDataInicio(format(new Date(checklists[0].id), 'dd/MM/yyyy'))
      setDataFim(format(new Date(checklists[checklists.length - 1].id), 'dd/MM/yyyy'))
    }

    const combinados = checklists.map(c => {
      const rel = relatorios.find(r => r.id === c.id) || {}
      return {
        data: c.id,
        dieta: c.dieta,
        treino: c.treino,
        agua: c.agua,
        observacao: c.observacao || '',
        nota: rel.nota ?? '-',
        aguaTotal: rel.agua ?? '-',
        extra: rel.treinoExtra ?? false
      }
    })

    setRegistros(combinados)
  }

  if (acessoNegado) {
    return (
      <div className="text-center text-red-600 font-bold text-xl mt-10">
        ❌ Acesso negado. Você não tem permissão para visualizar este relatório.
      </div>
    )
  }

  const salvarAnotacao = async () => {
    if (!uid) return
    try {
      await setDoc(doc(db, 'usuarios', uid), {
        relatorioGeralObs: anotacao
      }, { merge: true })
      setAnotacaoSalva(anotacao)
      alert('Anotação salva com sucesso ✅')
    } catch (e) {
      alert('Erro ao salvar anotação ❌')
    }
  }

  const totalDias = registros.length
  const totalDieta = registros.filter(r => r.dieta).length
  const totalTreino = registros.filter(r => r.treino).length
  const totalAgua = registros.filter(r => r.agua).length
  const totalNotas = registros.filter(r => r.nota !== '-' && !isNaN(r.nota)).map(r => Number(r.nota))
  const mediaNota = totalNotas.length > 0 ? (totalNotas.reduce((a, b) => a + b, 0) / totalNotas.length).toFixed(1) : '-'
  const dias100 = registros.filter(r => r.dieta && r.treino && r.agua).length

  const pieData = (valor, label, color) => {
    const faltaLabel = label === 'Dieta' ? 'Furou' : label === 'Água' ? 'Não bebeu' : 'Faltou'
    return {
      labels: [label, faltaLabel],
      datasets: [
        {
          data: [valor, totalDias - valor],
          backgroundColor: [color, '#e5e7eb'],
          borderWidth: 1,
          borderColor: '#fff'
        }
      ]
    }
  }

  const pieOptions = {
    responsive: false,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: { enabled: false }
    }
  }

  const imprimir = () => window.print()

  return (
    <div className="p-4 max-w-5xl mx-auto print:p-0">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Relatório Geral de {nome}</h1>
        <div className="flex gap-2 print:hidden">
          <button
            onClick={() => router.push('https://lhnutri20.vercel.app/admin')}
            className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
          >
            🔙 Voltar
          </button>
          <button
            onClick={imprimir}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            🖨️ Imprimir PDF
          </button>
        </div>
      </div>

      <p className="text-sm text-gray-600 mb-4">📅 Período: {dataInicio} até {dataFim}</p>

      <div className="overflow-x-auto">
        <table className="w-full text-sm border border-gray-300">
          <thead>
            <tr className="bg-gray-100">
              <th className="border p-2">Data</th>
              <th className="border p-2">Dieta</th>
              <th className="border p-2">Treino</th>
              <th className="border p-2">Água</th>
              <th className="border p-2">Nota</th>
              <th className="border p-2">Água Total</th>
              <th className="border p-2">Extra</th>
              <th className="border p-2">Observação</th>
            </tr>
          </thead>
          <tbody>
            {registros.map((r, i) => (
              <tr key={i}>
                <td className="border p-2">{format(new Date(r.data), 'dd/MM/yyyy')}</td>
                <td className="border p-2">{r.dieta ? '✅' : '❌'}</td>
                <td className="border p-2">{r.treino ? '✅' : '❌'}</td>
                <td className="border p-2">{r.agua ? '✅' : '❌'}</td>
                <td className="border p-2">{r.nota}</td>
                <td className="border p-2">{r.aguaTotal}</td>
                <td className="border p-2">{r.extra ? '✅' : '❌'}</td>
                <td className="border p-2 text-left">{r.observacao}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grafico-relatorio mt-8">
        {[{
          titulo: 'Dieta', valor: totalDieta, cor: '#34d399', falta: 'Furou'
        }, {
          titulo: 'Treino', valor: totalTreino, cor: '#f97316', falta: 'Faltou'
        }, {
          titulo: 'Água', valor: totalAgua, cor: '#60a5fa', falta: 'Não bebeu'
        }].map(({ titulo, valor, cor, falta }) => (
          <div key={titulo} className="grafico-item text-center">
            <h3 className="font-semibold text-sm mb-1">{titulo}</h3>
            <Pie data={pieData(valor, titulo, cor)} options={pieOptions} width={100} height={100} />
            <div className="mt-2 text-sm">
              <div className="flex items-center justify-center gap-1 mb-1">
                <span className="w-3 h-3 inline-block rounded-sm" style={{ backgroundColor: cor }}></span>
                <span>{titulo} {valor}</span>
              </div>
              <div className="flex items-center justify-center gap-1">
                <span className="w-3 h-3 inline-block rounded-sm" style={{ backgroundColor: '#e5e7eb' }}></span>
                <span>{falta} {totalDias - valor}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 text-center text-sm text-gray-700">
        <p>✅ Dias 100% (Dieta + Treino + Água): <strong>{dias100}</strong></p>
        <p>📊 Nota média: <strong>{mediaNota}</strong></p>
      </div>

      <div className="mt-12 border-t pt-6">
        <h2 className="text-lg font-semibold mb-2">🖊️ Assinatura / Observações</h2>
        <textarea
          value={anotacao}
          onChange={(e) => setAnotacao(e.target.value)}
          className="w-full h-32 border rounded p-2 mb-2"
          placeholder="Espaço reservado para anotações finais, conclusões ou assinatura..."
        />
        <button
          onClick={salvarAnotacao}
          className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
        >
          💾 Salvar Anotação
        </button>

        {anotacaoSalva && (
          <div className="mt-4 text-left text-sm text-gray-600 whitespace-pre-line">
            <h4 className="font-semibold mb-1">📝 Anotação salva:</h4>
            <p>{anotacaoSalva}</p>
          </div>
        )}
      </div>
    </div>
  )
}
