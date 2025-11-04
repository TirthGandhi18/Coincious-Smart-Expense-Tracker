// Frontend/src/components/pages/Support.tsx
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../ui/accordion';
import { HelpCircle, Mail, Search, Clock, Book, MessageCircle, AlertCircle } from 'lucide-react';

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

// Channels - only email now
const channels = [
  {
    icon: Mail,
    title: 'Email Support',
    description: 'Get help via email',
    availability: 'Response within 24 hours',
    status: 'online'
  }
];

export function Support() {
  const [query, setQuery] = useState('');

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

      {/* Channels - single column */}
      <div className="grid md:grid-cols-1 gap-4 mb-8">
        {channels.map((ch, i) => {
          const Icon = ch.icon;
          return (
            <Card key={i} className="hover:shadow-lg transition-shadow">
              <CardContent className="p-6 text-center">
                <div
                  className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 ${
                    ch.status === 'online' ? 'bg-green-100' : 'bg-gray-100'
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
                <div className="mt-4">
                  <a
                    href={`mailto:support@yourdomain.com`}
                    className="inline-block w-full text-center px-4 py-2 rounded bg-[#8B4513] text-white hover:opacity-95"
                    aria-label="Contact support via email"
                  >
                    Contact via Email
                  </a>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* FAQ search */}
      <div className="relative mb-4 max-w-2xl mx-auto">
        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search FAQ..."
          value={query}
          onChange={e => setQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* FAQs */}
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

      {/* Response Times */}
      <Card className="mt-6">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <Clock className="h-5 w-5 text-blue-600" />
            <div>
              <h4 className="font-medium">Response Times</h4>
              <p className="text-sm text-muted-foreground">
                We typically respond within 24 hours for most inquiries.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
