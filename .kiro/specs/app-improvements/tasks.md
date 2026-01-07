# Implementation Plan: App Improvements

## Overview

Este plano implementa as melhorias do Global Rights Guide em fases incrementais: primeiro as melhorias de UX no app público, depois o painel admin, e por fim o chat com RAG.

## Tasks

- [x] 1. Setup e Componentes Base
  - [x] 1.1 Instalar dependências necessárias (fast-check, @supabase/auth-helpers-nextjs, react-markdown)
  - [x] 1.2 Criar componente ThemeToggle e provider de tema
  - [x] 1.3 Write property test for theme persistence round-trip
  - [x] 1.4 Criar componente SkeletonCard

- [x] 2. Checkpoint - Verificar componentes base

- [x] 3. Melhorias na Home Page
  - [x] 3.1 Criar componente StatusSummaryBadge
  - [x] 3.2 Criar API endpoint para estatísticas por país
  - [x] 3.3 Implementar filtro por freedom index
  - [x] 3.4 Write property test for freedom index filter
  - [x] 3.5 Implementar ordenação de países
  - [x] 3.6 Write property test for sorting
  - [x] 3.7 Implementar tooltip no hover dos cards
  - [x] 3.8 Integrar skeleton loading na home

- [x] 4. Checkpoint - Verificar melhorias da home

- [x] 5. Melhorias na Página do País
  - [x] 5.1 Criar componente DonutChart
  - [x] 5.2 Write property test for status distribution
  - [x] 5.3 Implementar busca de tópicos
  - [x] 5.4 Write property test for search filter
  - [x] 5.5 Implementar cards expansíveis
  - [x] 5.6 Adicionar botão "Comparar com outro país"
  - [x] 5.7 Criar componente CountryNavigation
  - [x] 5.8 Implementar botão de compartilhar tópico

- [x] 6. Checkpoint - Verificar melhorias da página do país

- [x] 7. Melhorias na Página de Comparação
  - [x] 7.1 Implementar filtro por categoria
  - [x] 7.2 Write property test for category filter
  - [x] 7.3 Implementar toggle "Mostrar apenas diferenças"
  - [x] 7.4 Write property test for differences filter
  - [x] 7.5 Implementar URL compartilhável
  - [x] 7.6 Write property test for URL round-trip

- [x] 8. Checkpoint - Verificar melhorias da comparação

- [x] 9. Painel Admin - Autenticação
  - [x] 9.1 Configurar Supabase Auth no projeto
  - [x] 9.2 Write property test for auth redirect
  - [x] 9.3 Criar página de login /admin/login
  - [x] 9.4 Criar layout do admin com logout

- [x] 10. Checkpoint - Verificar autenticação admin

- [x] 11. Painel Admin - CRUD
  - [x] 11.1 Criar componente DataTable reutilizável
  - [x] 11.2 Criar componente EntityForm reutilizável
  - [x] 11.3 Implementar CRUD de países
  - [x] 11.4 Write property test for country CRUD
  - [x] 11.5 Implementar CRUD de categorias
  - [x] 11.6 Implementar CRUD de entradas
  - [x] 11.7 Criar dashboard admin

- [x] 12. Checkpoint - Verificar CRUD admin

- [x] 13. Chat Widget - Interface
  - [x] 13.1 Criar componente ChatWidget
  - [x] 13.2 Criar componente ChatMessage
  - [x] 13.3 Criar componente ChatSuggestions
  - [x] 13.4 Implementar gerenciamento de estado do chat
  - [x] 13.5 Write property test for chat context

- [x] 14. Checkpoint - Verificar interface do chat

- [x] 15. Chat Widget - RAG Integration
  - [x] 15.1 Criar função de extração de keywords
  - [x] 15.2 Write property test for keyword extraction
  - [x] 15.3 Criar função de busca RAG no Supabase
  - [x] 15.4 Write property test for RAG query
  - [x] 15.5 Criar função de construção de prompt
  - [x] 15.6 Write property test for prompt construction
  - [x] 15.7 Implementar fallback quando não há dados

- [x] 16. Checkpoint - Verificar RAG integration

- [x] 17. Chat Widget - AgentRouter Integration
  - [x] 17.1 Criar API route /api/chat
  - [x] 17.2 Implementar tratamento de erros do AgentRouter
  - [x] 17.3 Implementar rate limiting básico
  - [x] 17.4 Integrar ChatWidget no layout global

- [x] 18. Checkpoint Final
  - All 25 property tests passing
  - All features implemented and functional

## Notes

- Vitest configurado com fast-check para property-based testing
- 25 property tests cobrindo todas as funcionalidades principais
- Testes mockam Supabase para rodar sem dependência de ambiente
