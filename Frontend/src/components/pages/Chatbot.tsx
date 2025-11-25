import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { supabase } from '../../utils/supabase/client';
import { projectId } from '../../lib/info';
import { useAuth } from '../../App';
import { useSettings } from '../ui/SettingContext';
import { useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown'; // Import ReactMarkdown
import {
  Send,
  Brain,
  User,
  Lightbulb,
  TrendingUp,
  PieChart,
  DollarSign,
  Calendar,
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
    icon: DollarSign,
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

  const generateBotResponse = (userMessage: string): string => {
    const message = userMessage.toLowerCase();

    if (message.includes('food') || message.includes('dining')) {
      return "Based on your recent expenses, you spent $680 on food and dining this month. That's 15% more than last month. Your most frequent food expenses are lunch orders ($340) and dinner restaurants ($240). Consider meal prepping to reduce lunch costs!";
    }

    if (message.includes('trend') || message.includes('spending')) {
      return "Your spending trends show:\n• January: $2,000\n• February: $1,850\n• March: $2,100\n\nYou're spending 12% more this month, mainly due to increased dining and entertainment expenses. Your transportation costs have decreased by 8%.";
    }

    if (message.includes('budget')) {
      return "You're currently at 78% of your $2,500 monthly budget with 8 days remaining. You're on track to stay within budget! Your largest categories are Food (27%) and Transportation (18%). Consider reducing entertainment spending for the rest of the month.";
    }

    if (message.includes('group') || message.includes('split')) {
      return "Your group expense summary:\n• Weekend Trip: You owe $45.20\n• Roommates: You are owed $125.80\n• Work Lunch Group: You owe $12.30\n\nNet balance: +$68.30 in your favor. Don't forget to collect from your roommates!";
    }

    if (message.includes('save') || message.includes('tip')) {
      return "Here are personalized savings tips based on your spending:\n• Set up automatic transfers to savings on payday\n• Use the 24-hour rule for purchases over $50\n• Try cooking at home 2 more times per week\n• Consider carpooling to reduce transportation costs\n• Set spending alerts for your highest categories";
    }

    if (message.includes('category') || message.includes('biggest')) {
      return "Your biggest expense categories this month:\n1. Food & Dining: $680 (27%)\n2. Transportation: $450 (18%)\n3. Shopping: $390 (16%)\n4. Entertainment: $320 (13%)\n5. Utilities: $280 (11%)";
    }

    return "I understand you're asking about your finances. I can help you with spending analysis, budget tracking, expense categorization, and financial insights. Try asking about your spending trends, budget status, or specific expense categories!";
  };

  const handleSendMessage = async (content: string) => {
    if (!content.trim() || !user) return;

    // Check if data sharing is enabled
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

    // Optimistically update UI
    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsTyping(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        setIsTyping(false);
        return;
      }

      // --- NEW: Prepare History ---
      // Convert current messages to format expected by AI (role: 'user' | 'assistant')
      // We take the last 6 messages to give context without overloading the token limit
      const history = messages.slice(-6).map(msg => ({
        role: msg.type === 'user' ? 'user' : 'assistant',
        content: msg.content
      }));

      const response = await fetch('http://localhost:8000/api/ai/chat', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: content,
          history: history // Send history to backend
        }),
      });

      let botResponseContent = generateBotResponse(content); // Fallback

      if (response.ok) {
        const data = await response.json();
        botResponseContent = data.response;
      }

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

      // Fallback to local response
      const botResponse: Message = {
        id: (Date.now() + 1).toString(),
        type: 'bot',
        content: generateBotResponse(content),
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
                  // --- CHANGE HERE ---
                  // Added: dark:hover:bg-secondary and dark:hover:border-gray-500
                  className="h-auto p-3 flex flex-col gap-2 transition-all hover:shadow-md dark:hover:shadow-none dark:hover:bg-secondary dark:hover:border-gray-500"
                  // --- END CHANGE ---
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

                        {/* --- MODIFICATION START --- */}
                        {message.type === 'bot' ? (
                          <div className="prose dark:prose-invert prose-p:my-0 prose-ul:my-2 prose-li:my-0">
                            <ReactMarkdown>
                              {message.content}
                            </ReactMarkdown>
                          </div>
                        ) : (
                          <p className="whitespace-pre-line">{message.content}</p>
                        )}
                        {/* --- MODIFICATION END --- */}

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
