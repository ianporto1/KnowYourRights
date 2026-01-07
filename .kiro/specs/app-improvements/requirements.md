# Requirements Document

## Introduction

Este documento define os requisitos para melhorias no Global Rights Guide, incluindo: melhorias visuais e de UX no app público, painel administrativo para gerenciamento de conteúdo, e chat inteligente com RAG usando AgentRouter para consultas em linguagem natural sobre leis de diferentes países.

## Glossary

- **App**: O aplicativo Global Rights Guide
- **Admin_Panel**: Interface administrativa para gerenciamento de conteúdo
- **Chat_Widget**: Componente de chat flutuante para consultas em linguagem natural
- **AgentRouter**: Serviço de gateway/proxy para APIs de LLMs (agentrouter.org)
- **RAG**: Retrieval-Augmented Generation - técnica que busca dados relevantes antes de consultar o LLM
- **Cartilha_Entry**: Entrada de dados sobre um tópico específico de um país
- **Status**: Classificação de uma lei (green=permitido, yellow=restrições, red=proibido)
- **Freedom_Index**: Índice de liberdade de um país (0-10)

## Requirements

### Requirement 1: Melhorias Visuais na Home

**User Story:** As a user, I want to see a more informative home page, so that I can quickly understand the status of each country before clicking.

#### Acceptance Criteria

1. WHEN the home page loads, THE App SHALL display a summary badge on each country card showing the count of green, yellow, and red entries
2. WHEN a user hovers over a country card, THE App SHALL display a tooltip with the top 3 most relevant topics for that country
3. THE App SHALL provide a filter slider to filter countries by freedom index range
4. THE App SHALL provide sorting options to order countries by name, freedom index ascending, or freedom index descending
5. THE App SHALL display skeleton loading placeholders while fetching country data

### Requirement 2: Melhorias na Página do País

**User Story:** As a user, I want to have a better overview and navigation on the country page, so that I can find information faster.

#### Acceptance Criteria

1. WHEN the country page loads, THE App SHALL display a donut chart showing the percentage distribution of green, yellow, and red entries
2. THE App SHALL provide a search input to filter topics by keyword within the current country
3. WHEN a user clicks on a topic card, THE App SHALL expand the card to show full details including legal basis and cultural notes
4. THE App SHALL provide a "Compare with another country" button on each topic card
5. THE App SHALL provide navigation arrows to go to the previous or next country without returning to home
6. WHEN a user clicks the share button on a topic, THE App SHALL copy a direct link to that specific topic to the clipboard

### Requirement 3: Melhorias na Página de Comparação

**User Story:** As a user, I want to filter and share comparisons, so that I can focus on relevant differences and share findings.

#### Acceptance Criteria

1. THE App SHALL provide a category filter to show only topics from a specific category in the comparison
2. THE App SHALL provide a "Show only differences" toggle that hides rows where all countries have the same status
3. WHEN countries are selected, THE App SHALL update the URL with query parameters reflecting the selection
4. WHEN a user visits a comparison URL with country parameters, THE App SHALL automatically load and display that comparison

### Requirement 4: Dark Mode Toggle

**User Story:** As a user, I want to toggle between light and dark mode, so that I can use the app comfortably in different lighting conditions.

#### Acceptance Criteria

1. THE App SHALL display a theme toggle button in the header of all pages
2. WHEN a user clicks the theme toggle, THE App SHALL switch between light and dark mode immediately
3. THE App SHALL persist the user's theme preference in localStorage
4. WHEN the app loads, THE App SHALL apply the saved theme preference or default to system preference

### Requirement 5: Painel Administrativo - Autenticação

**User Story:** As an admin, I want to securely log in to the admin panel, so that I can manage content.

#### Acceptance Criteria

1. THE Admin_Panel SHALL be accessible only at the /admin route
2. WHEN an unauthenticated user accesses /admin, THE Admin_Panel SHALL redirect to a login page
3. THE Admin_Panel SHALL authenticate users via Supabase Auth with email and password
4. WHEN authentication succeeds, THE Admin_Panel SHALL redirect to the admin dashboard
5. IF authentication fails, THEN THE Admin_Panel SHALL display an error message and remain on the login page
6. THE Admin_Panel SHALL provide a logout button that ends the session and redirects to login

### Requirement 6: Painel Administrativo - CRUD de Países

**User Story:** As an admin, I want to manage countries, so that I can add new countries or update existing ones.

#### Acceptance Criteria

1. THE Admin_Panel SHALL display a list of all countries with their code, name, flag, and freedom index
2. THE Admin_Panel SHALL provide a form to create a new country with code, name, flag emoji, and freedom index
3. THE Admin_Panel SHALL provide a form to edit an existing country's name, flag, and freedom index
4. THE Admin_Panel SHALL provide a delete button for each country with a confirmation dialog
5. WHEN a country is deleted, THE Admin_Panel SHALL also delete all associated cartilha entries

### Requirement 7: Painel Administrativo - CRUD de Categorias

**User Story:** As an admin, I want to manage categories, so that I can organize topics properly.

#### Acceptance Criteria

1. THE Admin_Panel SHALL display a list of all categories with their slug, name, and icon
2. THE Admin_Panel SHALL provide a form to create a new category with slug, name, and icon emoji
3. THE Admin_Panel SHALL provide a form to edit an existing category's name and icon
4. THE Admin_Panel SHALL provide a delete button for each category with a confirmation dialog
5. IF a category has associated entries, THEN THE Admin_Panel SHALL prevent deletion and display a warning

### Requirement 8: Painel Administrativo - CRUD de Entradas

**User Story:** As an admin, I want to manage cartilha entries, so that I can keep the legal information up to date.

#### Acceptance Criteria

1. THE Admin_Panel SHALL display a filterable list of all entries with country, category, topic, and status
2. THE Admin_Panel SHALL provide filters to view entries by country and by category
3. THE Admin_Panel SHALL provide a form to create a new entry with country, category, topic, status, legal basis, plain explanation, and optional cultural note
4. THE Admin_Panel SHALL provide a form to edit all fields of an existing entry
5. THE Admin_Panel SHALL provide a delete button for each entry with a confirmation dialog
6. WHEN an entry is saved, THE Admin_Panel SHALL automatically update the last_updated timestamp

### Requirement 9: Chat Widget - Interface

**User Story:** As a user, I want to access a chat interface, so that I can ask questions about laws in natural language.

#### Acceptance Criteria

1. THE Chat_Widget SHALL display as a floating button in the bottom-right corner of all public pages
2. WHEN a user clicks the chat button, THE Chat_Widget SHALL open a chat panel with a message input
3. THE Chat_Widget SHALL display suggested questions based on the current page context
4. WHEN on a country page, THE Chat_Widget SHALL pre-fill context with the current country
5. THE Chat_Widget SHALL maintain conversation history within the current session
6. THE Chat_Widget SHALL provide a button to close the chat panel
7. THE Chat_Widget SHALL provide a button to clear conversation history

### Requirement 10: Chat Widget - RAG Integration

**User Story:** As a user, I want the chat to answer based on actual data, so that I get accurate information about laws.

#### Acceptance Criteria

1. WHEN a user sends a message, THE Chat_Widget SHALL extract relevant keywords from the question
2. THE Chat_Widget SHALL query Supabase to retrieve cartilha entries matching the extracted keywords
3. THE Chat_Widget SHALL construct a prompt including the retrieved context and the user's question
4. THE Chat_Widget SHALL send the prompt to AgentRouter API for LLM processing
5. THE Chat_Widget SHALL display the LLM response formatted with markdown support
6. IF no relevant data is found, THEN THE Chat_Widget SHALL suggest the user explore the app manually
7. WHILE waiting for a response, THE Chat_Widget SHALL display a loading indicator

### Requirement 11: Chat Widget - AgentRouter Integration

**User Story:** As a developer, I want to integrate with AgentRouter, so that I can leverage LLM capabilities without vendor lock-in.

#### Acceptance Criteria

1. THE App SHALL use AgentRouter as the base URL for Anthropic API calls
2. THE App SHALL securely store the AgentRouter API key in environment variables
3. THE App SHALL handle API errors gracefully and display user-friendly error messages
4. THE App SHALL implement rate limiting to prevent abuse of the chat feature
5. IF the AgentRouter API is unavailable, THEN THE Chat_Widget SHALL display a fallback message suggesting manual exploration

