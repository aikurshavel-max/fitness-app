import { useState, useEffect } from 'react';
import { generateAssistantMessages } from '../ai/assistant';
import type { AssistantMessage } from '../ai/assistant';
import { Sparkles, RefreshCw } from 'lucide-react';

export default function AIAssistant() {
  const [messages, setMessages] = useState<AssistantMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadMessages = async () => {
    setIsLoading(true);
    const msgs = await generateAssistantMessages();
    setMessages(msgs);
    setIsLoading(false);
  };

  useEffect(() => {
    loadMessages();
  }, []);

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
        <button
          onClick={loadMessages}
          className="text-gray-400 hover:text-primary transition-colors"
          disabled={isLoading}
        >
          <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
        </button>
      </div>

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
    </div>
  );
}