import { useState, useRef, useEffect } from 'react';
import { Card, CardContent} from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Avatar, AvatarFallback} from '../ui/avatar';
import { supabase } from '../../utils/supabase/client';
import { useAuth } from '../../App';
import { useSettings } from '../ui/SettingContext';
import { useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import {
  Send,
  Brain,
  User,
  Lightbulb,
  TrendingUp,
  PieChart,
  IndianRupee, // Changed DollarSign to IndianRupee
  Users,
  Shield
} from 'lucide-react';
import { ScrollArea } from '../ui/scroll-area';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../ui/alert-dialog';

interface Message {
  id: string;
  type: 'user' | 'bot';
  content: string;
  timestamp: Date;
  suggestions?: string[];
}

const initialMessages: Message[] = [
  {
    id: '1',
    type: 'bot',
    content: "Hi! I'm your AI financial assistant. I can help you analyze your spending, provide insights, and answer questions about your expenses. What would you like to know?",
    timestamp: new Date(),
    suggestions: [
      "How much did I spend on food this month?",
      "Show me my spending trends",
      "What's my biggest expense category?",
      "Give me savings tips"
    ]
  }
];

const quickActions = [
  {
    icon: PieChart,
    label: "Spending Breakdown",
    query: "Show me my spending breakdown by category this month"
  },
  {
    icon: TrendingUp,
    label: "Spending Trends",
    query: "What are my spending trends over the last 3 months?"
  },
  {
    icon: IndianRupee, // Changed DollarSign to IndianRupee
    label: "Monthly Budget",
    query: "How am I doing against my monthly budget?"
  },
  {
    icon: Users,
    label: "Group Expenses",
    query: "Show me my group expense summary"
  }
];

export function Chatbot() {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showDataSharingPopup, setShowDataSharingPopup] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();
  const { dataSharing } = useSettings();
  const navigate = useNavigate();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (content: string) => {
    if (!content.trim() || !user) return;
    if (!dataSharing) {
      setShowDataSharingPopup(true);
      return;
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: content.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsTyping(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        setIsTyping(false);
        return;
      }
      const history = messages.slice(-6).map(msg => ({
        role: msg.type === 'user' ? 'user' : 'assistant',
        content: msg.content
      }));

      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/ai/chat`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: content,
          history: history 
        }),
      });

      if (!response.ok) {
        throw new Error(`AI Server Error: ${response.status}`);
      }
      
      const data = await response.json();
      const botResponseContent = data.response;

      const botResponse: Message = {
        id: (Date.now() + 1).toString(),
        type: 'bot',
        content: botResponseContent,
        timestamp: new Date(),
        suggestions: content.toLowerCase().includes('tip') ? [
          "How can I reduce food expenses?",
          "Show me my savings progress",
          "Set up a budget reminder"
        ] : [
          "Tell me more about this category",
          "How does this compare to last month?",
          "Give me improvement suggestions"
        ]
      };

      setMessages(prev => [...prev, botResponse]);
    } catch (error) {
      console.error('Error sending message to AI:', error);

      const botResponse: Message = {
        id: (Date.now() + 1).toString(),
        type: 'bot',
        content: "I cannot respond currently, there is some issue. Please try again later.", 
        timestamp: new Date()
      };

      setMessages(prev => [...prev, botResponse]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    handleSendMessage(suggestion);
  };

  const handleQuickAction = (query: string) => {
    handleSendMessage(query);
  };

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto h-[calc(100vh-140px)] md:h-[calc(100vh-120px)]">
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
              <Brain className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold">AI Assistant</h1>
              <p className="text-muted-foreground">Your smart financial companion</p>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-4">
            {quickActions.map((action, index) => {
              const Icon = action.icon;
              return (
                <Button
                  key={index}
                  variant="outline"
                  className="h-auto p-3 flex flex-col gap-2 transition-all hover:shadow-md dark:hover:shadow-none dark:hover:bg-secondary dark:hover:border-gray-500"
                  onClick={() => handleQuickAction(action.query)}
                >
                  <Icon className="h-4 w-4" />
                  <span className="text-xs text-center">{action.label}</span>
                </Button>
              );
            })}
          </div>
        </div>

        {/* Chat Messages */}
        <Card className="flex-1 flex flex-col">
          <CardContent className="flex-1 p-0">
            <ScrollArea className="h-full p-4">
              <div className="space-y-4">
                {messages.map((message) => (
                  <div key={message.id} className={`flex gap-3 ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                    {message.type === 'bot' && (
                      <Avatar className="h-8 w-8 bg-primary/10">
                        <AvatarFallback>
                          <Brain className="h-4 w-4 text-primary" />
                        </AvatarFallback>
                      </Avatar>
                    )}

                    <div className={`max-w-[80%] ${message.type === 'user' ? 'order-last' : ''}`}>
                      <div className={`p-3 rounded-lg ${message.type === 'user'
                        ? 'bg-primary text-primary-foreground ml-auto'
                        : 'bg-muted'
                        }`}>

                        {message.type === 'bot' ? (
                          <div className="prose dark:prose-invert prose-p:my-0 prose-ul:my-2 prose-li:my-0">
                            <ReactMarkdown>
                              {message.content}
                            </ReactMarkdown>
                          </div>
                        ) : (
                          <p className="whitespace-pre-line">{message.content}</p>
                        )}

                      </div>

                      <div className={`flex items-center gap-2 mt-1 text-xs text-muted-foreground ${message.type === 'user' ? 'justify-end' : 'justify-start'
                        }`}>
                        <span>{message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>

                      {/* Suggestions */}
                      {message.suggestions && message.type === 'bot' && (
                        <div className="flex flex-wrap gap-2 mt-3">
                          {message.suggestions.map((suggestion, index) => (
                            <Button
                              key={index}
                              variant="outline"
                              size="sm"
                              className="text-xs h-7"
                              onClick={() => handleSuggestionClick(suggestion)}
                            >
                              {suggestion}
                            </Button>
                          ))}
                        </div>
                      )}
                    </div>

                    {message.type === 'user' && (
                      <Avatar className="h-8 w-8">
                        <AvatarFallback>
                          <User className="h-4 w-4" />
                        </AvatarFallback>
                      </Avatar>
                    )}
                  </div>
                ))}

                {/* Typing Indicator */}
                {isTyping && (
                  <div className="flex gap-3">
                    <Avatar className="h-8 w-8 bg-primary/10">
                      <AvatarFallback>
                        <Brain className="h-4 w-4 text-primary" />
                      </AvatarFallback>
                    </Avatar>
                    <div className="bg-muted p-3 rounded-lg">
                      <div className="flex gap-1">
                        <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>
          </CardContent>

          {/* Input */}
          <div className="border-t p-4">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage(inputValue);
              }}
              className="flex gap-2"
            >
              <Input
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Ask me about your expenses, budgets, or financial insights..."
                disabled={isTyping}
                className="flex-1"
              />
              <Button type="submit" size="icon" disabled={!inputValue.trim() || isTyping}>
                <Send className="h-4 w-4" />
              </Button>
            </form>

            <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
              <Lightbulb className="h-3 w-3" />
              <span>Try asking about spending trends, budget analysis, or savings tips</span>
            </div>
          </div>
        </Card>
      </div>

      {/* Data Sharing Popup */}
      <AlertDialog open={showDataSharingPopup} onOpenChange={setShowDataSharingPopup}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                <Shield className="h-5 w-5 text-orange-600" />
              </div>
              <AlertDialogTitle>Data Sharing Required</AlertDialogTitle>
            </div>
            <AlertDialogDescription>
              To use the AI Assistant, you need to enable data sharing in your settings. This allows us to analyze your expense data and provide personalized insights.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => navigate('/settings')}>
              Go to Settings
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}