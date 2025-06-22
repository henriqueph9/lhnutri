import { useEffect, useState } from 'react'
import { getAuth, onAuthStateChanged } from 'firebase/auth'
import { getFirestore, collection, getDocs, query, orderBy } from 'firebase/firestore'
import { app } from '../firebase'
import { format } from 'date-fns'
import { Pie } from 'react-chartjs-2'
import Chart from 'chart.js/auto'

export default function Evolucao() {
  const [registros, setRegistros] = useState([])
  const [nome, setNome] = useState('')
  const [dataInicio, setDataInicio] = useState('')
  const [dataFim, setDataFim] = useState('')
  const [uid, setUid] = useState('')
  const [modalAberto, setModalAberto] = useState(false)
  const [detalheSelecionado, setDetalheSelecionado] = useState(null)

  const auth = getAuth(app)
  const db = getFirestore(app)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setUid(user.uid)
        const snap = await getDocs(query(collection(db, 'usuarios')))
        const dados = snap.docs.find((doc) => doc.id === user.uid)?.data()
        if (dados) setNome(dados.nome)

        const checklistsSnap = await getDocs(query(collection(db, `usuarios/${user.uid}/checklists`), orderBy('data')))
        const relatoriosSnap = await getDocs(query(collection(db, `usuarios/${user.uid}/relatorios`), orderBy('data')))

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
    })

    return () => unsubscribe()
  }, [])

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
      datasets: [{
        data: [valor, totalDias - valor],
        backgroundColor: [color, '#e5e7eb'],
        borderWidth: 1,
        borderColor: '#fff'
      }]
    }
  }

  const pieOptions = {
    responsive: false,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: { enabled: false },
      datalabels: { display: false }
    }
  }

  return (
    <div className="p-4 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold mb-2">📊 Evolução de {nome}</h1>
      <p className="text-sm text-gray-600 mb-4">📅 Período: {dataInicio} até {dataFim}</p>

      {/* Mobile */}
      <div className="md:hidden space-y-2 mb-6">
        {registros.map((r, i) => (
          <div key={i} className="border rounded p-2 bg-white shadow text-xs">
            <div className="flex justify-between items-center font-semibold mb-1">
              <span>📅 {format(new Date(r.data), 'dd/MM')}</span>
            </div>
            <div className="flex justify-around items-center text-center">
              <div>Dieta<br />{r.dieta ? '✅' : '❌'}</div>
              <div>Treino<br />{r.treino ? '✅' : '❌'}</div>
              <div>Água<br />{r.agua ? '✅' : '❌'}</div>
            </div>
            <div className="text-center mt-1">
              <button
                onClick={() => {
                  setDetalheSelecionado(r)
                  setModalAberto(true)
                }}
                className="text-blue-600 underline"
              >Ver mais</button>
            </div>
          </div>
        ))}
      </div>

      {modalAberto && detalheSelecionado && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-4 rounded shadow-md w-72 animate-fade-in text-sm">
            <h2 className="font-bold text-base mb-2">Detalhes de {format(new Date(detalheSelecionado.data), 'dd/MM')}</h2>
            <p>Nota: {detalheSelecionado.nota}</p>
            <p>Água Total: {detalheSelecionado.aguaTotal}</p>
            <p>Extra: {detalheSelecionado.extra ? '✅' : '❌'}</p>
            <p>Observação: {detalheSelecionado.observacao || 'Sem observações'}</p>
            <button
              onClick={() => setModalAberto(false)}
              className="mt-3 px-3 py-1 bg-blue-500 text-white text-xs rounded"
            >Fechar</button>
          </div>
        </div>
      )}

      {/* Desktop omitido */}
    </div>
  )
}
