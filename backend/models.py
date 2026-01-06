from pydantic import BaseModel
from typing import Optional
from datetime import datetime, date

class ProcessoIn(BaseModel):
    analista: str
    processo: str
    valor_processo: float
    total_senhas: int
    senhas_executadas: int
    senhas_nao_identificadas: int
    data_execucao: datetime
    data_producao: Optional[date] = None
