import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { useTheme } from '../../App';
import { Link } from 'react-router-dom';
import { 
  Sun, 
  Moon, 
  Smartphone, 
  Shield, 
  Brain, 
  Users, 
  PieChart, 
  Zap 
} from 'lucide-react';
import { ImageWithFallback } from '../figma/ImageWithFallback';

export function Landing() {
  const { isDark, toggleTheme } = useTheme();

  const features = [
    {
      icon: Users,
      title: 'Smart Group Splitting',
      description: 'Easily split expenses with friends, family, or colleagues. Multiple split methods available.'
    },
    {
      icon: Brain,
      title: 'AI-Powered Insights',
      description: 'Get intelligent spending analysis and personalized financial recommendations.'
    },
    {
      icon: Shield,
      title: 'Parental Controls',
      description: 'Monitor and guide your children\'s spending habits with comprehensive parental tools.'
    },
    {
      icon: PieChart,
      title: 'Detailed Analytics',
      description: 'Beautiful charts and reports to understand your spending patterns.'
    },
    {
      icon: Smartphone,
      title: 'Mobile-First Design',
      description: 'Responsive PWA that works seamlessly across all your devices.'
    },
    {
      icon: Zap,
      title: 'Real-time Updates',
      description: 'Instant notifications and live expense tracking with your groups.'
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-primary">Smart Expense</h1>
            <Badge variant="secondary" className="hidden sm:inline-flex">PWA</Badge>
          </div>
          
          <nav className="hidden md:flex items-center gap-6">
            <Link to="#features" className="text-muted-foreground hover:text-foreground transition-colors">
              Features
            </Link>
            <Link to="#about" className="text-muted-foreground hover:text-foreground transition-colors">
              About
            </Link>
            <Link to="#contact" className="text-muted-foreground hover:text-foreground transition-colors">
              Contact
            </Link>
          </nav>
          
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={toggleTheme}>
              {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
            <Button variant="outline" asChild>
              <Link to="/login">Login</Link>
            </Button>
            <Button asChild>
              <Link to="/register">Get Started</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 md:py-32">
        <div className="container mx-auto px-4 text-center">
          <Badge variant="secondary" className="mb-4">
            ✨ AI-Powered Expense Management
          </Badge>
          
          <h1 className="text-4xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">
            Manage your money, smarter
          </h1>
          
          <p className="text-xl md:text-2xl text-muted-foreground mb-8 max-w-3xl mx-auto">
            Split expenses effortlessly, track spending intelligently, and get AI-powered insights 
            to make better financial decisions together.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <Button size="lg" className="text-lg px-8 py-3" asChild>
              <Link to="/register">Start Free Trial</Link>
            </Button>
            <Button size="lg" variant="outline" className="text-lg px-8 py-3" asChild>
              <Link to="/login">Sign In</Link>
            </Button>
          </div>
          
          {/* Dashboard Preview */}
          <div className="relative max-w-4xl mx-auto">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-green-500/20 blur-3xl rounded-3xl" />
            <Card className="relative overflow-hidden">
              <CardContent className="p-0">
                <ImageWithFallback
                  src=""
                  alt="Smart Expense Dashboard Preview"
                  className="w-full h-auto rounded-lg"
                />
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <Badge variant="secondary" className="mb-4">Features</Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Everything you need to manage expenses
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Powerful features designed to make expense tracking and splitting as simple as possible.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <Card key={index} className="hover:shadow-lg transition-shadow">
                  <CardContent className="p-6">
                    <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                      <Icon className="h-6 w-6 text-primary" />
                    </div>
                    <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                    <p className="text-muted-foreground">{feature.description}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20">
        <div className="container mx-auto px-4 text-center">
          <Card className="max-w-2xl mx-auto">
            <CardContent className="p-8 md:p-12">
              <h2 className="text-3xl font-bold mb-4">
                Ready to take control of your expenses?
              </h2>
              <p className="text-muted-foreground mb-6">
                Join thousands of users who are already managing their finances smarter with AI assistance.
              </p>
              <Button size="lg" className="w-full sm:w-auto" asChild>
                <Link to="/register">Get Started for Free</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-card/50 py-8">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-primary">Smart Expense</h3>
              <Badge variant="outline">v1.0</Badge>
            </div>
            
            <div className="flex items-center gap-6 text-sm text-muted-foreground">
              <Link to="#" className="hover:text-foreground transition-colors">Privacy</Link>
              <Link to="#" className="hover:text-foreground transition-colors">Terms</Link>
              <Link to="#" className="hover:text-foreground transition-colors">Support</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}