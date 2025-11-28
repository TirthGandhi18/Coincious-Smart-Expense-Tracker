import React, { useState, useEffect } from 'react';
import { useAuth } from '../App';
import { useTheme } from './ui/ThemeContext';
import { Button } from './ui/button';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Badge } from './ui/badge';
import { Logo } from './ui/logo';

import {
  Home,
  Users,
  MessageCircle,
  Bell,
  HelpCircle,
  Menu,
  Sun,
  Moon,
  LogOut,
  Baby,
  Settings
} from 'lucide-react';

import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Sheet, SheetContent, SheetTrigger } from './ui/sheet';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from './ui/dialog';

import { supabase } from '../utils/supabase/client';

interface LayoutProps {
  children: React.ReactNode;
}

type NavItem = { href: string; label: string; icon: React.ComponentType<any>; badge?: number };

export function Layout({ children }: LayoutProps) {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  const location = useLocation();
  const navigate = useNavigate();

  const [unreadCount, setUnreadCount] = useState(0);

  // === FETCH UNREAD COUNT ===
  const fetchUnreadCount = async () => {
    if (!user) return;

    try {
      const { count, error } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('read', false);

      if (error) throw error;
      setUnreadCount(count ?? 0);
    } catch (error) {
      console.error('Error fetching unread count:', error);
    }
  };

  // === ON LOAD FETCH ===
  useEffect(() => {
    if (user) fetchUnreadCount();
  }, [user]);

  // === REALTIME LISTENER ===
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`notifications_count_user_${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        () => fetchUnreadCount()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const mainNavItems: NavItem[] = [
    { href: '/dashboard', label: 'Dashboard', icon: Home },
    { href: '/groups', label: 'Groups', icon: Users },
    { href: '/chatbot', label: 'AI Assistant', icon: MessageCircle },
    { href: '/notifications', label: 'Notifications', icon: Bell, badge: unreadCount },
  ];

  if (user?.isParent) {
    mainNavItems.splice(2, 0, { href: '/parental', label: 'Parental', icon: Baby });
  }

  const supportNavItem: NavItem = { href: '/support', label: 'Support', icon: HelpCircle };
  const SupportIcon = supportNavItem.icon;

  const navItems = [...mainNavItems, supportNavItem];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const [showSignoutConfirm, setShowSignoutConfirm] = useState(false);

  const openSignoutConfirm = () => setShowSignoutConfirm(true);

  const confirmSignout = () => {
    setShowSignoutConfirm(false);
    handleLogout();
  };

  return (
    <div className="min-h-screen bg-background">

      {/* DESKTOP HEADER */}
      <header className="hidden md:flex items-center justify-between px-6 py-4 border-b bg-card">
        <Link to="/dashboard" className="flex items-center gap-4">
          <Logo size="md" />
        </Link>

        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={toggleTheme} aria-label="Toggle theme">
            {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </Button>

          <Link to="/profile" aria-label="Profile">
            <Button
              variant="ghost"
              className="relative h-10 w-10 rounded-full border-2 hover:border-primary hover:bg-accent transition-all duration-200"
              title="View Profile"
            >
              <Avatar className="h-8 w-8">
                <AvatarImage src={user?.avatar} alt={user?.name} />
                <AvatarFallback className="bg-primary text-primary-foreground">
                  {user?.name?.charAt(0)?.toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </Button>
          </Link>
        </div>
      </header>

      {/* MOBILE HEADER */}
      <header className="md:hidden flex items-center justify-between px-4 py-3 border-b bg-card">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>

          <SheetContent side="left" className="w-64">
            <div className="flex flex-col h-full">
              <div className="flex items-center gap-2 px-2 py-4">
                <h2 className="text-lg font-bold">Smart Expense</h2>
              </div>

              <nav className="flex-1 space-y-2">
                {mainNavItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = location.pathname === item.href;

                  return (
                    <Link
                      key={item.href}
                      to={item.href}
                      aria-current={isActive ? 'page' : undefined}
                      className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${isActive
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                        }`}
                    >
                      <Icon className="h-4 w-4" />
                      <span>{item.label}</span>

                      {item.badge !== undefined && item.badge > 0 && (
                        <Badge variant="destructive" className="ml-auto h-5 w-5 p-0 flex items-center justify-center text-xs">
                          {item.badge}
                        </Badge>
                      )}
                    </Link>
                  );
                })}
              </nav>

              <div className="border-t pt-4 space-y-2">

                <Link
                  to={supportNavItem.href}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${location.pathname === supportNavItem.href
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                    }`}
                >
                  <SupportIcon className="h-4 w-4" />
                  <span>{supportNavItem.label}</span>
                </Link>

                <Button variant="ghost" className="w-full justify-start gap-3" asChild>
                  <Link to="/settings">
                    <Settings className="h-4 w-4" />
                    <span>Settings</span>
                  </Link>
                </Button>

                <Button
                  variant="ghost"
                  className="w-full justify-start gap-3 text-destructive hover:bg-destructive/10"
                  onClick={openSignoutConfirm}
                >
                  <LogOut className="h-4 w-4" />
                  <span>Sign out</span>
                </Button>

                <div className="pt-2 border-t">
                  <Button variant="ghost" className="w-full justify-start gap-3" onClick={toggleTheme}>
                    {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                    {isDark ? 'Light Mode' : 'Dark Mode'}
                  </Button>
                </div>
              </div>
            </div>
          </SheetContent>
        </Sheet>

        <h1 className="text-lg font-bold">Smart Expense</h1>

        <Link to="/profile">
          <Button variant="ghost" className="h-10 w-10 rounded-full">
            <Avatar className="h-8 w-8">
              <AvatarImage src={user?.avatar} />
              <AvatarFallback>{user?.name?.charAt(0)?.toUpperCase()}</AvatarFallback>
            </Avatar>
          </Button>
        </Link>
      </header>

      {/* MAIN LAYOUT */}
      <div className="flex h-[calc(100vh-73px)] md:h-[calc(100vh-81px)]">

        {/* DESKTOP SIDEBAR */}
        <aside className="hidden md:flex w-64 flex-col border-r bg-card">

          <nav className="flex-1 space-y-2 p-4">
            {mainNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.href;

              return (
                <Link
                  key={item.href}
                  to={item.href}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${isActive ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-accent'
                    }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.label}</span>

                  {item.badge !== undefined && item.badge > 0 && (
                    <Badge variant="destructive" className="ml-auto h-5 w-5 p-0 flex items-center justify-center text-xs">
                      {item.badge}
                    </Badge>
                  )}
                </Link>
              );
            })}
          </nav>

          <div className="border-t p-4 space-y-2">
            <Link
              to={supportNavItem.href}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${location.pathname === supportNavItem.href
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-accent'
                }`}
            >
              <SupportIcon className="h-4 w-4" />
              <span>{supportNavItem.label}</span>
            </Link>

            <Link
              to="/settings"
              className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${location.pathname === '/settings'
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-accent'
                }`}
            >
              <Settings className="h-4 w-4" />
              <span>Settings</span>
            </Link>

            <Button
              variant="ghost"
              className="w-full justify-start gap-3 text-destructive hover:bg-destructive/10"
              onClick={openSignoutConfirm}
            >
              <LogOut className="h-4 w-4" />
              <span>Sign out</span>
            </Button>
          </div>
        </aside>

        <main className="flex-1 overflow-auto">{children}</main>
      </div>

      {/* MOBILE BOTTOM NAV */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-card border-t px-4 py-2">
        <div className="flex items-center justify-around">
          {navItems.slice(0, 4).map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.href;

            return (
              <Link
                key={item.href}
                to={item.href}
                className={`flex flex-col items-center gap-1 relative ${isActive ? 'text-primary' : 'text-muted-foreground'
                  }`}
              >
                <Icon className="h-5 w-5" />
                <span className="text-xs">{item.label}</span>

                {item.badge !== undefined && item.badge > 0 && (
                  <Badge variant="destructive" className="absolute -top-1 -right-1 h-4 w-4 text-xs flex items-center justify-center p-0">
                    {item.badge}
                  </Badge>
                )}
              </Link>
            );
          })}
        </div>
      </nav>
      <Dialog open={showSignoutConfirm} onOpenChange={setShowSignoutConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Sign out</DialogTitle>
            <DialogDescription>Are you sure you want to sign out?</DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowSignoutConfirm(false)} className="
    bg-gray-200 hover:bg-gray-300 text-black
    dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-white
  ">
              Cancel
            </Button>

            <Button variant="destructive" onClick={confirmSignout} className="
    bg-red-600 hover:bg-red-700 text-white
    dark:bg-red-800 dark:hover:bg-red-900
  ">
              Sign out
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
