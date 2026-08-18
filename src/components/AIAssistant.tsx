import { useState, useEffect, useCallback } from 'react';
import { generateAssistantMessages, generateWeeklyReport } from '../ai/assistant';
import type { AssistantMessage } from '../ai/assistant';
import { Sparkles, RefreshCw, CalendarRange } from 'lucide-react';

export default function AIAssistant() {
  const [messages, setMessages] = useState<AssistantMessage[]>([]);
  const [weeklyReport, setWeeklyReport] = useState<AssistantMessage | null>(null);
  const [showWeekly, setShowWeekly] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const loadMessages = useCallback(async () => {
    setIsLoading(true);
    try {
      const msgs = await generateAssistantMessages();
      setMessages(msgs);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadWeeklyReport = useCallback(async () => {
    const report = await generateWeeklyReport();
    setWeeklyReport(report);
    setShowWeekly(true);
  }, []);

  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  const getMessageStyles = (type: AssistantMessage['type']) => {
    switch (type) {
      case 'praise':
        return 'bg-green-50 border-green-200';
      case 'warning':
        return 'bg-orange-50 border-orange-200';
      case 'tip':
        return 'bg-blue-50 border-blue-200';
      case 'motivation':
        return 'bg-purple-50 border-purple-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-md p-4 mb-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Sparkles className="text-primary" size={20} />
          <h2 className="font-semibold text-gray-800">AI-асистент</h2>
        </div>
        <div className="flex gap-2">
          <button
            onClick={loadWeeklyReport}
            className="text-xs px-2 py-1 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors flex items-center gap-1"
          >
            <CalendarRange size={14} />
            Тижневий звіт
          </button>
          <button
            onClick={loadMessages}
            className="text-gray-400 hover:text-primary transition-colors"
            disabled={isLoading}
          >
            <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {showWeekly && weeklyReport ? (
        <div className="mb-3">
          <div className="border rounded-xl p-3 bg-indigo-50 border-indigo-200">
            <div className="flex items-start gap-2">
              <span className="text-lg">{weeklyReport.icon}</span>
              <div className="flex-1">
                <p className="text-sm text-gray-700 whitespace-pre-line">{weeklyReport.text}</p>
                <button
                  onClick={() => setShowWeekly(false)}
                  className="mt-2 text-xs text-indigo-500 underline"
                >
                  Сховати звіт
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <>
          {isLoading ? (
            <div className="text-center py-8">
              <p className="text-gray-400">Аналізую дані...</p>
            </div>
          ) : (
            <div className="space-y-2">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`border rounded-xl p-3 ${getMessageStyles(message.type)}`}
                >
                  <div className="flex items-start gap-2">
                    <span className="text-lg">{message.icon}</span>
                    <p className="text-sm text-gray-700">{message.text}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}