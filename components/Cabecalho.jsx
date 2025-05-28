import { useEffect, useState } from "react";
import { auth, db } from "../firebase";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";

export default function Cabecalho() {
  const [nome, setNome] = useState("");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const docRef = doc(db, "usuarios", user.uid);
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          const dados = snap.data();
          setNome(dados.nome || "Paciente");
        } else {
          setNome(user.displayName || "Paciente");
        }
      } else {
        setNome("");
      }
    });

    return () => unsubscribe();
  }, []);

  if (!nome) return null;

  return (
    <div className="p-4 bg-blue-100 text-blue-900 font-semibold text-xl rounded-lg shadow mb-4">
      Olá, {nome}!
    </div>
  );
}
