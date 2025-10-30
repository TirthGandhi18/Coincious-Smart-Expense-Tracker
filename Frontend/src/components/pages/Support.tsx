// Frontend/src/components/pages/Support.tsx
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
  Phone,
  Mail,
  Search,
  Clock,
  AlertCircle,
  Book,
  MessageCircle,
  Send
} from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { toast } from 'sonner';

// FAQ data
const faqs = [
  {
    id: 'getting-started',
    title: 'Getting Started',
    icon: Book,
    questions: [
      {
        question: 'How do I create my first expense group?',
        answer:
          'To create a group, go to the Groups page and click "Create Group". Enter a name and description, then invite members by email. You can start adding expenses once your group is set up.'
      },
      {
        question: 'How do I add an expense?',
        answer:
          'Click the "Add Expense" button from the dashboard or within a group. Fill in the expense details, choose how to split it (equally, by percentage, or custom amounts), and select who to split with.'
      },
      {
        question: 'Can I split expenses unequally?',
        answer:
          'Yes! When adding an expense, you can choose from three split methods: equal split, percentage-based split, or custom amounts where you specify exactly how much each person owes.'
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
        answer:
          'Go to the group or your notifications to see outstanding balances. Click "Settle Up" and confirm the payment. You can mark it as paid through the app or use external payment methods.'
      },
      {
        question: 'Can I edit an expense after adding it?',
        answer:
          'Yes, you can edit expenses from the group detail page. Click on the expense and select "Edit". Note that changes may affect how the expense is split among group members.'
      },
      {
        question: 'How do I leave a group?',
        answer:
          'You can leave a group from the group settings menu. Make sure all your balances are settled before leaving. Group admins can also remove members if needed.'
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
        answer:
          "Parents can create accounts and link their children's accounts for monitoring. Set spending limits, approve large purchases, and receive alerts about spending activity."
      },
      {
        question: 'Can I set spending limits for my child?',
        answer:
          "Yes, you can set daily, weekly, or monthly spending limits by category or overall. You'll receive notifications when limits are approached or exceeded."
      },
      {
        question: 'What notifications will I receive as a parent?',
        answer:
          "You'll get alerts for large purchases, spending limit warnings, unusual activity, and requests for approval on purchases above your set threshold."
      }
    ]
  }
];

// Channels (removed live chat)
const channels = [
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

export function Support() {
  const [tab, setTab] = useState('faq');
  const [query, setQuery] = useState('');
  const [ticket, setTicket] = useState({
    subject: '',
    category: '',
    priority: '',
    message: ''
  });

  const submitTicket = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticket.subject || !ticket.category || !ticket.message) {
      toast.error('Please fill in all required fields');
      return;
    }

    toast.success('Support ticket submitted successfully!');
    setTicket({ subject: '', category: '', priority: '', message: '' });
  };

  const filteredFaqs = faqs
    .map(cat => ({
      ...cat,
      questions: cat.questions.filter(q =>
        q.question.toLowerCase().includes(query.toLowerCase()) ||
        q.answer.toLowerCase().includes(query.toLowerCase())
      )
    }))
    .filter(cat => cat.questions.length > 0);

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

      {/* Channels (Live Chat removed) */}
      <div className="grid md:grid-cols-2 gap-4 mb-8">
        {channels.map((ch, i) => {
          const Icon = ch.icon;
          return (
            <Card key={i} className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardContent className="p-6 text-center">
                <div
                  className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 ${
                    ch.status === 'online'
                      ? 'bg-green-100 dark:bg-green-900/20'
                      : 'bg-gray-100 dark:bg-gray-900/20'
                  }`}
                >
                  <Icon
                    className={`h-6 w-6 ${
                      ch.status === 'online' ? 'text-green-600' : 'text-gray-600'
                    }`}
                  />
                </div>
                <h3 className="font-medium mb-2">{ch.title}</h3>
                <p className="text-sm text-muted-foreground mb-3">{ch.description}</p>
                <div className="flex items-center justify-center gap-2">
                  <div
                    className={`w-2 h-2 rounded-full ${
                      ch.status === 'online' ? 'bg-green-500' : 'bg-gray-400'
                    }`}
                  />
                  <span className="text-xs text-muted-foreground">{ch.availability}</span>
                </div>
                <Button className="w-full mt-4" disabled={ch.status === 'offline'}>
                  {ch.status === 'online' ? 'Contact Now' : 'Currently Offline'}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Tabs - only FAQ and Submit Ticket remain */}
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="faq">FAQ</TabsTrigger>
          <TabsTrigger value="ticket">Submit Ticket</TabsTrigger>
        </TabsList>

        {/* FAQ */}
        <TabsContent value="faq" className="space-y-6">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search FAQ..."
              value={query}
              onChange={e => setQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {filteredFaqs.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <Search className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <h3 className="text-lg font-medium mb-2">No results found</h3>
                <p className="text-muted-foreground">
                  Try searching with different keywords or browse our categories below.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {filteredFaqs.map(cat => {
                const Icon = cat.icon;
                return (
                  <Card key={cat.id}>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Icon className="h-5 w-5" />
                        {cat.title}
                        <Badge variant="outline">{cat.questions.length}</Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Accordion type="single" collapsible className="w-full">
                        {cat.questions.map((q, idx) => (
                          <AccordionItem key={idx} value={`${cat.id}-${idx}`}>
                            <AccordionTrigger className="text-left">{q.question}</AccordionTrigger>
                            <AccordionContent className="text-muted-foreground">
                              {q.answer}
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

        {/* Ticket */}
        <TabsContent value="ticket">
          <Card>
            <CardHeader>
              <CardTitle>Submit Support Ticket</CardTitle>
              <CardDescription>
                Can’t find what you’re looking for? Submit a support ticket and our team will help
                you.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={submitTicket} className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="subject">Subject *</Label>
                    <Input
                      id="subject"
                      placeholder="Brief description of your issue"
                      value={ticket.subject}
                      onChange={e => setTicket(prev => ({ ...prev, subject: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="category">Category *</Label>
                    <Select
                      value={ticket.category}
                      onValueChange={val => setTicket(prev => ({ ...prev, category: val }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="account">Account Issues</SelectItem>
                        <SelectItem value="billing">Billing & Payments</SelectItem>
                        <SelectItem value="technical">Technical Support</SelectItem>
                        <SelectItem value="groups">Groups & Splitting</SelectItem>
                        <SelectItem value="parental">Parental Controls</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="priority">Priority</Label>
                  <Select
                    value={ticket.priority}
                    onValueChange={val => setTicket(prev => ({ ...prev, priority: val }))}
                  >
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
                    value={ticket.message}
                    onChange={e => setTicket(prev => ({ ...prev, message: e.target.value }))}
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
                    onClick={() =>
                      setTicket({ subject: '', category: '', priority: '', message: '' })
                    }
                  >
                    Clear
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          <Card className="mt-6">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Clock className="h-5 w-5 text-blue-600" />
                <div>
                  <h4 className="font-medium">Response Times</h4>
                  <p className="text-sm text-muted-foreground">
                    We typically respond within 24 hours for most tickets. High-priority issues are
                    addressed within 4 hours.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
