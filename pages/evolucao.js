import { useEffect, useState } from 'react'
import { getAuth, onAuthStateChanged } from 'firebase/auth'
import {
  getFirestore,
  collection,
  getDocs,
  query,
  where,
  Timestamp
} from 'firebase/firestore'
import app from '../firebase'
import { format, startOfWeek, endOfWeek } from 'date-fns'
import { useRouter } from 'next/router'

export default function Evolucao() {
  const [dados, setDados] = useState([])
  const auth = getAuth(app)
  const db = getFirestore(app)
  const router = useRouter()

  useEffect(() => {
    onAuthStateChanged(auth, async (user) => {
      if (user) {
        const hoje = new Date()
        const inicio = startOfWeek(hoje, { weekStartsOn: 1 })
        const fim = endOfWeek(hoje, { weekStartsOn: 1 })

        const ref = collection(db, `usuarios/${user.uid}/checklists`)
        const snap = await getDocs(
          query(ref,
            where('data', '>=', Timestamp.fromDate(inicio)),
            where('data', '<=', Timestamp.fromDate(fim))
          )
        )

        const lista = []
        snap.forEach(doc => {
          const item = doc.data()
          const dataFormatada = format(item.data.toDate(), 'dd/MM')
          lista.push({
            data: dataFormatada,
            dieta: item.dieta,
            treino: item.treino,
            agua: item.agua
          })
        })

        setDados(lista.sort((a, b) => a.data.localeCompare(b.data)))
      }
    })
  }, [])

  return (
    <main className="p-6">
      <div className="w-full max-w-md mx-auto bg-white rounded-xl shadow p-4">
        <button onClick={() => router.back()} className="text-sm text-gray-500 hover:underline mb-3">
          ← Voltar
        </button>

        <h2 className="text-lg font-bold mb-3">Sua Evolução</h2>
        <table className="w-full text-sm text-center border-separate border-spacing-y-2">
          <thead className="text-gray-600">
            <tr>
              <th className="py-1">Data</th>
              <th>Dieta</th>
              <th>Treino</th>
              <th>Água</th>
            </tr>
          </thead>
          <tbody className="font-medium text-gray-800">
            {dados.map((dia, index) => (
              <tr key={index} className="bg-gray-50">
                <td className="py-1">{dia.data}</td>
                <td>{dia.dieta ? '✅' : '❌'}</td>
                <td>{dia.treino ? '✅' : '❌'}</td>
                <td>{dia.agua ? '✅' : '❌'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  )
}
