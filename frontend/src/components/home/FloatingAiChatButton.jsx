import { Bot, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function FloatingAiChatButton() {
  const navigate = useNavigate();

  return (
    <div className="fixed bottom-6 right-6 z-40">
      <button
        onClick={() => navigate('/assistant')}
        title="Open AI Assistant"
        aria-label="Open AI Assistant"
        className="relative group w-12 h-12 rounded-full bg-[#EF4444] hover:bg-red-600 text-white flex items-center justify-center shadow-lg shadow-red-500/30 transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer ring-4 ring-red-400/20"
      >
        <Bot className="w-6 h-6 transition-transform group-hover:rotate-6" />
        <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-emerald-500 border-2 border-white rounded-full" />
      </button>
    </div>
  );
}

