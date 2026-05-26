import { useState, useRef, useEffect } from 'react';
import { 
  Send, 
  Bot, 
  User, 
  Sparkles, 
  TrendingDown, 
  Lightbulb,
  AlertCircle,
  Loader2
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { cn } from '../lib/utils';
import { useAuth } from '../AuthContext';
import { chatWithAI } from '../services/geminiService';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export default function AIChat() {
  const { transactions } = useAuth();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: '¡Hola! Soy tu asistente financiero de Financiera Nova. Puedo ayudarte a analizar tus gastos, detectar suscripciones innecesarias o sugerirte planes de ahorro. ¿En qué puedo ayudarte hoy?',
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const chatHistory = messages.map(m => ({ 
        role: m.role, 
        content: m.content 
      }));
      chatHistory.push({ role: 'user', content: input });
      
      const response = await chatWithAI(chatHistory, transactions);
      
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error("Error in AI chat:", error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Lo siento, hubo un error al procesar tu mensaje. Por favor, inténtalo de nuevo.',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const suggestions = [
    { icon: TrendingDown, label: '¿Cómo puedo gastar menos?' },
    { icon: Lightbulb, label: 'Analiza mis suscripciones' },
    { icon: AlertCircle, label: '¿Me pasaré del presupuesto?' },
  ];

  return (
    <div className="flex flex-col h-[calc(100vh-12rem)] max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-zinc-900 flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-red-800" />
            Asistente Inteligente
          </h2>
          <p className="text-zinc-500 text-sm">Tu experto financiero personal disponible 24/7.</p>
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 glass-card overflow-hidden flex flex-col mb-4">
        <div 
          ref={scrollRef}
          className="flex-1 overflow-y-auto p-6 space-y-6 scroll-smooth"
        >
          {messages.map((msg) => (
            <div 
              key={msg.id}
              className={cn(
                "flex gap-4 max-w-[85%]",
                msg.role === 'user' ? "ml-auto flex-row-reverse" : ""
              )}
            >
              <div className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center shrink-0",
                msg.role === 'assistant' ? "bg-red-800 text-white" : "bg-zinc-200 text-zinc-600"
              )}>
                {msg.role === 'assistant' ? <Bot className="w-5 h-5" /> : <User className="w-5 h-5" />}
              </div>
              <div className={cn(
                "p-4 rounded-2xl text-sm leading-relaxed",
                msg.role === 'assistant' 
                  ? "bg-zinc-50 text-zinc-800 border border-zinc-100" 
                  : "bg-red-800 text-white shadow-md shadow-red-100"
              )}>
                <div className="markdown-body">
                  <ReactMarkdown>{msg.content}</ReactMarkdown>
                </div>
                <p className={cn(
                  "text-[10px] mt-2 font-medium",
                  msg.role === 'assistant' ? "text-zinc-400" : "text-red-100"
                )}>
                  {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex gap-4">
              <div className="w-8 h-8 rounded-full bg-red-800 text-white flex items-center justify-center">
                <Bot className="w-5 h-5" />
              </div>
              <div className="bg-zinc-50 p-4 rounded-2xl border border-zinc-100 flex items-center gap-2">
                <Loader2 className="w-4 h-4 text-red-800 animate-spin" />
                <span className="text-sm text-zinc-500">Analizando tus finanzas...</span>
              </div>
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="p-4 border-t border-zinc-100 bg-white">
          <div className="flex gap-2 mb-4 overflow-x-auto pb-2 no-scrollbar">
            {suggestions.map((s, i) => (
              <button 
                key={i}
                onClick={() => setInput(s.label)}
                className="flex items-center gap-2 px-3 py-1.5 bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 rounded-full text-xs font-medium text-zinc-600 whitespace-nowrap transition-all"
              >
                <s.icon className="w-3 h-3" />
                {s.label}
              </button>
            ))}
          </div>
          <div className="relative">
            <input 
              type="text" 
              placeholder="Pregúntame cualquier cosa sobre tus gastos..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              className="w-full pl-4 pr-12 py-3 bg-zinc-100 border-none rounded-2xl text-sm focus:ring-2 focus:ring-red-800 transition-all"
            />
            <button 
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-red-800 text-white rounded-xl hover:bg-red-900 disabled:opacity-50 disabled:hover:bg-red-800 transition-all"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
