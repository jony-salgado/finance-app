# FinançasApp

Aplicação para gestão de finanças pessoais e Open Finance.

## Estrutura do Projeto

O projeto foi refatorado para seguir as melhores práticas de organização de código.

### Backend (FastAPI)

Localizado na pasta `/backend`.
- `app/main.py`: Ponto de entrada da aplicação.
- `app/api/`: Contém as rotas da API organizadas por módulos.
- `app/schemas/`: Definições de modelos Pydantic.
- `app/db/`: Simulação do banco de dados (atualmente em memória).

Para rodar o backend:
```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload
```

### Frontend (Angular)

Localizado na pasta `/frontend`.
- `src/app/components/`: Componentes de UI reutilizáveis.
- `src/app/services/`: Serviços para lógica de negócio e integração com a API.
- `src/app/models/`: Interfaces TypeScript.
- `src/app/app.component.*`: Componente principal.

Para rodar o frontend:
```bash
cd frontend
npm install
npm start
```

## Próximos Passos
- Implementar integração real com banco de dados (PostgreSQL/MongoDB).
- Conectar o frontend à API do backend (atualmente usando mock data no serviço).
- Adicionar autenticação de usuários.
- Implementar integração real com Open Finance.
