---
inclusion: always
---

# Supabase MCP Integration

Este projeto utiliza Supabase como backend. Sempre que precisar interagir com banco de dados, autenticação, storage ou funcionalidades realtime, utilize o MCP do Supabase.

## Quando usar o Supabase MCP

- Operações de banco de dados (queries, migrations, schemas)
- Configuração e gerenciamento de autenticação
- Upload e gerenciamento de arquivos no Storage
- Implementação de funcionalidades realtime
- Criação e modificação de RLS policies
- Deploy de Edge Functions

## Como usar

Antes de executar qualquer ação com Supabase:

1. Ative o power `supabase-hosted`
2. Leia o steering file `supabase-hosted-database-workflow.md` para entender o fluxo de trabalho
3. Para setup inicial, consulte `supabase-hosted-onboarding.md`

## Steering files disponíveis no power

- `supabase-hosted-database-workflow.md` - Fluxo de trabalho com banco de dados
- `supabase-hosted-onboarding.md` - Setup inicial e troubleshooting
- `supabase-prompts-code-format-sql.md` - Formatação de SQL
- `supabase-prompts-edge-functions.md` - Edge Functions (TypeScript/Deno)
- `supabase-prompts-database-rls-policies.md` - Políticas RLS
- `supabase-prompts-database-functions.md` - Funções PostgreSQL
- `supabase-prompts-nextjs-supabase-auth.md` - Autenticação Next.js com SSR
- `supabase-prompts-use-realtime.md` - Funcionalidades realtime

## Boas práticas

- Sempre use migrations para alterações de schema
- Implemente RLS policies para segurança dos dados
- Utilize tipos TypeScript gerados pelo Supabase CLI
- Prefira Edge Functions para lógica server-side
