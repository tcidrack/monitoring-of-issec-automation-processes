from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from models import ProcessoIn
from supabase_client import supabase
from datetime import datetime

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

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

        result = supabase.table("processos").upsert(
            payload,
            on_conflict="processo"
        ).execute()

        if result.data is None:
            raise Exception(result)

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


@app.delete("/limpar-mes")
def limpar_mes():
    try:
        mes_atual = datetime.now().month
        ano_atual = datetime.now().year

        response = supabase.rpc(
            "limpar_mes_atual",
            {"mes": mes_atual, "ano": ano_atual}
        ).execute()

        return {"status": "limpo"}

    except Exception as e:
        print("❌ ERRO DELETE:", repr(e))
        raise HTTPException(status_code=500, detail=str(e))
