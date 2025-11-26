import React, { useState, useEffect } from 'react';
import { Card, CardContent} from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
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
  Calendar,
  Loader2 // Import Loader
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { supabase } from '../../utils/supabase/client';
import { useAuth } from '../../App'; 
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom'; 

interface Notification {
  id: string;
  type: 'expense' | 'settlement' | 'group' | 'reminder' | 'alert' | 'achievement' | 'group_invitation' | 'invitation_accepted' | 'invitation_declined' | 'expense_owed' | 'settlement_received';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  actionable?: boolean;
  data?: any;
}

export function Notifications() {
  const [notificationList, setNotificationList] = useState<Notification[]>([]);
  const [activeTab, setActiveTab] = useState('all');
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const refreshUnreadCount = () => {}; 
  
  const generateTitle = (type: string) => {
    switch (type) {
      case 'group_invitation': return 'Group Invitation';
      case 'invitation_accepted': return 'Invitation Accepted';
      case 'invitation_declined': return 'Invitation Declined';
      case 'expense_owed': return 'Group Debt Added'; 
      case 'settlement': 
      case 'settlement_received': return 'Payment Received'; 
      case 'expense': return 'New Expense';
      default: return 'Notification';
    }
  };

  //Function to fetch notifications
  const fetchNotifications = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      const formattedNotifications = data.map((n: any) => ({
        id: n.id,
        type: n.type as Notification['type'],
        title: generateTitle(n.type),
        message: n.message,
        timestamp: new Date(n.created_at),
        read: n.read,
        actionable: n.actionable,
        data: n.data,
      }));
      setNotificationList(formattedNotifications);
      refreshUnreadCount();
    } catch (error: any) {
      toast.error('Failed to load notifications', { description: error.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchNotifications();
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`notifications_user_${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const newNotification = {
            id: payload.new.id,
            type: payload.new.type,
            title: generateTitle(payload.new.type),
            message: payload.new.message,
            timestamp: new Date(payload.new.created_at),
            read: payload.new.read,
            actionable: payload.new.actionable,
            data: payload.new.data,
          } as Notification;
          
          setNotificationList((prev) => [newNotification, ...prev]);
          toast.info(`New notification: ${newNotification.message}`);
          refreshUnreadCount(); // Update count
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          if (payload.eventType === 'DELETE') {
            setNotificationList((prev) => prev.filter(n => n.id !== payload.old.id));
            refreshUnreadCount(); 
          }
          if (payload.eventType === 'UPDATE' && payload.new.read === true) {
            setNotificationList((prev) => prev.map(n => n.id === payload.new.id ? {...n, read: true} : n));
            refreshUnreadCount(); 
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'expense_owed': 
      case 'settlement': 
      case 'settlement_received': return DollarSign;
      case 'expense': return Receipt;
      case 'group_invitation': return UserPlus;
      case 'invitation_accepted': 
      case 'achievement': return CheckCircle;
      case 'invitation_declined': return X;
      case 'group': return Users;
      case 'reminder': return Calendar;
      case 'alert': return AlertTriangle;
      default: return Bell;
    }
  };

  const getNotificationColor = (type: string) => {
     switch (type) {
      case 'expense_owed': return 'text-red-600'; 
      case 'settlement': 
      case 'settlement_received': return 'text-green-600'; 
      case 'expense': return 'text-blue-600';
      case 'group_invitation': return 'text-purple-600';
      case 'invitation_accepted': return 'text-green-600';
      case 'invitation_declined': return 'text-red-600';
      case 'group': return 'text-purple-600';
      case 'reminder': return 'text-amber-600';
      case 'alert': return 'text-red-600';
      case 'achievement': return 'text-emerald-600';
      default: return 'text-muted-foreground';
    }
  };

  const markAsRead = async (id: string) => {
    setNotificationList(prev =>
      prev.map(notification =>
        notification.id === id ? { ...notification, read: true } : notification
      )
    );
    
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', id);
      
    if (error) {
      toast.error('Failed to mark as read');
      fetchNotifications(); 
    }
    
    refreshUnreadCount();
  };

  const markAllAsRead = async () => {
    if (!user) return;
    setNotificationList(prev =>
      prev.map(notification => ({ ...notification, read: true }))
    );
    
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', user.id)
      .eq('read', false);
      
    if (error) {
      toast.error('Failed to mark all as read');
      fetchNotifications();
    }
    
    refreshUnreadCount();
  };

  const deleteNotification = async (id: string) => {
    setNotificationList(prev =>
      prev.filter(notification => notification.id !== id)
    );
    
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', id);
      
    if (error) {
      toast.error('Failed to delete notification');
      fetchNotifications();
    }

    refreshUnreadCount();
  };

  const handleAction = async (notification: Notification, action: 'accept' | 'decline', e: React.MouseEvent) => {
    e.stopPropagation(); 
    const invitation_id = notification.data?.invitation_id;
    if (notification.type !== 'group_invitation' || !invitation_id) {
      return;
    }

    const toastId = toast.loading(`Sending your response...`);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("No active session");
    
      const response = await fetch(`http://localhost:8000/api/invitations/${invitation_id}/respond`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ action })
      });
      
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Failed to respond to invitation');
      }

      setNotificationList(prev =>
        prev.filter(n => n.id !== notification.id)
      );
      toast.success(`Invitation ${action}ed!`, { id: toastId });
      
      refreshUnreadCount();

    } catch (error: any) {
      toast.error(error.message, { id: toastId });
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.read) {
      markAsRead(notification.id);
    }

    if ((notification.type === 'expense_owed' || notification.type === 'settlement' || notification.type === 'expense') && notification.data?.group_id) {
      navigate(`/groups/${notification.data.group_id}?tab=balances`); 
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
  
  const totalActionableCount = notificationList.filter(n => n.actionable).length;

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Bell className="h-6 w-6" />
            {/* Display the total unread count on the Bell Icon */}
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
             {/* Display total notification count if any */}
            {notificationList.length > 0 && (
              <Badge variant="secondary" className="ml-2 h-5 w-5 p-0 flex items-center justify-center text-xs">
                {notificationList.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="unread" className="relative">
            Unread
            {/* Display unread count */}
            {unreadCount > 0 && (
              <Badge variant="destructive" className="ml-2 h-5 w-5 p-0 flex items-center justify-center text-xs">
                {unreadCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="actionable">
            Action Required
            {totalActionableCount > 0 && (
              <Badge variant="destructive" className="ml-2 h-5 w-5 p-0 flex items-center justify-center text-xs">
                {totalActionableCount}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>
        
        {/* Loading State */}
        {loading && (
          <Card>
            <CardContent className="text-center py-12">
              <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-primary" />
              <p className="text-muted-foreground">Loading notifications...</p>
            </CardContent>
          </Card>
        )}

        {!loading && (
          <>
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
                  const isNavigable = (notification.type === 'expense_owed' || notification.type === 'settlement' || notification.type === 'expense') && notification.data?.group_id;

                  return (
                    <Card 
                      key={notification.id} 
                      className={`transition-all ${!notification.read ? 'bg-muted/30 border-primary/20' : ''} ${isNavigable ? 'cursor-pointer hover:shadow-md' : ''}`}
                      onClick={() => handleNotificationClick(notification)} 
                    >
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
                                    {notification.type.replace('_', ' ')}
                                  </Badge>
                                </div>
                              </div>
                              
                              <div className="flex items-center gap-1">
                                {!notification.read && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={(e) => {
                                      e.stopPropagation(); 
                                      markAsRead(notification.id);
                                    }}
                                    className="h-6 w-6"
                                    title="Mark as read"
                                  >
                                    <Check className="h-3 w-3" />
                                  </Button>
                                )}
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={(e) => {
                                    e.stopPropagation(); 
                                    deleteNotification(notification.id);
                                  }}
                                  className="h-6 w-6"
                                  title="Delete notification"
                                >
                                  <X className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>

                            {/* Action Buttons */}
                            {notification.actionable && (
                              <div className="flex gap-2 mt-3">
                                {notification.type === 'expense_owed' && (
                                  <Button size="sm" onClick={(e) => {
                                    e.stopPropagation(); 
                                    handleNotificationClick(notification);
                                  }}>
                                    Pay ₹{notification.data?.amount_owed?.toFixed(2) || 'Settle Up'} 
                                  </Button>
                                )}

                                {notification.type === 'group_invitation' && (
                                  <>
                                    <Button size="sm" onClick={(e) => handleAction(notification, 'accept', e)}>
                                      <Check className="h-4 w-4 mr-2" />
                                      Accept
                                    </Button>
                                    <Button size="sm" variant="outline" onClick={(e) => handleAction(notification, 'decline', e)}>
                                      <X className="h-4 w-4 mr-2" />
                                      Decline
                                    </Button>
                                  </>
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
                  const isNavigable = (notification.type === 'expense_owed' || notification.type === 'settlement' || notification.type === 'expense') && notification.data?.group_id;

                  return (
                    <Card 
                      key={notification.id} 
                      className={`transition-all bg-muted/30 border-primary/20 ${isNavigable ? 'cursor-pointer hover:shadow-md' : ''}`}
                      onClick={() => handleNotificationClick(notification)} 
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                            <Icon className={`h-4 w-4 ${iconColor}`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <h3 className="font-medium">{notification.title}</h3>
                                  <div className="w-2 h-2 bg-primary rounded-full" />
                                </div>
                                <p className="text-sm text-muted-foreground mb-2">{notification.message}</p>
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                  <span>{formatDistanceToNow(notification.timestamp, { addSuffix: true })}</span>
                                  <Badge variant="outline" className="text-xs">
                                    {notification.type.replace('_', ' ')}
                                  </Badge>
                                </div>
                              </div>
                              <div className="flex items-center gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    markAsRead(notification.id);
                                  }}
                                  className="h-6 w-6"
                                  title="Mark as read"
                                >
                                  <Check className="h-3 w-3" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    deleteNotification(notification.id);
                                  }}
                                  className="h-6 w-6"
                                  title="Delete notification"
                                >
                                  <X className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                            {notification.actionable && (
                              <div className="flex gap-2 mt-3">
                                {/* Group debt/expense button */}
                                {notification.type === 'expense_owed' && (
                                  <Button size="sm" onClick={(e) => {
                                    e.stopPropagation();
                                    handleNotificationClick(notification);
                                  }}>
                                    Pay ₹{notification.data?.amount_owed?.toFixed(2) || 'Settle Up'}
                                  </Button>
                                )}

                                {notification.type === 'group_invitation' && (
                                  <>
                                    <Button size="sm" onClick={(e) => handleAction(notification, 'accept', e)}>
                                      <Check className="h-4 w-4 mr-2" />
                                      Accept
                                    </Button>
                                    <Button size="sm" variant="outline" onClick={(e) => handleAction(notification, 'decline', e)}>
                                      <X className="h-4 w-4 mr-2" />
                                      Decline
                                    </Button>
                                  </>
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

            <TabsContent value="actionable" className="space-y-4">
              {filteredNotifications.length === 0 ? (
                <Card>
                  <CardContent className="text-center py-12">
                    <Info className="h-12 w-12 mx-auto mb-4 text-blue-500" />
                    <h3 className="text-lg font-medium mb-2">No actions required</h3>
                    <p className="text-muted-foreground">No pending actions for you right now.</p>
                  </CardContent>
                </Card>
              ) : (
                filteredNotifications.map((notification) => {
                  const Icon = getNotificationIcon(notification.type);
                  const iconColor = getNotificationColor(notification.type);
                  const isNavigable = (notification.type === 'expense_owed' || notification.type === 'settlement' || notification.type === 'expense') && notification.data?.group_id;

                  return (
                    <Card 
                      key={notification.id} 
                      className={`transition-all ${!notification.read ? 'bg-muted/30 border-primary/20' : ''} ${isNavigable ? 'cursor-pointer hover:shadow-md' : ''}`}
                      onClick={() => handleNotificationClick(notification)} 
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          {/* Indicator for unread status */}
                          <div className={`w-10 h-10 rounded-full bg-amber-50 dark:bg-amber-950/20 flex items-center justify-center flex-shrink-0 ${!notification.read ? 'bg-primary/10' : ''}`}>
                            <Icon className={`h-4 w-4 ${iconColor}`} />
                          </div>
                          
                          <div className="flex-1">
                            <h3 className="font-medium mb-1">{notification.title}</h3>
                            <p className="text-sm text-muted-foreground mb-3">{notification.message}</p>
                            
                            <div className="flex gap-2">
                              {/* Group debt/expense button */}
                              {notification.type === 'expense_owed' && (
                                <Button size="sm" onClick={(e) => {
                                  e.stopPropagation();
                                  handleNotificationClick(notification);
                                }}>
                                  Pay ${notification.data?.amount_owed?.toFixed(2) || 'Settle Up'}
                                </Button>
                              )}

                              {notification.type === 'group_invitation' && (
                                <>
                                  <Button size="sm" onClick={(e) => handleAction(notification, 'accept', e)}>
                                    <Check className="h-4 w-4 mr-2" />
                                    Accept
                                  </Button>
                                  <Button size="sm" variant="outline" onClick={(e) => handleAction(notification, 'decline', e)}>
                                    <X className="h-4 w-4 mr-2" />
                                    Decline
                                  </Button>
                                </>
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
          </>
        )}
      </Tabs>
    </div>
  );
}
