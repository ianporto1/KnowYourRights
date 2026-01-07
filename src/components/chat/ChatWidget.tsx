'use client';

import { useState, useRef, useEffect } from 'react';
import { ChatMessage } from './ChatMessage';
import { ChatSuggestions } from './ChatSuggestions';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface ChatWidgetProps {
  context?: {
    countryCode?: string;
    countryName?: string;
  };
}

export function ChatWidget({ context }: ChatWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const suggestions = context?.countryCode
    ? [
        `Posso beijar em público em ${context.countryName || context.countryCode}?`,
        `O que é proibido em ${context.countryName || context.countryCode}?`,
        `Posso criticar o governo em ${context.countryName || context.countryCode}?`,
      ]
    : [
        'Onde posso consumir maconha legalmente?',
        'Quais países permitem beijo homoafetivo em público?',
        'Compare liberdade de expressão: Brasil vs Emirados',
        'O que é proibido no Japão?',
      ];

  const sendMessage = async (text: string) => {
    if (!text.trim() || loading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: text,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          context: context,
          history: messages.slice(-6), // Last 6 messages for context
        }),
      });

      const data = await response.json();

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.message || 'Desculpe, não consegui processar sua pergunta.',
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Desculpe, ocorreu um erro. Tente novamente mais tarde.',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    }

    setLoading(false);
  };

  const clearHistory = () => {
    setMessages([]);
  };

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full shadow-lg flex items-center justify-center text-2xl transition-transform hover:scale-110 z-50"
        aria-label="Abrir chat"
      >
        {isOpen ? '✕' : '💬'}
      </button>

      {/* Chat Panel */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 w-96 max-w-[calc(100vw-3rem)] h-[500px] max-h-[calc(100vh-8rem)] bg-white dark:bg-gray-800 rounded-2xl shadow-2xl flex flex-col z-50 border border-gray-200 dark:border-gray-700">
          {/* Header */}
          <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
            <div>
              <h3 className="font-semibold">💬 Assistente</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Pergunte sobre leis de qualquer país
              </p>
            </div>
            <button
              onClick={clearHistory}
              className="text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
              title="Limpar histórico"
            >
              🗑️ Limpar
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 && (
              <div className="text-center py-6">
                <span className="text-4xl mb-3 block">🌍</span>
                <p className="text-gray-600 dark:text-gray-300 text-sm font-medium mb-2">
                  Olá! Sou o assistente do Global Rights Guide
                </p>
                <p className="text-gray-500 dark:text-gray-400 text-xs mb-4">
                  Posso ajudar com informações sobre leis e direitos em diferentes países. Experimente perguntar:
                </p>
                <ChatSuggestions
                  suggestions={suggestions}
                  onSelect={(s) => sendMessage(s)}
                />
              </div>
            )}

            {messages.map((msg) => (
              <ChatMessage key={msg.id} role={msg.role} content={msg.content} timestamp={msg.timestamp} />
            ))}

            {loading && (
              <div className="flex items-center gap-2 text-gray-500">
                <span className="animate-pulse">●</span>
                <span className="animate-pulse delay-100">●</span>
                <span className="animate-pulse delay-200">●</span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-4 border-t border-gray-200 dark:border-gray-700">
            <p className="text-[10px] text-gray-400 dark:text-gray-500 text-center mb-2">
              ⚠️ Informação educacional, não é aconselhamento jurídico
            </p>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                sendMessage(input);
              }}
              className="flex gap-2"
            >
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Digite sua pergunta..."
                className="flex-1 px-4 py-2 rounded-full border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                disabled={loading}
              />
              <button
                type="submit"
                disabled={loading || !input.trim()}
                className="px-4 py-2 bg-indigo-600 text-white rounded-full hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                ➤
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
