import { ArrowUpRight, Bot, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../common/Button';
import { Card } from '../common/Card';

const SAMPLE_QUESTIONS = [
  'Which shift has the highest overtime?',
  'Which team has the highest production output?',
  'Compare production efficiency across shifts',
  'What is the current training compliance rate?',
];

export function AIInsightsCard() {
  const navigate = useNavigate();

  return (
    <Card className="p-4 flex flex-col justify-between relative overflow-hidden" style={{ background: 'linear-gradient(135deg, var(--surface) 65%, var(--purple-soft) 100%)' }}>
      <div>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="w-7 h-7 rounded-lg grid place-items-center" style={{ background: 'var(--purple-soft)', color: '#493287' }}>
              <Bot className="w-4 h-4" />
            </span>
            <h3 className="text-[13px] font-bold text-[var(--foreground)]">AI Workforce Insights</h3>
          </div>
          <span className="text-[9px] font-semibold px-2 py-0.5 rounded-full" style={{ background: 'var(--purple-soft)', color: '#493287' }}>
            <Sparkles className="w-2.5 h-2.5 inline mr-1" /> LangChain Agent
          </span>
        </div>

        <p className="text-[11px] muted leading-relaxed mb-3">
          Ask conversational questions about manpower availability, overtime trends, team production output, shift efficiency, and skill compliance.
        </p>

        <div className="space-y-1.5 mb-3">
          {SAMPLE_QUESTIONS.map((question) => (
            <button
              key={question}
              type="button"
              onClick={() => navigate('/assistant')}
              className="w-full text-left p-2 rounded-lg border text-[10px] font-medium transition-colors hover:bg-[var(--muted-fill)] flex items-center justify-between group cursor-pointer"
              style={{ borderColor: 'var(--border)' }}
            >
              <span className="truncate">{question}</span>
              <ArrowUpRight className="w-3 h-3 muted group-hover:text-purple-600 shrink-0 ml-1.5 transition-colors" />
            </button>
          ))}
        </div>
      </div>

      <div className="pt-2 border-t flex items-center justify-between" style={{ borderColor: 'var(--border)' }}>
        <span className="text-[10px] muted">Grounded in live PostgreSQL records</span>
        <Button
          variant="primary"
          size="sm"
          onClick={() => navigate('/assistant')}
          className="text-[10px] py-1 px-3 shadow-xs"
        >
          Open AI Assistance <ArrowUpRight className="w-3 h-3 inline ml-1" />
        </Button>
      </div>
    </Card>
  );
}

