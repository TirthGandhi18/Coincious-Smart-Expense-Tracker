import { Link } from 'react-router-dom';
import { Button } from '../ui/button';
import {
  Wallet,
  Users,
  Sparkles,
  ArrowRight,
  Moon,
  Sun,
  BarChart3,
  MessageSquare,
  Zap,
  Receipt,
  Mail,
  Send
} from 'lucide-react';
import { useTheme } from '../ui/ThemeContext';
import { motion } from 'motion/react';
import { ImageWithFallback } from '../ui/ImageWithFallback';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../ui/dialog';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { useState } from 'react';
import { toast } from 'sonner';
import { Logo } from '../ui/logo';

export const Landing = () => {
  const { theme, toggleTheme } = useTheme();
  const [supportDialogOpen, setSupportDialogOpen] = useState(false);
  const [supportType, setSupportType] = useState<'help' | 'contact'>('help');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  });

  const handleSupportClick = (type: 'help' | 'contact') => {
    setSupportType(type);
    setSupportDialogOpen(true);
  };

  const handleSubmitSupport = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success('Support request sent!', {
      description: 'We\'ll get back to you within 24 hours.'
    });

    // Reset form
    setFormData({
      name: '',
      email: '',
      subject: '',
      message: ''
    });

    setSupportDialogOpen(false);
  };

  return (
    <div className="min-h-screen bg-[#F5E6D3] dark:bg-[#1A2332]">
      {/*  Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 dark:bg-[#293548]/80 backdrop-blur-xl border-b border-[#D7CCC8]/20 dark:border-[#374151]/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            {/* Logo */}
            <Logo></Logo>

            {/* Desktop Menu */}
            <div className="hidden md:flex items-center gap-8">
              <a
                href="#features"
                className="text-[#5D4037] dark:text-[#E5E7EB] hover:text-[#8B5A3C] dark:hover:text-[#10B981] transition-colors">
                Features
              </a>

              <a
                href="#how-it-works"
                className="text-[#5D4037] dark:text-[#E5E7EB] hover:text-[#8B5A3C] dark:hover:text-[#10B981] transition-colors"
              >
                About
              </a>
              <button
                onClick={() => handleSupportClick('contact')}
                className="text-[#5D4037] dark:text-[#E5E7EB] hover:text-[#8B5A3C] dark:hover:text-[#10B981] transition-colors"
              >
                Contact
              </button>
            </div>

            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleTheme}
                className="rounded-xl text-[#5D4037] dark:text-[#E5E7EB] "
              >
                {theme === 'light' ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
              </Button>
              <Link to="/login" >
                <Button variant="ghost" className="text-[#5D4037]  dark:text-[#E5E7EB] hover:text-[#8B5A3C] dark:hover:text-[#10B981]">
                  Login
                </Button>
              </Link>
              <Link to="/register">
                <Button className="bg-gradient-to-r from-[#8B5A3C] to-[#6D452E] dark:from-[#10B981] dark:to-[#059669] text-white rounded-xl px-6 shadow-lg hover:shadow-xl transition-all">
                  Get Started
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <section className="relative pt-32 pb-20 px-4 sm:px-6 lg:px-8 overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
          <div className="absolute top-20 -left-20 w-96 h-96 bg-[#8B5A3C]/10 dark:bg-[#10B981]/10 rounded-full blur-3xl"></div>
          <div className="absolute top-40 -right-20 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl"></div>
        </div>

        <div className="max-w-7xl mx-auto relative z-10">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left Content */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
            >
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#EFE8DD] dark:bg-[#374151] border border-[#D7CCC8] dark:border-[#10B981]/20 mb-6">
                <Sparkles className="w-4 h-4 text-[#8B5A3C] dark:text-[#10B981]" />
                <span className="text-sm text-[#5D4037] dark:text-[#E5E7EB]">AI-Powered Expense Management</span>
              </div>

              <h1 className="text-5xl md:text-6xl lg:text-7xl text-[#5D4037] dark:text-white mb-6 leading-tight">
                Manage your money,
                <br />
                <span className="bg-gradient-to-r from-[#5B6FD8] via-[#7B8FE8] to-[#5B6FD8] bg-clip-text text-transparent">
                  smarter
                </span>
              </h1>

              <p className="text-xl text-[#8D6E63] dark:text-[#B8C5D6] mb-8 leading-relaxed">
                Split expenses effortlessly, track spending intelligently, and get AI-powered insights to make better financial decisions together.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 mb-10">
                <Link to="/register">
                  <Button className="bg-gradient-to-r from-[#8B5A3C] to-[#6D452E] dark:from-[#10B981] dark:to-[#059669] text-white rounded-xl px-8 py-7 text-lg shadow-2xl hover:shadow-xl transition-all group">
                    Create Account Now
                    <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </Link>
                <Link to="/login">
                  <Button variant="outline" className="border-2 border-[#8B5A3C] dark:border-[#10B981] text-[#5D4037] dark:text-[#E5E7EB] rounded-xl px-8 py-7 text-lg hover:bg-[#EFE8DD] dark:hover:bg-[#374151]">
                    Watch Demo
                  </Button>
                </Link>
              </div>
            </motion.div>

            <motion.div
              className="relative"
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
            >
              <div className="relative rounded-3xl overflow-hidden shadow-2xl">
                <ImageWithFallback
                  src="https://images.unsplash.com/photo-1460925895917-afdab827c52f?q=80&w=1115&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
                  alt="Smart Expense App"
                  className="relative w-full h-auto rounded-3xl"
                />
              </div>

              <div className="absolute -bottom-6 -right-6 w-72 h-72 bg-gradient-to-br from-[#8B5A3C]/20 to-blue-500/20 dark:from-[#10B981]/20 dark:to-blue-500/20 rounded-full blur-3xl -z-10"></div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 px-4 sm:px-6 lg:px-8 bg-[#F5E6D3] dark:bg-[#1A2332]">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#EFE8DD] dark:bg-[#374151] border border-[#D7CCC8] dark:border-[#10B981]/20 mb-4">
                <Zap className="w-4 h-4 text-[#8B5A3C] dark:text-[#10B981]" />
                <span className="text-sm text-[#5D4037] dark:text-[#E5E7EB]">Powerful Features</span>
              </div>
              <h2 className="text-4xl md:text-5xl text-[#5D4037] dark:text-white mb-4">
                Everything You Need to
                <br />
                <span className="text-[#8B5A3C] dark:text-[#10B981]">Manage Money Better</span>
              </h2>
              <p className="text-lg text-[#8D6E63] dark:text-[#9CA3AF] max-w-2xl mx-auto">
                Packed with smart features that make expense tracking effortless and fun.
              </p>
            </motion.div>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              {
                icon: Users,
                title: 'Smart Split Bills',
                description: 'Split expenses equally, by percentage. Perfect for roommates and groups.',
                start: '#3B82F6',
                end: '#06B6D4'
              },
              {
                icon: BarChart3,
                title: 'Visual Analytics',
                description: 'Beautiful charts and graphs to understand your spending patterns at a glance.',
                start: '#8B5CF6',
                end: '#EC4899'
              },
              {
                icon: MessageSquare,
                title: 'AI Assistant',
                description: 'Chat with our AI to get instant answers about your expenses and financial insights.',
                start: '#10B981',
                end: '#059669'
              },

              {
                icon: Receipt,
                title: 'Receipt Scanner',
                description: 'Snap photos of receipts and let AI extract all the details automatically.',
                start: '#F59E0B',
                end: '#F97316'
              },

            ].map((feature, index) => (
              <motion.div
                key={feature.title}
                className="group block bg-white dark:bg-[#293548] rounded-2xl p-8 border border-[#D7CCC8] dark:border-[#374151] hover:shadow-2xl transition-all hover:scale-105"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
              >
                <div
                  className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-5 group-hover:scale-110 transition-transform`}
                  style={{ background: `linear-gradient(135deg, ${feature.start}, ${feature.end})` }}
                >
                  <feature.icon className="w-7 h-7 text-white" />
                </div>
                <h3 className="text-xl text-[#5D4037] dark:text-white mb-3">{feature.title}</h3>
                <p className="text-[#8D6E63] dark:text-[#9CA3AF] leading-relaxed">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section id="how-it-works" className="py-24 px-4 sm:px-6 lg:px-8 bg-white dark:bg-[#293548]">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <div className="relative rounded-3xl overflow-hidden shadow-2xl ">
                <ImageWithFallback
                  src="https://images.unsplash.com/photo-1672833634993-a7ce02f7adbc?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxmcmllbmRzJTIwc3BsaXR0aW5nJTIwYmlsbCUyMHJlc3RhdXJhbnR8ZW58MXx8fHwxNzYyOTUyMDYxfDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral"
                  alt="Friends splitting bills together"
                  className="w-full h-auto rounded-3xl"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#8B5A3C]/20 to-transparent dark:from-[#10B981]/20"></div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#EFE8DD] dark:bg-[#374151] border border-[#D7CCC8] dark:border-[#10B981]/20 mb-6">
                <Sparkles className="w-4 h-4 text-[#8B5A3C] dark:text-[#10B981]" />
                <span className="text-sm text-[#5D4037] dark:text-[#E5E7EB]">Simple Process</span>
              </div>

              <h2 className="text-4xl text-[#5D4037] dark:text-white mb-6">
                Get Started in
                <br />
                <span className="text-[#8B5A3C] dark:text-[#10B981]">4 Easy Steps</span>
              </h2>

              <p className="text-lg text-[#8D6E63] dark:text-[#9CA3AF] mb-10">
                From signup to tracking expenses in less than 2 minutes.
              </p>

              <div className="space-y-6 " >
                {[
                  { step: '01', title: 'Create Account', desc: 'Sign up with email or social login' },
                  { step: '02', title: 'Create or Join Group', desc: 'Invite friends or join existing groups' },
                  { step: '03', title: 'Add Expenses', desc: 'Log expenses and split automatically' },
                  { step: '04', title: 'Track & Settle', desc: 'View insights and settle balances easily' }
                ].map((item) => {
                  const isDark = theme === 'dark';
                  const stepGradient = isDark
                    ? 'linear-gradient(135deg, #10B981, #34D399)'
                    : 'linear-gradient(135deg, #8B5A3C, #D7A86E)';

                  return (
                    <div key={item.step} className="flex gap-4">
                      <div className="flex-shrink-0">
                        <div
                          className="w-12 h-12 rounded-xl flex items-center justify-center text-white"
                          style={{ background: stepGradient }}
                        >
                          {item.step}
                        </div>
                      </div>
                      <div>
                        <h4 className="text-lg text-[#5D4037] dark:text-white mb-1">{item.title}</h4>
                        <p className="text-[#8D6E63] dark:text-[#9CA3AF]">{item.desc}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#5D4037] dark:bg-[#0F1419] text-white py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-12 mb-12">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#8B5A3C] to-[#D7A86E] dark:from-[#10B981] dark:to-[#34D399] flex items-center justify-center">
                  <Wallet className="w-5 h-5 text-white" />
                </div>
                <div>
                  <div className="text-white">Smart Expense</div>
                </div>
              </div>
              <p className="text-white/70 text-sm">
                Making expense management simple, smart, and collaborative.
              </p>
            </div>
            <div>
              <h4 className="mb-4">Benefits</h4>
              <ul className="space-y-3 text-sm text-white/70">
                <li><a href="#features" className="hover:text-white transition-colors">Clear Spending Insights</a></li>
                <li><a href="#pricing" className="hover:text-white transition-colors">Split Group Expenses</a></li>

              </ul>
            </div>
            <div>
              <h4 className="mb-4">Use Cases</h4>
              <ul className="space-y-3 text-sm text-white/70">
                <li><a href="#" className="hover:text-white transition-colors">For Couples</a></li>
                <li><a href="#" className="hover:text-white transition-colors">For Group Holidays</a></li>
                <li><a href="#" className="hover:text-white transition-colors">For Roommates</a></li>
                <li><a href="#" className="hover:text-white transition-colors">For Restaurant Bills</a></li>

              </ul>
            </div>
            <div>
              <h4 className="mb-4">Support</h4>
              <ul className="space-y-3 text-sm text-white/70">
                <li>
                  <button
                    onClick={() => handleSupportClick('help')}
                    className="hover:text-white transition-colors"
                  >
                    Help Center
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => handleSupportClick('contact')}
                    className="hover:text-white transition-colors"
                  >
                    Contact Us
                  </button>
                </li>
                <li><a href="#" className="hover:text-white transition-colors">Terms</a></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-white/20 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-white/60 text-sm">
              &copy; 2025 Smart Expense.
            </p>
            <div className="flex gap-6 text-sm text-white/60">
              <a href="#" className="hover:text-white transition-colors">Youtube</a>

            </div>
          </div>
        </div>
      </footer>

      {/* Support Dialog */}
      <Dialog open={supportDialogOpen} onOpenChange={setSupportDialogOpen}>
        <DialogContent className="sm:max-w-[500px] bg-white dark:bg-[#293548] border-[#D7CCC8] dark:border-[#374151]">
          <DialogHeader>
            <DialogTitle className="text-2xl text-[#5D4037] dark:text-white flex items-center gap-2">
              <Mail className="w-6 h-6 text-[#8B5A3C] dark:text-[#10B981]" />
              {supportType === 'help' ? 'Help Center' : 'Contact Us'}
            </DialogTitle>
            <DialogDescription className="text-[#8D6E63] dark:text-[#9CA3AF]">
              {supportType === 'help'
                ? 'Get help with your Smart Expense account or features.'
                : 'Send us a message and we\'ll get back to you within 24 hours.'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmitSupport} className="space-y-5 mt-4">
            <div>
              <Label htmlFor="name" className="text-[#5D4037] dark:text-[#E5E7EB]">Name</Label>
              <Input
                id="name"
                placeholder="Your full name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                className="mt-1.5 bg-[#ffffff] dark:bg-[#1A2332] border-[#b9b6b5] dark:border-[#374151] text-[#5D4037] dark:text-white"
              />
            </div>

            <div>
              <Label htmlFor="email" className="text-[#5D4037] dark:text-[#E5E7EB]">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter Your Email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
                className="mt-1.5 bg-[#ffffff] dark:bg-[#1A2332] border-[#b9b6b5] dark:border-[#374151] text-[#5D4037] dark:text-white"
              />
            </div>

            <div>
              <Label htmlFor="subject" className="text-[#5D4037] dark:text-[#E5E7EB]">Subject</Label>
              <Select
                value={formData.subject}
                onValueChange={(value) => setFormData({ ...formData, subject: value })}
                required
              >
                <SelectTrigger className="mt-1.5 bg-[#ffffff] dark:bg-[#1A2332] border-[#b9b6b5] dark:border-[#374151] text-[#5D4037] dark:text-white">
                  <SelectValue placeholder="Select a topic" />
                </SelectTrigger>
                <SelectContent className="bg-white dark:bg-[#293548] border-[#D7CCC8] dark:border-[#697281]">
                  <SelectItem value="account">Account & Login Issues</SelectItem>
                  <SelectItem value="groups">Group Management</SelectItem>
                  <SelectItem value="expenses">Expense Tracking</SelectItem>
                  <SelectItem value="payments">Payments & Settlements</SelectItem>
                  <SelectItem value="technical">Technical Support</SelectItem>
                  <SelectItem value="feature">Feature Request</SelectItem>
                  <SelectItem value="billing">Billing Question</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="message" className="text-[#5D4037] dark:text-[#E5E7EB]">Message</Label>
              <Textarea
                id="message"
                placeholder="Describe your issue or question in detail..."
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                required
                rows={5}
                className="mt-1.5 bg-[#ffffff] dark:bg-[#1A2332] border-[#D7CCC8] dark:border-[#374151] text-[#5D4037] dark:text-white resize-none"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setSupportDialogOpen(false)}
                className="flex-1 bg-[#fbf9f9] border-[#D7CCC8] dark:border-[#374151] text-[#5D4037] dark:text-[#E5E7EB]"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="flex-1 bg-gradient-to-r from-[#8B5A3C] to-[#6D452E] dark:from-[#10B981] dark:to-[#059669] text-white"
              >
                <Send className="w-4 h-4 mr-2" />
                Send Message
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};
