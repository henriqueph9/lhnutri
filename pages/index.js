import { useState } from "react";
import Cabecalho from "../components/Cabecalho";
import DiaRegistro from "../components/DiaRegistro";

export default function Home() {
  // Data de hoje para passar para o componente de registro
  const hoje = new Date();

  return (
    <main className="min-h-screen bg-gray-50 p-6">
      <Cabecalho />

      <h1 className="text-2xl font-bold mb-4">Registro do Dia</h1>
      <DiaRegistro data={hoje} />
    </main>
  );
}
