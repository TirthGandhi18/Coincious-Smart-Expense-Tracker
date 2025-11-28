import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../ui/accordion';
import { HelpCircle, Mail, Search, Clock, Book, MessageCircle, Calculator, Settings, X, CreditCard, Copy, Check } from 'lucide-react';

const faqs = [
    {
        id: 'getting-started',
        title: 'Getting Started',
        icon: Book,
        questions: [
            {
                question: 'How do I create my first expense group?',
                answer:
                    'To create a group, go to the Groups page and click "Create Group". Enter a name, then you can invite members by email. You can start adding expenses once your group is set up.',
            },
            {
                question: 'How do I add an expense?',
                answer:
                    'Click the "Add Expense" button from the dashboard or within a group. Fill in the expense details, choose the type (Personal or Group), and if it\'s a group expense, select how to split it.',
            },
            {
                question: 'How do I invite friends to join my group?',
                answer:
                    'From your group page, click "Add Member" and enter their email addresses. They\'ll receive an invitation to join your group.',
            },
            {
                question: 'Can I use the app without creating groups?',
                answer:
                    'Yes! You can track personal expenses by selecting "Personal" when adding an expense. These will appear on your dashboard under your spending summary.',
            },
        ],
    },
    {
        id: 'expenses-splitting',
        title: 'Expenses & Splitting',
        icon: Calculator,
        questions: [
            {
                question: 'Can I split expenses unequally?',
                answer:
                    'Yes! When adding a group expense, you can switch the split method to "Unequal Division" and manually specify exactly how much each person owes.',
            },
            {
                question: 'Can I edit an expense after adding it?',
                answer:
                    'Yes, you can edit expenses from the dashboard. Click on the pencil icon next to an expense to update its details, amount, or date.',
            },
            {
                question: 'How do I delete an expense I added by mistake?',
                answer:
                    'Click the trash icon on the expense card in your dashboard. This will permanently remove the expense and recalculate totals.',
            },
            {
                question: 'Can I add expenses from the past?',
                answer:
                    'Yes! When adding an expense, you can use the date picker to select any past date. This is useful for backlogging transactions.',
            },
        ],
    },
    {
        id: 'groups-management',
        title: 'Groups & Management',
        icon: MessageCircle,
        questions: [
            {
                question: 'How do I settle up with someone?',
                answer:
                    'Go to your group page and switch to the "Balances" tab. You will see a "Settlements" section. If you owe money, click "Settle Up" to record a payment.',
            },
            {
                question: 'What\'s the maximum number of people in a group?',
                answer:
                    'While there is no strict software limit, the app is optimized for small to medium-sized groups (friends, roommates, trips) for the best experience.',
            },
            {
                question: 'Can I delete a group?',
                answer:
                     'Yes, if you are the group creator, you can delete the group using the delete icon on the Groups page. This will remove all associated data.',
            }
        ],
    },
    {
        id: 'payments-settlements',
        title: 'Payments & Settlements',
        icon: CreditCard,
        questions: [
            {
                question: 'Does the app handle actual money transfers?',
                answer:
                    'No, our app only tracks who owes what. You need to settle payments outside the app using cash, UPI, bank transfers, or other payment apps.',
            },
            {
                question: 'How do I mark a payment as received?',
                answer:
                    'Settlements are typically recorded by the person who paid (the debtor). Once they click "Settle Up" and confirm the amount, the balances for both parties update automatically.',
            },
            {
                question: 'Can I see payment history?',
                answer:
                    'Yes, settlements are recorded as transactions. You can see them listed in the group details or expense history.',
            },
        ],
    },
    {
        id: 'account-settings',
        title: 'Account & Settings',
        icon: Settings,
        questions: [
            {
                question: 'How do I change my profile information?',
                answer:
                    'Click on your avatar in the top right corner (or "Profile" in the mobile menu) to access your Profile page. There you can update your name, email, phone number, and profile picture.',
            },
            {
                question: 'How do I change my password?',
                answer:
                    'Go to your Profile page. In the "Security" section, click the "Change" button next to "Password" to update your credentials.',
            },
             {
                question: 'Where can I see where I am logged in?',
                answer:
                    'On your Profile page, check the "Active Sessions" section under Security. You can view and manage all devices currently logged into your account.',
            },
            {
                question: 'Can I export my expense data?',
                answer:
                    'Yes! Go to Settings > App Management > Export Data. You can select a date range and download your expense history as a CSV file.',
            },
            {
                question: 'How do I delete my account?',
                answer:
                    'Go to Settings > App Management > Delete Account. Please note that this action is irreversible and will remove all your data.',
            },
        ],
    },
    {
        id: 'troubleshooting',
        title: 'Troubleshooting',
        icon: HelpCircle,
        questions: [
            {
                question: 'The app is running slowly or crashing',
                answer:
                    'Try refreshing the page or clearing your browser cache. If the issue persists, please use the contact form to report it.',
            },
            {
                question: 'My balances don\'t look correct',
                answer:
                    'Review your recent expenses in the group. Ensure that splits were entered correctly. If you find an error, you can edit the specific expense to fix the balance.',
            },
            {
                question: 'I forgot my password',
                answer:
                    'Click "Forgot Password" on the login page and enter your email. You\'ll receive a secure link to reset your password.',
            },
        ],
    },
];

export function Support() {
    const [query, setQuery] = useState('');
    const [showEmailModal, setShowEmailModal] = useState(false);
    const [copiedEmail, setCopiedEmail] = useState<string | null>(null);

    const filteredFaqs = faqs
        .map(cat => ({
            ...cat,
            questions: cat.questions.filter(
                q =>
                    q.question.toLowerCase().includes(query.toLowerCase()) ||
                    q.answer.toLowerCase().includes(query.toLowerCase())
            ),
        }))
        .filter(cat => cat.questions.length > 0);

    const copyToClipboard = (email: string) => {
        navigator.clipboard.writeText(email);
        setCopiedEmail(email);
        setTimeout(() => setCopiedEmail(null), 2000);
    };

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
                        <p className="text-muted-foreground">
                            Get the help you need, when you need it
                        </p>
                    </div>
                </div>
            </div>

            {/* Email Support Card */}
            <Card className="max-w-2xl mx-auto border-2 hover:shadow-xl transition-all duration-300">
                <CardContent className="p-8">
                    <div className="flex flex-col md:flex-row items-center gap-6">
                        {/* Icon Section */}
                        <div className="flex-shrink-0">
                            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-green-100 to-green-200 dark:from-green-900 dark:to-green-800 flex items-center justify-center shadow-lg">
                                <Mail className="h-10 w-10 text-green-600 dark:text-green-400" />
                            </div>
                        </div>
                        
                        {/* Content Section */}
                        <div className="flex-1 text-center md:text-left">
                            <h3 className="text-xl font-bold mb-2 text-gray-900 dark:text-gray-100">Email Support</h3>
                            <p className="text-sm text-muted-foreground mb-3">
                                Get help via email - We're here to assist you
                            </p>
                            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-green-50 dark:bg-green-900/30 rounded-full">
                                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                                <span className="text-xs font-medium text-green-700 dark:text-green-400">
                                    Response within 24 hours
                                </span>
                            </div>
                        </div>
                        
                        {/* Button Section */}
                        <div className="flex-shrink-0 w-full md:w-auto">
                            <div
                                onClick={() => setShowEmailModal(true)}
                                className="w-full md:w-auto px-6 py-3 rounded-lg bg-[#8B4513] text-white font-medium hover:bg-[#6D3410] transition-colors cursor-pointer text-center shadow-md hover:shadow-lg"
                            >
                                Contact via Email
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Email Modal */}
            {showEmailModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] backdrop-blur-sm" onClick={() => setShowEmailModal(false)}>
                    <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl border border-gray-200 dark:border-gray-700" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">Contact Support</h3>
                            <div 
                                onClick={() => setShowEmailModal(false)} 
                                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-pointer transition-colors"
                            >
                                <X className="h-6 w-6" />
                            </div>
                        </div>
                        
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                            Click on the email to copy it to your clipboard
                        </p>

                        <div className="space-y-3">
                            <div 
                                onClick={() => copyToClipboard('coincious.expensetracker@gmail.com')}
                                className="w-full text-left p-5 border-2 border-gray-200 dark:border-gray-700 rounded-xl hover:border-blue-400 dark:hover:border-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all cursor-pointer group"
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-900 dark:to-blue-800 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                                            <Mail className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                                        </div>
                                        <div>
                                            <p className="font-semibold text-sm text-gray-900 dark:text-gray-100">General Support</p>
                                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">coincious.expensetracker@gmail.com</p>
                                        </div>
                                    </div>
                                    {copiedEmail === 'coincious.expensetracker@gmail.com' ? (
                                        <Check className="h-5 w-5 text-green-600 flex-shrink-0" />
                                    ) : (
                                        <Copy className="h-5 w-5 text-gray-400 group-hover:text-blue-600 flex-shrink-0" />
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

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
                                                <AccordionTrigger className="text-left">
                                                    {q.question}
                                                </AccordionTrigger>
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