// ✅ DIAREGISTRO.TSX COMPLETO COM Timestamp CORRIGIDO

import React, { useState, useEffect } from "react";
import { db } from "../firebase";
import { doc, setDoc, getDoc, Timestamp } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../firebase";

export default function DiaRegistro({ data }) {
  const [user, setUser] = useState(null);
  const [treino, setTreino] = useState(null);
  const [dieta, setDieta] = useState(null);
  const [agua, setAgua] = useState(null);
  const [observacao, setObservacao] = useState("");
  const [locked, setLocked] = useState(false);
  const [mensagemSucesso, setMensagemSucesso] = useState("");

  const dataFormatada = data.toISOString().split("T")[0];

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        const docRef = doc(db, "usuarios", firebaseUser.uid, "dias", dataFormatada);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const dados = docSnap.data();
          setTreino(dados.treino);
          setDieta(dados.dieta);
          setAgua(dados.agua);
          setObservacao(dados.observacao || "");
          setLocked(true);
          setMensagemSucesso("Enviado com sucesso!");
        }
      }
    });
    return () => unsubscribe();
  }, []);

  const enviarDados = async () => {
    if (!user) return;

    const docRef = doc(db, "usuarios", user.uid, "dias", dataFormatada);
    const payload = {
      treino,
      dieta,
      agua,
      observacao,
      enviadoEm: Timestamp.now(),
    };

    await setDoc(docRef, payload);
    console.log("DADOS SALVOS:", payload);
    setLocked(true);
    setMensagemSucesso("Enviado com sucesso!");
  };

  const editar = () => {
    setLocked(false);
    setMensagemSucesso("");
  };

  return (
    <div className="border p-4 rounded-xl shadow-md bg-white my-4">
      <h2 className="font-bold text-lg mb-2">
        {data.toLocaleDateString("pt-BR", {
          weekday: "long",
          day: "2-digit",
          month: "2-digit",
        })}
      </h2>

      <div className="flex flex-col gap-4">
        <div>
          <p>Dieta:</p>
          <div className="flex gap-2">
            <button onClick={() => setDieta(true)} disabled={locked} className={`px-3 py-1 rounded ${dieta === true ? "bg-green-500 text-white" : "bg-gray-200"} ${locked ? "opacity-50" : ""}`}>✔️</button>
            <button onClick={() => setDieta(false)} disabled={locked} className={`px-3 py-1 rounded ${dieta === false ? "bg-red-500 text-white" : "bg-gray-200"} ${locked ? "opacity-50" : ""}`}>❌</button>
          </div>
        </div>

        <div>
          <p>Treino:</p>
          <div className="flex gap-2">
            <button onClick={() => setTreino(true)} disabled={locked} className={`px-3 py-1 rounded ${treino === true ? "bg-green-500 text-white" : "bg-gray-200"} ${locked ? "opacity-50" : ""}`}>✔️</button>
            <button onClick={() => setTreino(false)} disabled={locked} className={`px-3 py-1 rounded ${treino === false ? "bg-red-500 text-white" : "bg-gray-200"} ${locked ? "opacity-50" : ""}`}>❌</button>
          </div>
        </div>

        <div>
          <p>Água:</p>
          <div className="flex gap-2">
            <button onClick={() => setAgua(true)} disabled={locked} className={`px-3 py-1 rounded ${agua === true ? "bg-green-500 text-white" : "bg-gray-200"} ${locked ? "opacity-50" : ""}`}>✔️</button>
            <button onClick={() => setAgua(false)} disabled={locked} className={`px-3 py-1 rounded ${agua === false ? "bg-red-500 text-white" : "bg-gray-200"} ${locked ? "opacity-50" : ""}`}>❌</button>
          </div>
        </div>

        <div>
          <textarea placeholder="Observações..." value={observacao} disabled={locked} onChange={(e) => setObservacao(e.target.value)} className="w-full border rounded p-2"></textarea>
        </div>

        <div className="flex gap-4">
          <button onClick={enviarDados} disabled={locked} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded disabled:opacity-50">ENVIAR</button>
          <button onClick={editar} className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded">EDITAR</button>
        </div>

        {locked && (
          <div className="bg-green-50 border border-green-200 p-4 rounded mt-4 text-sm text-gray-800">
            <p><strong>✅ Registro enviado:</strong></p>
            <ul className="list-disc list-inside mt-2">
              <li><strong>Dieta:</strong> {dieta === true ? "✔️" : dieta === false ? "❌" : "Não marcado"}</li>
              <li><strong>Treino:</strong> {treino === true ? "✔️" : treino === false ? "❌" : "Não marcado"}</li>
              <li><strong>Água:</strong> {agua === true ? "✔️" : agua === false ? "❌" : "Não marcado"}</li>
              <li><strong>Observação:</strong> {observacao || "Nenhuma observação adicionada."}</li>
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
