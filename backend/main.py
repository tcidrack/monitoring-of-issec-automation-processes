from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from models import ProcessoIn
from supabase_client import supabase
from typing import Optional
from pydantic import BaseModel

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

class LimpezaFiltro(BaseModel):
    analista: Optional[str] = None
    competencia: Optional[str] = None
    data_inicio: Optional[str] = None
    data_fim: Optional[str] = None


@app.post("/processos")
def criar_ou_atualizar_processo(processo: ProcessoIn):
    try:
        payload = {
            "analista": processo.analista,
            "processo": processo.processo,
            "data_producao": processo.data_producao.isoformat() if processo.data_producao else None,
            "valor_processo": processo.valor_processo,
            "total_senhas": processo.total_senhas,
            "senhas_executadas": processo.senhas_executadas,
            "senhas_nao_identificadas": processo.senhas_nao_identificadas,
            "data_execucao": processo.data_execucao.isoformat(),
        }

        result = supabase.table("processos").upsert(payload, on_conflict="processo").execute()

        if not result.data:
            raise Exception("Erro ao salvar processo")

        return {"status": "ok"}

    except Exception as e:
        print("❌ ERRO BACKEND:", repr(e))
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/processos")
def listar_processos():
    try:
        response = supabase.table("processos").select("*").order(
            "data_execucao", desc=True
        ).execute()

        return response.data

    except Exception as e:
        print("❌ ERRO GET:", repr(e))
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/limpar-filtrados")
def limpar_filtrados(filtros: LimpezaFiltro):
    try:
        query = supabase.table("processos").delete()

        if filtros.analista and filtros.analista != "Todos":
            query = query.eq("analista", filtros.analista)

        if filtros.competencia and filtros.competencia != "Todos":
            mes, ano = filtros.competencia.split("/")
            data_comp = f"{ano}-{mes}-01"
            query = query.eq("data_producao", data_comp)

        if filtros.data_inicio:
            query = query.gte("data_execucao", filtros.data_inicio)

        if filtros.data_fim:
            query = query.lte("data_execucao", filtros.data_fim + "T23:59:59")

        result = query.execute()

        return {"apagados": len(result.data or [])}

    except Exception as e:
        print("❌ ERRO LIMPAR FILTRADOS:", repr(e))
        raise HTTPException(status_code=500, detail=str(e))
