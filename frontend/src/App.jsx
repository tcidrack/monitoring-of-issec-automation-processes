import { useEffect, useState } from "react";
import "./App.css";
import * as XLSX from "xlsx";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const API_URL = "http://127.0.0.1:8000";

export default function App() {
  const [processos, setProcessos] = useState([]);
  const [analista, setAnalista] = useState("Todos");
  const [tema, setTema] = useState("claro");
  const [mes, setMes] = useState("Todos");
  const [loading, setLoading] = useState(false);

  const cores = {
    claro: {
      fundo: "#0070FF",
      card: "#E5F0FF",
      texto: "#000",
      botao: "#111",
    },
    escuro: {
      fundo: "#111827",
      card: "#1E293B",
      texto: "#fff",
      botao: "#2563EB",
    },
  };

  useEffect(() => {
    carregarDados();
  }, []);

  async function carregarDados() {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/processos`);
      const data = await response.json();

      const formatados = data.map((p) => {
        if (!p.data_execucao) return p;

        const d = new Date(p.data_execucao);
        return {
          ...p,
          data_execucao_formatada:
            `${String(d.getDate()).padStart(2, "0")}/` +
            `${String(d.getMonth() + 1).padStart(2, "0")}/` +
            `${d.getFullYear()} ${String(d.getHours()).padStart(2, "0")}:${String(
              d.getMinutes()
            ).padStart(2, "0")}`,
          mes: d.getMonth() + 1,
        };
      });

      setProcessos(formatados);
    } catch (err) {
      console.error("Erro ao buscar dados:", err);
      alert("Erro ao carregar dados do servidor.");
    } finally {
      setLoading(false);
    }
  }

  const mesesLista = ["Todos", 1,2,3,4,5,6,7,8,9,10,11,12];

  let filtrados = processos;

  if (analista !== "Todos") {
    filtrados = filtrados.filter(p => p.analista === analista);
  }

  if (mes !== "Todos") {
    filtrados = filtrados.filter(p => p.mes === mes);
  }

  const analistasUnicos = ["Todos", ...new Set(processos.map(p => p.analista))];

  const totalSenhas = filtrados.reduce((acc,p)=>acc+(p.total_senhas||0),0);
  const cadastradas = filtrados.reduce((acc,p)=>acc+(p.senhas_executadas||0),0);
  const naoCad = filtrados.reduce((acc,p)=>acc+(p.senhas_nao_identificadas||0),0);

  const percCad = totalSenhas ? ((cadastradas/totalSenhas)*100).toFixed(2) : 0;
  const percNao = totalSenhas ? ((naoCad/totalSenhas)*100).toFixed(2) : 0;

  const totalValores = filtrados.reduce(
    (acc,p)=>acc+(p.valor_processo||0),0
  );

  function exportarExcel() {
    // 🔹 Limpa e reorganiza os dados
    const dadosPlanilha = filtrados.map((p) => ({
      Analista: p.analista,
      Processo: p.processo,
      "Total de Senhas": p.total_senhas,
      Executadas: p.senhas_executadas,
      "Não Identificadas": p.senhas_nao_identificadas,
      Valor: Number(p.valor_processo).toLocaleString("pt-BR", {
        minimumFractionDigits: 2,
      }),
      "Data Execução": p.data_execucao_formatada,
    }));

    // 🔹 Linha em branco
    dadosPlanilha.push({});

    // 🔹 Totais
    dadosPlanilha.push({
      Analista: "TOTAL",
      Processo: filtrados.length,
      Valor: totalValores.toLocaleString("pt-BR", {
        minimumFractionDigits: 2,
      }),
    });

    const ws = XLSX.utils.json_to_sheet(dadosPlanilha);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Processos");

    XLSX.writeFile(wb, "processos_issec.xlsx");
  }

  async function limparMesAtual() {
    if (!window.confirm("⚠️ Deseja apagar TODOS os registros deste mês?")) return;

    try {
      await fetch(`${API_URL}/limpar-mes`, { method: "DELETE" });
      alert("Registros apagados com sucesso.");
      carregarDados();
    } catch (err) {
      alert("Erro ao limpar registros.");
    }
  }

  const chartData = [
    { nome: "Cadastradas", valor: cadastradas },
    { nome: "Não Identificadas", valor: naoCad },
  ];

  function trocarTema() {
    setTema(tema === "claro" ? "escuro" : "claro");
  }

  return (
    <div className={`container ${tema === "escuro" ? "tema-escuro" : "tema-claro"}`} style={{ backgroundColor: cores[tema].fundo }}>

      {/* HEADER */}
      <div className="header">
        <div className="logo-area">
          <img
            src="https://maida.health/wp-content/themes/melhortema/assets/images/logo-light.svg"
            alt="Logo"
          />
          <h1>Controle de Processos - Automação ISSEC</h1>
        </div>

        <button onClick={trocarTema} className="btn-tema">
          {tema === "claro" ? "🌙 Escuro" : "☀️ Claro"}
        </button>
      </div>

      {loading && <p style={{ color: "#fff" }}>Carregando dados...</p>}

      {/* CARDS */}
      <div className="cards">

        <div className="card animated-card"
          style={{ backgroundColor: cores[tema].card, color: cores[tema].texto }}>
          <h3>Total de Processos:</h3>
          <p>{filtrados.length}</p>
        </div>

        <div className="card animated-card"
          style={{ backgroundColor: cores[tema].card, color: cores[tema].texto }}>
          <h3>Total em Valores:</h3>
          <p>
            R$ {totalValores.toFixed(2)
              .replace(".", ",")
              .replace(/\B(?=(\d{3})+(?!\d))/g, ".")}
          </p>
        </div>

        <div className="card animated-card"
          style={{ backgroundColor: cores[tema].card, color: cores[tema].texto }}>
          <h3>Status das Senhas:</h3>
          <p>Cadastradas: {cadastradas} ({percCad}%)</p>
          <p>Não Cadastradas: {naoCad} ({percNao}%)</p>
          <p>Total: {totalSenhas}</p>
        </div>
      </div>

      {/* GRÁFICO */}
      <div className="card animated-card"
        style={{ backgroundColor: cores[tema].card, color: cores[tema].texto }}>
        <h3>Distribuição de Senhas</h3>
        <div style={{ width: "100%", height: 250 }}>
          <ResponsiveContainer>
            <BarChart data={chartData}>
              <XAxis dataKey="nome" stroke={cores[tema].texto} />
              <YAxis stroke={cores[tema].texto} />
              <Tooltip />
              <Bar dataKey="valor" fill="#FF0073" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* FILTROS */}
      <div className="filtro">
        <label>Analista:</label>
        <select value={analista} onChange={(e)=>setAnalista(e.target.value)}>
          {analistasUnicos.map(a=> <option key={a}>{a}</option>)}
        </select>

        <label>Mês:</label>
        <select value={mes} onChange={(e)=>setMes(e.target.value==="Todos"?"Todos":Number(e.target.value))}>
          {mesesLista.map(m=> <option key={m}>{m}</option>)}
        </select>

        <button className="btn-tema" onClick={exportarExcel}>
          ⬇️ Exportar Excel
        </button>

        <button className="btn-tema" onClick={limparMesAtual}>
          🗑️ Limpar mês
        </button>
      </div>

      {/* TABELA */}
      <div className="tabela-container" style={{ backgroundColor: cores[tema].card }}>
        <table className="table-auto">
          <thead>
            <tr>
              <th style={{ color: cores[tema].texto }}>Analista</th>
              <th style={{ color: cores[tema].texto }}>Processo</th>
              <th style={{ color: cores[tema].texto }}>Total Senhas</th>
              <th style={{ color: cores[tema].texto }}>Executadas</th>
              <th style={{ color: cores[tema].texto }}>Não Identificadas</th>
              <th style={{ color: cores[tema].texto }}>Valor</th>
              <th style={{ color: cores[tema].texto }}>Data Execução</th>
            </tr>
          </thead>

          <tbody>
            {filtrados.map((p,i)=>(
              <tr key={i}>
                <td style={{ color: cores[tema].texto }}>{p.analista}</td>
                <td style={{ color: cores[tema].texto }}>{p.processo}</td>
                <td style={{ color: cores[tema].texto }}>{p.total_senhas}</td>
                <td style={{ color: cores[tema].texto }}>{p.senhas_executadas}</td>
                <td style={{ color: cores[tema].texto }}>{p.senhas_nao_identificadas}</td>
                <td style={{ color: cores[tema].texto }}>
                  {Number(p.valor_processo).toLocaleString("pt-BR", {
                    style: "currency",
                    currency: "BRL",
                  })}
                </td>
                <td style={{ color: cores[tema].texto }}>{p.data_execucao_formatada}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
