# Configuração de E-mail Transacional (Resend)

Para o envio de e-mails de autenticação (como o Magic Link) com entrega garantida e domínio próprio, utilizamos o **Resend** integrado ao **Supabase Auth**.

---

## 1. Configuração do Domínio no Registro.br

Para autorizar o Resend a enviar e-mails em nome do seu domínio (ex: `salgado-finance-app.com.br`), é obrigatório configurar as seguintes entradas DNS no painel do **Registro.br**:

### A. Registro MX (Mail Exchanger)
Necessário para a rota de recebimento e reputação do domínio:

| Tipo | Nome (Host) | Valor (Aponta para) | Prioridade |
| :--- | :--- | :--- | :--- |
| `MX` | `@` (ou vazio) | `feedback-smtp.us-east-1.amazonses.com` | `10` |

### B. Registro TXT (SPF - Sender Policy Framework)
Autoriza os servidores do Resend/AWS SES a enviarem mensagens pelo seu domínio:

| Tipo | Nome (Host) | Valor |
| :--- | :--- | :--- |
| `TXT` | `@` (ou vazio) | `v=spf1 include:amazonses.com ~all` |

> [!NOTE]
> Se você já tiver outro registro SPF configurado para o seu domínio (ex: do Google Workspace), combine-os em uma única linha, por exemplo:
> `v=spf1 include:_spf.google.com include:amazonses.com ~all`

### C. Registros CNAME (DKIM - DomainKeys Identified Mail)
O Resend gera 3 registros de DKIM do tipo CNAME para assinatura criptográfica e validação de autenticidade das mensagens:

| Tipo | Nome (Host) | Valor |
| :--- | :--- | :--- |
| `CNAME` | `resend1._domainkey` | `resend1._domainkey.resend.com` |
| `CNAME` | `resend2._domainkey` | `resend2._domainkey.resend.com` |
| `CNAME` | `resend3._domainkey` | `resend3._domainkey.resend.com` |

### D. Registro TXT (DMARC - Domain-based Message Authentication)
Protege o domínio contra falsificação de e-mails (spoofing) e phishing:

| Tipo | Nome (Host) | Valor |
| :--- | :--- | :--- |
| `TXT` | `_dmarc` | `v=DMARC1; p=quarantine; pct=100; rua=mailto:dmarc@seudominio.com.br` |

---

## 2. Integração SMTP no Supabase Auth

Após os registros DNS serem verificados e marcados como `Verified` no painel do Resend, configure a integração no painel do Supabase para substituir o serviço de e-mail padrão (que tem limite de 3 e-mails por hora).

### Caminho no Painel Supabase:
Acesse **Project Settings** > **Auth** > **SMTP Settings**.

### Configurações do Servidor:

Ative o botão **"Enable Custom SMTP"** e insira as seguintes credenciais:

| Campo | Valor Recomendado | Observações |
| :--- | :--- | :--- |
| **Sender Email** | `no-reply@salgado-finance-app.com.br` | Deve usar o domínio verificado no Resend. |
| **Sender Name** | `FinanceApp` | Nome que o usuário verá na caixa de entrada. |
| **SMTP Host** | `smtp.resend.com` | Servidor SMTP do Resend. |
| **Port** | `587` | Porta para conexões TLS seguras. |
| **Username** | `resend` | Usuário estático definido pelo Resend. |
| **Password** | `re_123456789...` | Sua **API Key** gerada no painel do Resend. |

> [!IMPORTANT]
> Certifique-se de que a API Key criada no Resend tenha a permissão `Sending` ativa para permitir o disparo de e-mails transacionais.
