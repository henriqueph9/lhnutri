import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { getAuth, onAuthStateChanged } from 'firebase/auth'
import {
  collection,
  getDocs,
  getFirestore,
  query,
  orderBy,
  doc,
  getDoc,
  setDoc
} from 'firebase/firestore'
import { app } from '../firebase'
import { format, addDays, subDays } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export default function AdminPage() {
  const auth = getAuth(app)
  const db = getFirestore(app)
  const router = useRouter()

  const [usuarios, setUsuarios] = useState([])
  const [acessoNegado, setAcessoNegado] = useState(false)
  const [dataAtual, setDataAtual] = useState(new Date())
  const [nomesTemp, setNomesTemp] = useState({})

  const UID_DO_ADMIN = 'GGT2USGNN2QbzhaTaXTlhHZVro12'
  const dataFormatada = format(dataAtual, 'yyyy-MM-dd')
  const dataTitulo = format(dataAtual, "EEEE, dd 'de' MMMM", { locale: ptBR })

  useEffect(() => {
    onAuthStateChanged(auth, async (user) => {
      if (user && user.uid === UID_DO_ADMIN) {
        const usuariosRef = collection(db, 'usuarios')
        const querySnapshot = await getDocs(usuariosRef)
        let lista = []

        for (const docUser of querySnapshot.docs) {
          const userData = docUser.data()

          const checklistSnap = await getDocs(
            query(collection(db, `usuarios/${userData.uid}/checklists`), orderBy('data'))
          )
          const relatorioSnap = await getDocs(
            query(collection(db, `usuarios/${userData.uid}/relatorios`), orderBy('data'))
          )

          const checklist = checklistSnap.docs.find((doc) => doc.id === dataFormatada)?.data() || null
          const relatorio = relatorioSnap.docs.find((doc) => doc.id === dataFormatada)?.data() || null

          if (checklist || relatorio) {
            lista.push({
              nome: userData.nome,
              email: userData.email,
              uid: userData.uid,
              checklist,
              relatorio,
            })
          }
        }

        lista.sort((a, b) => a.nome.localeCompare(b.nome))
        setUsuarios(lista)
      } else {
        setAcessoNegado(true)
      }
    })
  }, [dataAtual])

  const mudarDia = (direcao) => {
    setDataAtual((prev) =>
      direcao === 'anterior' ? subDays(prev, 1) : addDays(prev, 1)
    )
  }

  const atualizarNome = async (uid, nome) => {
    try {
      const ref = doc(db, 'usuarios', uid)
      await setDoc(ref, { nome }, { merge: true })
      alert(`Nome atualizado para ${nome}`)
    } catch (error) {
      alert('Erro ao atualizar nome.')
      console.error(error)
    }
  }

  if (acessoNegado) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-red-500 text-lg font-semibold">⛔ Acesso negado</p>
      </div>
    );
  }

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Painel do Administrador</h1>
      <h2 className="text-lg mb-6">{dataTitulo}</h2>

      <div className="flex justify-between mb-4">
        <button className="bg-gray-300 px-4 py-2 rounded hover:bg-gray-400" onClick={() => mudarDia('anterior')}>Dia Anterior</button>
        <button className="bg-gray-300 px-4 py-2 rounded hover:bg-gray-400" onClick={() => mudarDia('proximo')}>Próximo Dia</button>
      </div>

      <div className="space-y-4">
        {usuarios.map((usuario, index) => (
          <div key={index} className="bg-white shadow rounded p-3 text-sm">
            <div className="flex justify-between items-center mb-1">
              <div className="font-semibold text-gray-800 truncate w-full">{usuario.nome}</div>
              <input
                type="text"
                placeholder="Novo nome"
                className="border px-2 py-1 rounded text-sm ml-2"
                onChange={(e) => setNomesTemp({ ...nomesTemp, [usuario.uid]: e.target.value })}
              />
              <button className="text-blue-600 text-xs ml-2" onClick={() => atualizarNome(usuario.uid, nomesTemp[usuario.uid])}>Salvar</button>
            </div>

            <div className="flex flex-wrap gap-x-4 text-gray-700 mb-1">
              <span>🥗 Dieta: {usuario.checklist?.dieta ? '✅' : '❌'}</span>
              <span>🏋️‍♂️ Treino: {usuario.checklist?.treino ? '✅' : '❌'}</span>
              <span>💧 Água: {usuario.checklist?.agua ? '✅' : '❌'}</span>
              <span>📝 Nota: {usuario.relatorio?.nota || '-'}</span>
              <span>💧 Água Rel.: {usuario.relatorio?.agua || '-'}</span>
              <span>🏋️‍♂️ Extra: {usuario.relatorio?.treino ? '✅' : '❌'}</span>
            </div>

            {usuario.checklist?.observacao && (
              <div className="text-gray-600 italic mt-1">🗒️ "{usuario.checklist.observacao}"</div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
