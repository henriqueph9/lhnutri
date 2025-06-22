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

  const auth = getAuth(app)
  const db = getFirestore(app)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const uid = user.uid
        const snap = await getDocs(query(collection(db, 'usuarios')))
        const dados = snap.docs.find(doc => doc.id === uid)?.data()
        if (dados) setNome(dados.nome)

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

  const pieData = (valor, label, color) => ({
    labels: ['✔', '✘'],
    datasets: [{
      data: [valor, totalDias - valor],
      backgroundColor: [color, '#e5e7eb'],
      borderWidth: 1
    }]
  })

  const pieOptions = {
    responsive: false,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: { enabled: false }
    }
  }

  return (
    <div className="p-4 max-w-5xl mx-auto">
      <h1 className="text-xl font-bold mb-1">📊 Evolução de {nome}</h1>
      <p className="text-sm text-gray-600 mb-4">📅 Período: {dataInicio} até {dataFim}</p>

      {/* Versão desktop */}
      <div className="hidden md:block overflow-x-auto mb-6">
        <table className="w-full text-xs border border-gray-300">
          <thead className="bg-gray-100">
            <tr>
              <th className="border px-1 py-1">Data</th>
              <th className="border px-1 py-1">Dieta</th>
              <th className="border px-1 py-1">Treino</th>
              <th className="border px-1 py-1">Água</th>
              <th className="border px-1 py-1">Nota</th>
              <th className="border px-1 py-1">Água Total</th>
              <th className="border px-1 py-1">Extra</th>
              <th className="border px-1 py-1 text-left">Observação</th>
            </tr>
          </thead>
          <tbody>
            {registros.map((r, i) => (
              <tr key={i} className="text-center">
                <td className="border px-1 py-1">{format(new Date(r.data), 'dd/MM')}</td>
                <td className="border px-1 py-1">{r.dieta ? '✅' : '❌'}</td>
                <td className="border px-1 py-1">{r.treino ? '✅' : '❌'}</td>
                <td className="border px-1 py-1">{r.agua ? '✅' : '❌'}</td>
                <td className="border px-1 py-1">{r.nota}</td>
                <td className="border px-1 py-1">{r.aguaTotal}</td>
                <td className="border px-1 py-1">{r.extra ? '✅' : '❌'}</td>
                <td className="border px-1 py-1 text-left align-top">
                  <button
                    onClick={() => document.getElementById(`obs-${i}`).classList.toggle('hidden')}
                    className="text-blue-600 underline text-xs"
                  >
                    Ver
                  </button>
                  <div id={`obs-${i}`} className="hidden mt-1 text-xs text-gray-700">
                    {r.observacao || 'Sem observações'}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Versão mobile */}
      <div className="md:hidden space-y-3 mb-6">
        {registros.map((r, i) => (
          <div key={i} className="border rounded p-2 text-xs bg-white shadow">
            <div className="flex justify-between mb-1 font-semibold">
              <span>📅 {format(new Date(r.data), 'dd/MM')}</span>
              <span>Nota: {r.nota}</span>
            </div>
            <div className="flex justify-around text-center">
              <div>Dieta<br />{r.dieta ? '✅' : '❌'}</div>
              <div>Treino<br />{r.treino ? '✅' : '❌'}</div>
              <div>Água<br />{r.agua ? '✅' : '❌'}</div>
            </div>
            <div className="mt-2">
              <button
                onClick={() => document.getElementById(`mobile-extra-${i}`).classList.toggle('hidden')}
                className="text-blue-600 underline"
              >Ver mais</button>
              <div id={`mobile-extra-${i}`} className="hidden mt-1">
                <p>Água Total: {r.aguaTotal}</p>
                <p>Extra: {r.extra ? '✅' : '❌'}</p>
                <p>Observação: {r.observacao || 'Sem observações'}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap justify-center gap-4">
        {[{
          titulo: 'Dieta', valor: totalDieta, cor: '#34d399'
        }, {
          titulo: 'Treino', valor: totalTreino, cor: '#f97316'
        }, {
          titulo: 'Água', valor: totalAgua, cor: '#60a5fa'
        }].map(({ titulo, valor, cor }, idx) => (
          <div key={idx} className="text-center w-[110px]">
            <Pie data={pieData(valor, titulo, cor)} options={pieOptions} width={90} height={90} />
            <div className="mt-1 text-xs font-medium">{titulo}</div>
            <div className="flex flex-col items-center text-[11px] mt-1">
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: cor }}></div>
                <span>{valor}</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-sm bg-gray-300"></div>
                <span>{totalDias - valor}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 text-center text-xs text-gray-700">
        <p>✅ Dias 100% (Dieta + Treino + Água): <strong>{dias100}</strong></p>
        <p>📊 Nota média: <strong>{mediaNota}</strong></p>
      </div>
    </div>
  )
}
