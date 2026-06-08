import io
import pandas as pd
from datetime import date, datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, File, UploadFile
from pydantic import BaseModel, Field, ConfigDict

from ...core.security import get_current_user_id
from ...db.supabase_client import supabase

router = APIRouter()

# --- Pydantic Schemas ---


class AssetCreate(BaseModel):
    name: str
    type: str  # e.g., 'xp', 'manual', 'fgts', 'carro'

    model_config = ConfigDict(populate_by_name=True, from_attributes=True)


class ManualBalanceCreate(BaseModel):
    balance: float
    reference_date: date = Field(..., alias="referenceDate")

    model_config = ConfigDict(populate_by_name=True, from_attributes=True)


class AssetItemResponse(BaseModel):
    id: str
    asset_id: str
    name: str
    quantity: float
    unit_price: float = Field(..., alias="unitPrice")
    total_value: float = Field(..., alias="totalValue")
    category: Optional[str] = None
    created_at: datetime = Field(..., alias="createdAt")
    updated_at: datetime = Field(..., alias="updatedAt")

    model_config = ConfigDict(populate_by_name=True, from_attributes=True)


class AssetSummaryResponse(BaseModel):
    id: str
    name: str
    type: str
    balance: float
    items: Optional[List[AssetItemResponse]] = None

    model_config = ConfigDict(populate_by_name=True, from_attributes=True)


# --- Routes ---


@router.post("/", response_model=dict)
def create_asset(asset: AssetCreate, user_id: str = Depends(get_current_user_id)):
    """
    Cadastra um ativo genérico.
    """
    try:
        db_data = {"user_id": user_id, "name": asset.name, "type": asset.type}
        response = supabase.table("assets").insert(db_data).execute()
        if not response.data:
            raise HTTPException(status_code=400, detail="Erro ao criar ativo.")
        return response.data[0]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro no banco de dados: {str(e)}")


@router.get("/summary", response_model=List[AssetSummaryResponse])
def get_assets_summary(user_id: str = Depends(get_current_user_id)):
    """
    Lista os ativos do usuário logado (com sub-itens se for da XP, ou o último saldo histórico se for FGTS/Carro).
    """
    try:
        # 1. Buscar todos os ativos do usuário
        assets_response = (
            supabase.table("assets").select("*").eq("user_id", user_id).execute()
        )
        assets = assets_response.data
        if not assets:
            return []

        asset_ids = [a["id"] for a in assets]

        # 2. Buscar todos os sub-itens associados a esses ativos
        items_response = (
            supabase.table("asset_items")
            .select("*")
            .in_("asset_id", asset_ids)
            .execute()
        )
        items_data = items_response.data or []

        # Agrupar sub-itens por asset_id
        items_by_asset = {}
        for item in items_data:
            aid = item["asset_id"]
            if aid not in items_by_asset:
                items_by_asset[aid] = []
            items_by_asset[aid].append(item)

        # 3. Buscar histórico semanal de saldos dos ativos do usuário, ordenado por data descendente
        balances_response = (
            supabase.table("asset_balances_history")
            .select("*")
            .eq("user_id", user_id)
            .order("reference_date", desc=True)
            .execute()
        )
        balances_data = balances_response.data or []

        # Mapear o último saldo histórico por asset_id
        latest_balances = {}
        for bal in balances_data:
            aid = bal["asset_id"]
            if aid not in latest_balances:
                latest_balances[aid] = float(bal["balance"])

        # 4. Construir o resumo dos ativos
        summary = []
        for asset in assets:
            aid = asset["id"]
            atype = asset["type"].lower()

            # Buscar último saldo do histórico (padrão: 0.0)
            hist_balance = latest_balances.get(aid, 0.0)

            asset_items = items_by_asset.get(aid, [])

            if atype == "xp":
                # Para XP, o saldo total é a soma dos sub-itens atuais, caindo de volta para o histórico caso não haja itens
                if asset_items:
                    balance = sum(float(item["total_value"]) for item in asset_items)
                else:
                    balance = hist_balance
                items_list = asset_items
            else:
                # Para ativos manuais (FGTS/Carro), retorna o último saldo histórico e nenhum sub-item
                balance = hist_balance
                items_list = None

            summary.append(
                {
                    "id": aid,
                    "name": asset["name"],
                    "type": asset["type"],
                    "balance": balance,
                    "items": items_list,
                }
            )

        return summary
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Erro ao buscar resumo de ativos: {str(e)}"
        )


@router.post("/{asset_id}/manual-balance", response_model=dict)
def upsert_manual_balance(
    asset_id: str,
    balance_data: ManualBalanceCreate,
    user_id: str = Depends(get_current_user_id),
):
    """
    Faz um UPSERT de saldo global para uma data específica.
    """
    try:
        # Verificar se o ativo existe e pertence ao usuário autenticado
        asset_check = (
            supabase.table("assets")
            .select("id")
            .eq("id", asset_id)
            .eq("user_id", user_id)
            .execute()
        )
        if not asset_check.data:
            raise HTTPException(
                status_code=404,
                detail="Ativo não encontrado ou não pertence a este usuário.",
            )

        db_data = {
            "asset_id": asset_id,
            "user_id": user_id,
            "balance": balance_data.balance,
            "reference_date": str(balance_data.reference_date),
        }

        # Realizar UPSERT no histórico de saldos
        response = supabase.table("asset_balances_history").upsert(db_data).execute()
        if not response.data:
            raise HTTPException(
                status_code=400, detail="Erro ao atualizar o saldo manual."
            )

        return response.data[0]
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro no banco de dados: {str(e)}")


@router.post("/import-xp", response_model=dict)
async def import_xp_file(
    file: UploadFile = File(...),
    asset_id: Optional[str] = None,
    user_id: str = Depends(get_current_user_id),
):
    """
    Recebe um arquivo CSV (UploadFile) da planilha da XP. Use o Pandas para pular as linhas iniciais inúteis,
    identificar as colunas reais, limpar os valores em formato monetário brasileiro para float,
    atualizar os registros em asset_items e salvar o somatório total no histórico de saldos.
    """
    try:
        # 1. Ler conteúdo do arquivo
        contents = await file.read()

        # Tentar decodificar com diferentes encodings
        decoded_str = None
        for encoding in ["utf-8", "latin1", "iso-8859-1", "utf-16"]:
            try:
                decoded_str = contents.decode(encoding)
                break
            except UnicodeDecodeError:
                continue

        if decoded_str is None:
            raise HTTPException(
                status_code=400,
                detail="Não foi possível decodificar o arquivo CSV. Verifique a codificação.",
            )

        # 2. Localizar o índice da linha de cabeçalho
        lines = decoded_str.splitlines()
        header_idx = -1
        for idx, line in enumerate(lines):
            lower_line = line.lower()
            # Procurar indicadores de colunas da XP (quantidade, produto, valor, preço, etc.)
            if "quantidade" in lower_line and (
                "valor" in lower_line
                or "preço" in lower_line
                or "produto" in lower_line
                or "ativo" in lower_line
            ):
                header_idx = idx
                break

        if header_idx == -1:
            # Fallback secundário: procurar linha apenas com a palavra "quantidade"
            for idx, line in enumerate(lines):
                lower_line = line.lower()
                if "quantidade" in lower_line:
                    header_idx = idx
                    break

        if header_idx == -1:
            # Se não encontrado, assume cabeçalho na linha 0
            header_idx = 0

        # 3. Ler com Pandas a partir da linha de cabeçalho
        csv_data = "\n".join(lines[header_idx:])
        df = pd.read_csv(io.StringIO(csv_data))

        if df.empty:
            raise HTTPException(
                status_code=400,
                detail="O arquivo CSV está vazio ou as colunas não foram identificadas.",
            )

        # Limpar nomes das colunas
        df.columns = [str(c).strip().lower() for c in df.columns]
        cols = list(df.columns)

        # Mapear colunas dinamicamente
        name_col = next(
            (
                c
                for c in cols
                if any(
                    k in c for k in ["produto", "ativo", "papel", "descrição", "nome"]
                )
            ),
            None,
        )
        qty_col = next(
            (c for c in cols if any(k in c for k in ["quantidade", "qtd", "quant"])),
            None,
        )
        price_col = next(
            (
                c
                for c in cols
                if any(
                    k in c
                    for k in ["preço", "cotacao", "cotação", "unitario", "unitário"]
                )
            ),
            None,
        )
        value_col = next(
            (
                c
                for c in cols
                if any(
                    k in c
                    for k in [
                        "posição",
                        "posicao",
                        "valor bruto",
                        "valor liquido",
                        "valor líquido",
                        "total",
                        "valor",
                    ]
                )
            ),
            None,
        )
        cat_col = next(
            (
                c
                for c in cols
                if any(k in c for k in ["categoria", "classe", "tipo", "mercado"])
            ),
            None,
        )

        if not name_col or not value_col:
            raise HTTPException(
                status_code=400,
                detail=f"Colunas obrigatórias não encontradas (Nome do Produto/Ativo e Valor Total). Colunas identificadas: {cols}",
            )

        # Helper para limpar formatação monetária brasileira
        def clean_br_val(val) -> float:
            if pd.isna(val):
                return 0.0
            if isinstance(val, (int, float)):
                return float(val)
            val_str = str(val).strip()
            # Remover símbolo de moeda, espaços e pontos de milhar, substituir vírgula por ponto
            val_str = val_str.replace("R$", "").replace(" ", "").replace("\xa0", "")
            if "," in val_str:
                val_str = val_str.replace(".", "").replace(",", ".")
            try:
                return float(val_str)
            except ValueError:
                return 0.0

        items_to_save = []
        total_asset_value = 0.0

        for _, row in df.iterrows():
            raw_name = row.get(name_col)
            if pd.isna(raw_name) or not str(raw_name).strip():
                continue
            name_str = str(raw_name).strip()

            # Ignorar cabeçalhos/rodapés com totais acumulados
            if name_str.lower().startswith("total") or name_str.lower().startswith(
                "resumo"
            ):
                continue

            raw_val = row.get(value_col)
            val = clean_br_val(raw_val)
            if val <= 0:
                # Ignorar ativos sem saldo
                continue

            raw_qty = row.get(qty_col) if qty_col else 1.0
            qty = clean_br_val(raw_qty)
            if qty == 0.0:
                qty = 1.0

            raw_price = row.get(price_col) if price_col else None
            price = (
                clean_br_val(raw_price)
                if raw_price is not None
                else (val / qty if qty else 0.0)
            )

            cat = (
                str(row.get(cat_col)).strip()
                if (cat_col and not pd.isna(row.get(cat_col)))
                else "Outros"
            )

            total_asset_value += val

            items_to_save.append(
                {
                    "name": name_str,
                    "quantity": qty,
                    "unit_price": price,
                    "total_value": val,
                    "category": cat,
                }
            )

        if not items_to_save:
            raise HTTPException(
                status_code=400,
                detail="Nenhum item válido pôde ser extraído da planilha da XP.",
            )

        # 4. Encontrar ou criar o ativo XP correspondente
        if asset_id:
            asset_check = (
                supabase.table("assets")
                .select("*")
                .eq("id", asset_id)
                .eq("user_id", user_id)
                .execute()
            )
            if not asset_check.data:
                raise HTTPException(
                    status_code=404,
                    detail="Ativo XP especificado não existe ou não pertence a você.",
                )
            asset = asset_check.data[0]
        else:
            # Buscar se já existe um ativo de tipo 'xp'
            xp_assets = (
                supabase.table("assets")
                .select("*")
                .eq("user_id", user_id)
                .eq("type", "xp")
                .execute()
            )
            if xp_assets.data:
                asset = xp_assets.data[0]
                asset_id = asset["id"]
            else:
                # Criar um novo ativo XP
                new_asset_data = {
                    "user_id": user_id,
                    "name": "XP Investimentos",
                    "type": "xp",
                }
                create_res = supabase.table("assets").insert(new_asset_data).execute()
                if not create_res.data:
                    raise HTTPException(
                        status_code=500,
                        detail="Falha ao criar ativo automático para XP.",
                    )
                asset = create_res.data[0]
                asset_id = asset["id"]

        # Associar itens au ativo
        for item in items_to_save:
            item["asset_id"] = asset_id

        # 5. Atualizar registros na tabela asset_items (deletar antigos e inserir novos)
        supabase.table("asset_items").delete().eq("asset_id", asset_id).execute()

        # Inserção em lotes de 100
        batch_size = 100
        for i in range(0, len(items_to_save), batch_size):
            batch = items_to_save[i : i + batch_size]
            supabase.table("asset_items").insert(batch).execute()

        # 6. Salvar somatório total no histórico de saldos para a data de hoje (UPSERT)
        today_str = date.today().isoformat()
        balance_history_data = {
            "asset_id": asset_id,
            "user_id": user_id,
            "balance": total_asset_value,
            "reference_date": today_str,
        }
        supabase.table("asset_balances_history").upsert(balance_history_data).execute()

        return {
            "message": "Planilha da XP importada com sucesso",
            "asset_id": asset_id,
            "total_value": total_asset_value,
            "items_count": len(items_to_save),
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Erro interno durante a importação: {str(e)}"
        )
