// Frontend/src/components/pages/Support.tsx
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../ui/accordion';
import { HelpCircle, Mail, Search, Clock, Book, MessageCircle, Calculator, Settings, X, CreditCard, Copy, Check } from 'lucide-react';

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
					'To create a group, go to the Groups page and click "Create Group". Enter a name and description, then invite members by email. You can start adding expenses once your group is set up.',
			},
			{
				question: 'How do I add an expense?',
				answer:
					'Click the "Add Expense" button from the dashboard or within a group. Fill in the expense details, choose how to split it (equally, by percentage, or custom amounts), and select who to split with.',
			},
			{
				question: 'How do I invite friends to join my group?',
				answer:
					'From your group page, click "Invite Members" and enter their email addresses. They\'ll receive an invitation link to join your group and start splitting expenses with you.',
			},
			{
				question: 'Can I use the app without creating groups?',
				answer:
					'Yes! You can track personal expenses on your dashboard. Groups are only needed when you want to split expenses with others.',
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
					'Yes! When adding an expense, you can choose from three split methods: equal split, percentage-based split, or custom amounts where you specify exactly how much each person owes.',
			},
			{
				question: 'Can I edit an expense after adding it?',
				answer:
					'Yes, you can edit expenses from the group detail page or expense history. Click on the expense and select "Edit". Changes will automatically update everyone\'s balances.',
			},
			{
				question: 'What happens if someone leaves a group with outstanding balances?',
				answer:
					'Outstanding balances remain until settled. The person can still pay their debts even after leaving the group. Group admins can view and manage these balances.',
			},
			{
				question: 'How do I delete an expense I added by mistake?',
				answer:
					'Click on the expense in your group or history, then select "Delete". This will remove the expense and adjust everyone\'s balances accordingly.',
			},
			{
				question: 'Can I add expenses from the past?',
				answer:
					'Yes! When adding an expense, you can change the date to any past date. This is useful for adding expenses you forgot to log earlier.',
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
					'Go to your dashboard or group page to see outstanding balances. Click "Settle Up" next to a person\'s name, enter the payment amount, and mark it as paid.',
			},
			{
				question: 'How do I leave a group?',
				answer:
					'Go to the group settings and click "Leave Group". Make sure all your balances are settled first, or arrange payment outside the app.',
			},
			{
				question: 'Can I make someone else an admin of my group?',
				answer:
					'Yes, group creators can promote other members to admin status. Admins can invite/remove members, edit group settings, and manage expenses.',
			},
			{
				question: 'What\'s the maximum number of people in a group?',
				answer:
					'Groups can have up to 50 members. For larger events, consider creating multiple smaller groups or using our event planning features.',
			},
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
					'No, our app only tracks who owes what. You need to settle payments outside the app using cash, bank transfers, Venmo, PayPal, or other payment methods.',
			},
			{
				question: 'How do I mark a payment as received?',
				answer:
					'When someone pays you back, go to your balances and click "Record Payment". Enter the amount and confirm to update both of your balances.',
			},
			{
				question: 'Can I see payment history?',
				answer:
					'Yes! Go to your profile or group settings to view all payment records, including who paid whom and when payments were recorded.',
			},
			{
				question: 'What if someone disputes an expense?',
				answer:
					'Group members can comment on expenses to discuss any issues. If needed, admins can edit or delete disputed expenses to resolve conflicts.',
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
					'Go to Settings > Profile to update your name, email, profile picture, and other personal information. Changes will be visible to your group members.',
			},
			{
				question: 'Can I change my email address?',
				answer:
					'Yes, go to Settings > Account to change your email. You\'ll need to verify the new email address before the change takes effect.',
			},
			{
				question: 'How do I enable/disable notifications?',
				answer:
					'In Settings > Notifications, you can control which alerts you receive via email or push notifications, including new expenses, payments, and reminders.',
			},
			{
				question: 'Can I export my expense data?',
				answer:
					'Yes! Go to Settings > Data Export to download your expense history as CSV or PDF files for personal records or tax purposes.',
			},
			{
				question: 'How do I delete my account?',
				answer:
					'Go to Settings > Account > Delete Account. Note that you must settle all outstanding balances before account deletion is allowed.',
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
					'Try closing and reopening the app, clearing your browser cache, or updating to the latest version. Contact support if issues persist.',
			},
			{
				question: 'I\'m not receiving email notifications',
				answer:
					'Check your spam folder and ensure notifications are enabled in Settings. Add our email domain to your safe senders list.',
			},
			{
				question: 'My balances don\'t look correct',
				answer:
					'Review your recent expenses and payments in the activity log. If you find discrepancies, check if any expenses were edited or deleted recently.',
			},
			{
				question: 'I forgot my password',
				answer:
					'Click "Forgot Password" on the login page and enter your email. You\'ll receive a reset link to create a new password.',
			},
		],
	},
];

const channels = [
	{
		icon: Mail,
		title: 'Email Support',
		description: 'Get help via email',
		availability: 'Response within 24 hours',
		status: 'online',
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

            {/* Channels - single column */}
            <div className="grid md:grid-cols-1 gap-4 mb-8">
                <Card className="hover:shadow-lg transition-shadow">
                    <CardContent className="p-6 text-center">
                        <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 bg-green-100">
                            <Mail className="h-6 w-6 text-green-600" />
                        </div>
                        <h3 className="font-medium mb-2">Email Support</h3>
                        <p className="text-sm text-muted-foreground mb-3">
                            Get help via email
                        </p>
                        <div className="flex items-center justify-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-green-500" />
                            <span className="text-xs text-muted-foreground">
                                Response within 24 hours
                            </span>
                        </div>
                        <div className="mt-4">
                            <div
                                onClick={() => setShowEmailModal(true)}
                                className="inline-block w-full text-center px-4 py-2 rounded bg-[#8B4513] text-white hover:opacity-95 cursor-pointer select-none"
                            >
                                Contact via Email
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Email Modal */}
            {showEmailModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999]" onClick={() => setShowEmailModal(false)}>
                    <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-md w-full mx-4 shadow-xl" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold">Contact Support</h3>
                            <div 
                                onClick={() => setShowEmailModal(false)} 
                                className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 cursor-pointer"
                            >
                                <X className="h-5 w-5" />
                            </div>
                        </div>
                        
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                            Click to copy email address to your clipboard
                        </p>

                        <div className="space-y-3">
                            <div 
                                onClick={() => copyToClipboard('support@smartexpense.com')}
                                className="w-full text-left p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition cursor-pointer"
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                                            <Mail className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                                        </div>
                                        <div>
                                            <p className="font-medium text-sm">General Support</p>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">support@smartexpense.com</p>
                                        </div>
                                    </div>
                                    {copiedEmail === 'support@smartexpense.com' ? (
                                        <Check className="h-5 w-5 text-green-600" />
                                    ) : (
                                        <Copy className="h-5 w-5 text-gray-400" />
                                    )}
                                </div>
                            </div>

                            <div 
                                onClick={() => copyToClipboard('technical@smartexpense.com')}
                                className="w-full text-left p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition cursor-pointer"
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900 rounded-full flex items-center justify-center">
                                            <Mail className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                                        </div>
                                        <div>
                                            <p className="font-medium text-sm">Technical Issues</p>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">technical@smartexpense.com</p>
                                        </div>
                                    </div>
                                    {copiedEmail === 'technical@smartexpense.com' ? (
                                        <Check className="h-5 w-5 text-green-600" />
                                    ) : (
                                        <Copy className="h-5 w-5 text-gray-400" />
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
