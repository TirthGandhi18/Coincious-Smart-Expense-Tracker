import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Badge } from '../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../ui/accordion';
import { 
  HelpCircle,
  MessageCircle,
  Phone,
  Mail,
  FileText,
  Search,
  ExternalLink,
  Clock,
  CheckCircle,
  AlertCircle,
  Book,
  Video,
  MessageSquare,
  Send,
  Star
} from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { toast } from 'sonner';

// Mock data
const faqCategories = [
  {
    id: 'getting-started',
    title: 'Getting Started',
    icon: Book,
    questions: [
      {
        question: 'How do I create my first expense group?',
        answer: 'To create a group, go to the Groups page and click "Create Group". Enter a name and description, then invite members by email. You can start adding expenses once your group is set up.'
      },
      {
        question: 'How do I add an expense?',
        answer: 'Click the "Add Expense" button from the dashboard or within a group. Fill in the expense details, choose how to split it (equally, by percentage, or custom amounts), and select who to split with.'
      },
      {
        question: 'Can I split expenses unequally?',
        answer: 'Yes! When adding an expense, you can choose from three split methods: equal split, percentage-based split, or custom amounts where you specify exactly how much each person owes.'
      }
    ]
  },
  {
    id: 'groups-splitting',
    title: 'Groups & Splitting',
    icon: MessageCircle,
    questions: [
      {
        question: 'How do I settle up with someone?',
        answer: 'Go to the group or your notifications to see outstanding balances. Click "Settle Up" and confirm the payment. You can mark it as paid through the app or use external payment methods.'
      },
      {
        question: 'Can I edit an expense after adding it?',
        answer: 'Yes, you can edit expenses from the group detail page. Click on the expense and select "Edit". Note that changes may affect how the expense is split among group members.'
      },
      {
        question: 'How do I leave a group?',
        answer: 'You can leave a group from the group settings menu. Make sure all your balances are settled before leaving. Group admins can also remove members if needed.'
      }
    ]
  },
  {
    id: 'ai-features',
    title: 'AI Features',
    icon: MessageSquare,
    questions: [
      {
        question: 'How does the AI assistant work?',
        answer: 'Our AI assistant analyzes your spending patterns and provides personalized insights. Ask questions about your expenses, get budgeting tips, or request spending analysis in natural language.'
      },
      {
        question: 'What kind of insights can I get?',
        answer: 'The AI can show spending trends, category breakdowns, budget progress, suggest savings opportunities, and provide personalized financial advice based on your spending habits.'
      },
      {
        question: 'Is my financial data secure with AI analysis?',
        answer: 'Yes, all AI analysis is performed securely and your personal financial data is encrypted and protected. We never share your individual spending details with third parties.'
      }
    ]
  },
  {
    id: 'parental-controls',
    title: 'Parental Controls',
    icon: AlertCircle,
    questions: [
      {
        question: 'How do I set up parental monitoring?',
        answer: 'Parents can create accounts and link their children\'s accounts for monitoring. Set spending limits, approve large purchases, and receive alerts about spending activity.'
      },
      {
        question: 'Can I set spending limits for my child?',
        answer: 'Yes, you can set daily, weekly, or monthly spending limits by category or overall. You\'ll receive notifications when limits are approached or exceeded.'
      },
      {
        question: 'What notifications will I receive as a parent?',
        answer: 'You\'ll get alerts for large purchases, spending limit warnings, unusual activity, and requests for approval on purchases above your set threshold.'
      }
    ]
  }
];

const supportChannels = [
  {
    icon: MessageCircle,
    title: 'Live Chat',
    description: 'Chat with our support team',
    availability: 'Available 24/7',
    status: 'online'
  },
  {
    icon: Mail,
    title: 'Email Support',
    description: 'Get help via email',
    availability: 'Response within 24 hours',
    status: 'online'
  },
  {
    icon: Phone,
    title: 'Phone Support',
    description: 'Speak with an expert',
    availability: 'Mon-Fri 9AM-6PM EST',
    status: 'offline'
  }
];

const helpResources = [
  {
    icon: Book,
    title: 'User Guide',
    description: 'Complete guide to using Smart Expense',
    type: 'Documentation'
  },
  {
    icon: Video,
    title: 'Video Tutorials',
    description: 'Learn with step-by-step videos',
    type: 'Video'
  },
  {
    icon: FileText,
    title: 'API Documentation',
    description: 'For developers and integrations',
    type: 'Technical'
  }
];

export function Support() {
  const [activeTab, setActiveTab] = useState('faq');
  const [searchTerm, setSearchTerm] = useState('');
  const [ticketForm, setTicketForm] = useState({
    subject: '',
    category: '',
    priority: '',
    message: ''
  });

  const handleTicketSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!ticketForm.subject || !ticketForm.category || !ticketForm.message) {
      toast.error('Please fill in all required fields');
      return;
    }

    toast.success('Support ticket submitted successfully!');
    setTicketForm({ subject: '', category: '', priority: '', message: '' });
  };

  const filteredFAQs = faqCategories.map(category => ({
    ...category,
    questions: category.questions.filter(q =>
      q.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
      q.answer.toLowerCase().includes(searchTerm.toLowerCase())
    )
  })).filter(category => category.questions.length > 0);

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="flex items-center justify-center gap-3 mb-4">
          <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
            <HelpCircle className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Help & Support</h1>
            <p className="text-muted-foreground">Get the help you need, when you need it</p>
          </div>
        </div>
      </div>

      {/* Support Channels */}
      <div className="grid md:grid-cols-3 gap-4 mb-8">
        {supportChannels.map((channel, index) => {
          const Icon = channel.icon;
          return (
            <Card key={index} className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardContent className="p-6 text-center">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 ${
                  channel.status === 'online' ? 'bg-green-100 dark:bg-green-900/20' : 'bg-gray-100 dark:bg-gray-900/20'
                }`}>
                  <Icon className={`h-6 w-6 ${
                    channel.status === 'online' ? 'text-green-600' : 'text-gray-600'
                  }`} />
                </div>
                <h3 className="font-medium mb-2">{channel.title}</h3>
                <p className="text-sm text-muted-foreground mb-3">{channel.description}</p>
                <div className="flex items-center justify-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${
                    channel.status === 'online' ? 'bg-green-500' : 'bg-gray-400'
                  }`} />
                  <span className="text-xs text-muted-foreground">{channel.availability}</span>
                </div>
                <Button className="w-full mt-4" disabled={channel.status === 'offline'}>
                  {channel.status === 'online' ? 'Contact Now' : 'Currently Offline'}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="faq">FAQ</TabsTrigger>
          <TabsTrigger value="ticket">Submit Ticket</TabsTrigger>
          <TabsTrigger value="resources">Resources</TabsTrigger>
        </TabsList>

        {/* FAQ Tab */}
        <TabsContent value="faq" className="space-y-6">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search FAQ..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* FAQ Categories */}
          {filteredFAQs.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <Search className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <h3 className="text-lg font-medium mb-2">No results found</h3>
                <p className="text-muted-foreground">Try searching with different keywords or browse our categories below.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {filteredFAQs.map((category) => {
                const Icon = category.icon;
                return (
                  <Card key={category.id}>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Icon className="h-5 w-5" />
                        {category.title}
                        <Badge variant="outline">{category.questions.length}</Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Accordion type="single" collapsible className="w-full">
                        {category.questions.map((faq, index) => (
                          <AccordionItem key={index} value={`${category.id}-${index}`}>
                            <AccordionTrigger className="text-left">
                              {faq.question}
                            </AccordionTrigger>
                            <AccordionContent className="text-muted-foreground">
                              {faq.answer}
                            </AccordionContent>
                          </AccordionItem>
                        ))}
                      </Accordion>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* Submit Ticket Tab */}
        <TabsContent value="ticket">
          <Card>
            <CardHeader>
              <CardTitle>Submit Support Ticket</CardTitle>
              <CardDescription>
                Can't find what you're looking for? Submit a support ticket and our team will help you.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleTicketSubmit} className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="subject">Subject *</Label>
                    <Input
                      id="subject"
                      placeholder="Brief description of your issue"
                      value={ticketForm.subject}
                      onChange={(e) => setTicketForm(prev => ({ ...prev, subject: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="category">Category *</Label>
                    <Select value={ticketForm.category} onValueChange={(value) => setTicketForm(prev => ({ ...prev, category: value }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="account">Account Issues</SelectItem>
                        <SelectItem value="billing">Billing & Payments</SelectItem>
                        <SelectItem value="technical">Technical Support</SelectItem>
                        <SelectItem value="groups">Groups & Splitting</SelectItem>
                        <SelectItem value="ai">AI Features</SelectItem>
                        <SelectItem value="parental">Parental Controls</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="priority">Priority</Label>
                  <Select value={ticketForm.priority} onValueChange={(value) => setTicketForm(prev => ({ ...prev, priority: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select priority" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low - General question</SelectItem>
                      <SelectItem value="medium">Medium - Issue affecting usage</SelectItem>
                      <SelectItem value="high">High - Unable to use service</SelectItem>
                      <SelectItem value="urgent">Urgent - Critical issue</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="message">Description *</Label>
                  <Textarea
                    id="message"
                    placeholder="Please describe your issue in detail..."
                    value={ticketForm.message}
                    onChange={(e) => setTicketForm(prev => ({ ...prev, message: e.target.value }))}
                    rows={6}
                    required
                  />
                </div>

                <div className="flex gap-3">
                  <Button type="submit" className="flex-1">
                    <Send className="h-4 w-4 mr-2" />
                    Submit Ticket
                  </Button>
                  <Button 
                    type="button" 
                    variant="outline"
                    onClick={() => setTicketForm({ subject: '', category: '', priority: '', message: '' })}
                  >
                    Clear
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Response Time Info */}
          <Card className="mt-6">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Clock className="h-5 w-5 text-blue-600" />
                <div>
                  <h4 className="font-medium">Response Times</h4>
                  <p className="text-sm text-muted-foreground">
                    We typically respond within 24 hours for most tickets. High priority issues are addressed within 4 hours.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Resources Tab */}
        <TabsContent value="resources" className="space-y-6">
          <div className="grid md:grid-cols-3 gap-6">
            {helpResources.map((resource, index) => {
              const Icon = resource.icon;
              return (
                <Card key={index} className="hover:shadow-lg transition-shadow cursor-pointer">
                  <CardContent className="p-6">
                    <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                      <Icon className="h-6 w-6 text-primary" />
                    </div>
                    <h3 className="font-medium mb-2">{resource.title}</h3>
                    <p className="text-sm text-muted-foreground mb-3">{resource.description}</p>
                    <Badge variant="outline" className="mb-4">{resource.type}</Badge>
                    <Button variant="outline" className="w-full">
                      <ExternalLink className="h-4 w-4 mr-2" />
                      View Resource
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Community */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Community Forum
              </CardTitle>
              <CardDescription>
                Connect with other users, share tips, and get help from the community
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium mb-2">Popular Topics</h4>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span>Getting started with groups</span>
                      <Badge variant="outline">24 posts</Badge>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span>AI assistant tips and tricks</span>
                      <Badge variant="outline">18 posts</Badge>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span>Budgeting best practices</span>
                      <Badge variant="outline">15 posts</Badge>
                    </div>
                  </div>
                </div>
                <div>
                  <h4 className="font-medium mb-2">Community Stats</h4>
                  <div className="space-y-2 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span>1,240 active members</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Star className="h-4 w-4 text-yellow-600" />
                      <span>4.8/5 average helpfulness rating</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MessageCircle className="h-4 w-4 text-blue-600" />
                      <span>156 questions answered this week</span>
                    </div>
                  </div>
                </div>
              </div>
              <Button className="w-full mt-4">
                <ExternalLink className="h-4 w-4 mr-2" />
                Visit Community Forum
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}