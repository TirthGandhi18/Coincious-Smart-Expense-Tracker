import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { 
  Bell,
  Check,
  X,
  DollarSign,
  Users,
  AlertTriangle,
  Info,
  CheckCircle,
  UserPlus,
  Receipt,
  TrendingUp,
  Calendar,
  Settings
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface Notification {
  id: string;
  type: 'expense' | 'settlement' | 'group' | 'reminder' | 'alert' | 'achievement';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  actionable?: boolean;
  data?: any;
}


// dummuy data
const notifications: Notification[] = [
  {
    id: '1',
    type: 'settlement',
    title: 'Payment Request',
    message: 'Sarah Johnson requests $45.20 for Weekend Trip expenses',
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
    read: false,
    actionable: true,
    data: { amount: 45.20, from: 'Sarah Johnson', group: 'Weekend Trip' }
  },
  {
    id: '2',
    type: 'expense',
    title: 'New Expense Added',
    message: 'Mike Chen added "Gas for Road Trip" ($89.45) to Weekend Trip',
    timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000), // 4 hours ago
    read: false,
    data: { amount: 89.45, addedBy: 'Mike Chen', group: 'Weekend Trip' }
  },
  {
    id: '3',
    type: 'group',
    title: 'Added to Group',
    message: 'You were added to "Work Lunch Group" by Emma Wilson',
    timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
    read: false,
    actionable: true,
    data: { group: 'Work Lunch Group', addedBy: 'Emma Wilson' }
  },
  {
    id: '4',
    type: 'alert',
    title: 'Budget Alert',
    message: 'You\'ve spent 85% of your monthly dining budget',
    timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
    read: true,
    data: { category: 'Dining', percentage: 85 }
  },
  {
    id: '5',
    type: 'achievement',
    title: 'Savings Goal Reached!',
    message: 'Congratulations! You\'ve reached your monthly savings goal of $500',
    timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
    read: true,
    data: { goal: 500, achievement: 'Monthly Savings' }
  },
  {
    id: '6',
    type: 'reminder',
    title: 'Settlement Reminder',
    message: 'Don\'t forget to settle up with Alex for "Movie Night" ($12.50)',
    timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
    read: true,
    actionable: true,
    data: { amount: 12.50, with: 'Alex', group: 'Movie Night' }
  },
  {
    id: '7',
    type: 'expense',
    title: 'Expense Approved',
    message: 'Your expense "Team Lunch" ($156.80) was approved and split',
    timestamp: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
    read: true,
    data: { amount: 156.80, expense: 'Team Lunch' }
  }
];

export function Notifications() {
  const [notificationList, setNotificationList] = useState(notifications);
  const [activeTab, setActiveTab] = useState('all');

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'expense': return Receipt;
      case 'settlement': return DollarSign;
      case 'group': return Users;
      case 'reminder': return Calendar;
      case 'alert': return AlertTriangle;
      case 'achievement': return CheckCircle;
      default: return Bell;
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'expense': return 'text-blue-600';
      case 'settlement': return 'text-green-600';
      case 'group': return 'text-purple-600';
      case 'reminder': return 'text-amber-600';
      case 'alert': return 'text-red-600';
      case 'achievement': return 'text-emerald-600';
      default: return 'text-muted-foreground';
    }
  };

  const markAsRead = (id: string) => {
    setNotificationList(prev =>
      prev.map(notification =>
        notification.id === id ? { ...notification, read: true } : notification
      )
    );
  };

  const markAllAsRead = () => {
    setNotificationList(prev =>
      prev.map(notification => ({ ...notification, read: true }))
    );
  };

  const deleteNotification = (id: string) => {
    setNotificationList(prev =>
      prev.filter(notification => notification.id !== id)
    );
  };

  const handleAction = (notification: Notification, action: 'accept' | 'decline') => {
    // Handle notification actions (mock implementation)
    if (action === 'accept') {
      markAsRead(notification.id);
      // Here you would typically make an API call
    }
  };

  const filterNotifications = (filter: string) => {
    switch (filter) {
      case 'unread':
        return notificationList.filter(n => !n.read);
      case 'actionable':
        return notificationList.filter(n => n.actionable);
      default:
        return notificationList;
    }
  };

  const filteredNotifications = filterNotifications(activeTab);
  const unreadCount = notificationList.filter(n => !n.read).length;

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Bell className="h-6 w-6" />
            {unreadCount > 0 && (
              <Badge className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center text-xs">
                {unreadCount}
              </Badge>
            )}
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Notifications</h1>
            <p className="text-muted-foreground">
              {unreadCount > 0 ? `${unreadCount} unread notifications` : 'All caught up!'}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </Button>
          {unreadCount > 0 && (
            <Button onClick={markAllAsRead}>
              <Check className="h-4 w-4 mr-2" />
              Mark All Read
            </Button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="all" className="relative">
            All
            {notificationList.length > 0 && (
              <Badge variant="secondary" className="ml-2 h-5 w-5 p-0 flex items-center justify-center text-xs">
                {notificationList.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="unread" className="relative">
            Unread
            {unreadCount > 0 && (
              <Badge variant="destructive" className="ml-2 h-5 w-5 p-0 flex items-center justify-center text-xs">
                {unreadCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="actionable">
            Action Required
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          {filteredNotifications.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <Bell className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <h3 className="text-lg font-medium mb-2">No notifications</h3>
                <p className="text-muted-foreground">You're all caught up! New notifications will appear here.</p>
              </CardContent>
            </Card>
          ) : (
            filteredNotifications.map((notification) => {
              const Icon = getNotificationIcon(notification.type);
              const iconColor = getNotificationColor(notification.type);

              return (
                <Card key={notification.id} className={`transition-all ${!notification.read ? 'bg-muted/30 border-primary/20' : ''}`}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className={`w-10 h-10 rounded-full bg-muted flex items-center justify-center flex-shrink-0 ${!notification.read ? 'bg-primary/10' : ''}`}>
                        <Icon className={`h-4 w-4 ${iconColor}`} />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className={`font-medium ${!notification.read ? 'text-foreground' : 'text-muted-foreground'}`}>
                                {notification.title}
                              </h3>
                              {!notification.read && (
                                <div className="w-2 h-2 bg-primary rounded-full" />
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground mb-2">
                              {notification.message}
                            </p>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <span>{formatDistanceToNow(notification.timestamp, { addSuffix: true })}</span>
                              <Badge variant="outline" className="text-xs">
                                {notification.type}
                              </Badge>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-1">
                            {!notification.read && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => markAsRead(notification.id)}
                                className="h-6 w-6"
                              >
                                <Check className="h-3 w-3" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => deleteNotification(notification.id)}
                              className="h-6 w-6"
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>

                        {/* Action Buttons */}
                        {notification.actionable && !notification.read && (
                          <div className="flex gap-2 mt-3">
                            {notification.type === 'settlement' && (
                              <>
                                <Button size="sm" onClick={() => handleAction(notification, 'accept')}>
                                  Pay ${notification.data?.amount}
                                </Button>
                                <Button size="sm" variant="outline" onClick={() => handleAction(notification, 'decline')}>
                                  Dispute
                                </Button>
                              </>
                            )}
                            {notification.type === 'group' && (
                              <>
                                <Button size="sm" onClick={() => handleAction(notification, 'accept')}>
                                  Accept
                                </Button>
                                <Button size="sm" variant="outline" onClick={() => handleAction(notification, 'decline')}>
                                  Decline
                                </Button>
                              </>
                            )}
                            {notification.type === 'reminder' && (
                              <Button size="sm" onClick={() => handleAction(notification, 'accept')}>
                                Settle Up
                              </Button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </TabsContent>

        <TabsContent value="unread" className="space-y-4">
          {filterNotifications('unread').length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
                <h3 className="text-lg font-medium mb-2">All caught up!</h3>
                <p className="text-muted-foreground">You have no unread notifications.</p>
              </CardContent>
            </Card>
          ) : (
            filterNotifications('unread').map((notification) => {
              const Icon = getNotificationIcon(notification.type);
              const iconColor = getNotificationColor(notification.type);

              return (
                <Card key={notification.id} className="bg-muted/30 border-primary/20">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <Icon className={`h-4 w-4 ${iconColor}`} />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-medium">{notification.title}</h3>
                          <div className="w-2 h-2 bg-primary rounded-full" />
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">{notification.message}</p>
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(notification.timestamp, { addSuffix: true })}
                        </span>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => markAsRead(notification.id)}
                        className="h-6 w-6"
                      >
                        <Check className="h-3 w-3" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </TabsContent>

        <TabsContent value="actionable" className="space-y-4">
          {filterNotifications('actionable').length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <Info className="h-12 w-12 mx-auto mb-4 text-blue-500" />
                <h3 className="text-lg font-medium mb-2">No actions required</h3>
                <p className="text-muted-foreground">All your notifications are informational. No action is needed right now.</p>
              </CardContent>
            </Card>
          ) : (
            filterNotifications('actionable').map((notification) => {
              const Icon = getNotificationIcon(notification.type);
              const iconColor = getNotificationColor(notification.type);

              return (
                <Card key={notification.id} className="border-amber-200 dark:border-amber-800">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-full bg-amber-50 dark:bg-amber-950/20 flex items-center justify-center flex-shrink-0">
                        <Icon className={`h-4 w-4 ${iconColor}`} />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-medium mb-1">{notification.title}</h3>
                        <p className="text-sm text-muted-foreground mb-3">{notification.message}</p>
                        
                        <div className="flex gap-2">
                          {notification.type === 'settlement' && (
                            <>
                              <Button size="sm" onClick={() => handleAction(notification, 'accept')}>
                                Pay ${notification.data?.amount}
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => handleAction(notification, 'decline')}>
                                Dispute
                              </Button>
                            </>
                          )}
                          {notification.type === 'group' && (
                            <>
                              <Button size="sm" onClick={() => handleAction(notification, 'accept')}>
                                Accept Invitation
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => handleAction(notification, 'decline')}>
                                Decline
                              </Button>
                            </>
                          )}
                          {notification.type === 'reminder' && (
                            <Button size="sm" onClick={() => handleAction(notification, 'accept')}>
                              Settle Up Now
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}