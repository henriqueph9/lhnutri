import { useEffect } from "react"
import { useRouter } from "next/router"
import { getAuth, onAuthStateChanged } from "firebase/auth"
import { app } from "../firebase"

export default function Home() {
  const router = useRouter()

  useEffect(() => {
    const auth = getAuth(app)
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) {
        router.push("/login")
      } else {
        router.push("/dashboard") // ou qualquer tela principal para usuários logados
      }
    })

    return () => unsubscribe()
  }, [])

  return null // evita exibir conteúdo temporário
}
