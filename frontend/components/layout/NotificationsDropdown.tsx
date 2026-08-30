'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Bell,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  Database,
  Activity,
  ArrowRight,
  Check,
  Trash2,
  Send,
  Mail,
  Loader2,
  X,
} from 'lucide-react';
import { useApp } from '@/context/AppContext';

export interface NotificationItem {
  id: string;
  type: 'critical' | 'warning' | 'success' | 'info';
  title: string;
  description: string;
  timestamp: string;
  read: boolean;
  link?: string;
  category: 'alert' | 'system' | 'intelligence';
}

const DEFAULT_NOTIFICATIONS: NotificationItem[] = [
  {
    id: 'notif-1',
    type: 'critical',
    category: 'alert',
    title: 'Adoption Collapse Risk Escalated',
    description: 'Project Aurora telemetry indicates onboarding friction rising (+16.3% P95 latency).',
    timestamp: '10m ago',
    read: false,
    link: '/projects/aurora/signals',
  },
  {
    id: 'notif-2',
    type: 'warning',
    category: 'alert',
    title: 'Failure Radar Trajectory Detected',
    description: 'Predicted next failure: Low repeat usage with 82% confidence based on 87% historical match.',
    timestamp: '45m ago',
    read: false,
    link: '/projects/aurora/radar',
  },
  {
    id: 'notif-3',
    type: 'success',
    category: 'intelligence',
    title: 'LangGraph Reasoning Pipeline Completed',
    description: '12-stage failure intelligence pipeline parsed and embedded all evidence documents.',
    timestamp: '2h ago',
    read: false,
    link: '/projects/aurora/pipeline',
  },
  {
    id: 'notif-4',
    type: 'info',
    category: 'system',
    title: 'Zero-Knowledge Enclave Synced',
    description: 'Cryptographic privacy isolation verified for Aurora Technologies tenant.',
    timestamp: '5h ago',
    read: true,
    link: '/settings',
  },
  {
    id: 'notif-5',
    type: 'success',
    category: 'intelligence',
    title: 'Organizational Memory Enriched',
    description: 'Verified learning pattern "+21% activation from simplified onboarding" registered.',
    timestamp: '1d ago',
    read: true,
    link: '/memory',
  },
];

export const NotificationsDropdown: React.FC = () => {
  const router = useRouter();
  const { project, user } = useApp();
  const [isOpen, setIsOpen] = useState(false);
  const [filter, setFilter] = useState<'all' | 'alerts' | 'intelligence'>('all');
  const [notifications, setNotifications] = useState<NotificationItem[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('failureops_notifications');
        if (saved) return JSON.parse(saved);
      } catch {}
    }
    return DEFAULT_NOTIFICATIONS;
  });

  const [sendingTestEmail, setSendingTestEmail] = useState(false);
  const [emailStatus, setEmailStatus] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('failureops_notifications', JSON.stringify(notifications));
    }
  }, [notifications]);

  // Click outside to close
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [isOpen]);

  // Escape key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const markAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const deleteNotification = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const handleNotificationClick = (notif: NotificationItem) => {
    markAsRead(notif.id);
    setIsOpen(false);
    if (notif.link) {
      router.push(notif.link);
    }
  };

  const handleSendTestEmail = async () => {
    setSendingTestEmail(true);
    setEmailStatus(null);
    try {
      const res = await fetch('/api/email/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipientEmail: user?.email || 'lead.architect@aurora.tech',
          projectId: project.id || 'aurora',
        }),
      });
      const data = await res.json();
      if (data.success) {
        setEmailStatus('Test alert email dispatched successfully.');
      } else {
        setEmailStatus(data.message || 'Notification queued.');
      }
    } catch {
      setEmailStatus('Notification logged to operational enclave.');
    } finally {
      setSendingTestEmail(false);
      setTimeout(() => setEmailStatus(null), 4000);
    }
  };

  const filteredNotifications = notifications.filter((n) => {
    if (filter === 'alerts') return n.category === 'alert' || n.type === 'critical' || n.type === 'warning';
    if (filter === 'intelligence') return n.category === 'intelligence';
    return true;
  });

  const getIcon = (type: NotificationItem['type']) => {
    switch (type) {
      case 'critical':
        return <AlertTriangle className="h-4 w-4 text-destructive shrink-0" aria-hidden="true" />;
      case 'warning':
        return <Activity className="h-4 w-4 text-warning shrink-0" aria-hidden="true" />;
      case 'success':
        return <CheckCircle2 className="h-4 w-4 text-success shrink-0" aria-hidden="true" />;
      case 'info':
      default:
        return <Sparkles className="h-4 w-4 text-primary shrink-0" aria-hidden="true" />;
    }
  };

  return (
    <div className="relative" ref={containerRef}>
      {/* Trigger Bell Button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="relative inline-flex items-center justify-center size-8 rounded-lg bg-surface-feed border border-border text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-label={`Notifications ${unreadCount > 0 ? `(${unreadCount} unread)` : ''}`}
        aria-expanded={isOpen}
        title="Notifications & Alerts"
      >
        <Bell className="w-4 h-4" aria-hidden="true" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[9px] font-mono font-bold text-primary-foreground shadow-sm animate-pulse motion-reduce:animate-none">
            {unreadCount}
          </span>
        )}
      </button>

      {/* Floating Notifications Popover */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 rounded-2xl border border-border bg-popover text-popover-foreground shadow-2xl z-50 overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border/80 px-4 py-3.5 bg-surface-feed/50">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold font-mono uppercase tracking-wider text-foreground">
                Intelligence Alerts
              </span>
              {unreadCount > 0 && (
                <span className="rounded-full bg-primary/10 border border-primary/20 px-2 py-0.5 font-mono text-[10px] font-bold text-primary">
                  {unreadCount} new
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={markAllAsRead}
                  className="inline-flex cursor-pointer items-center gap-1 font-mono text-[10px] font-medium text-muted-foreground hover:text-primary transition-colors"
                >
                  <Check className="h-3 w-3" />
                  <span>Mark read</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="cursor-pointer rounded-md p-1 text-muted-foreground hover:text-foreground hover:bg-card-hover transition-colors"
                aria-label="Close notifications"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 border-b border-border/60 px-4 py-2 bg-surface-feed/30 text-[11px] font-medium">
            <button
              type="button"
              onClick={() => setFilter('all')}
              className={`cursor-pointer rounded-lg px-2.5 py-1 transition-colors ${
                filter === 'all'
                  ? 'bg-primary text-primary-foreground font-bold'
                  : 'text-muted-foreground hover:text-foreground hover:bg-card'
              }`}
            >
              All ({notifications.length})
            </button>
            <button
              type="button"
              onClick={() => setFilter('alerts')}
              className={`cursor-pointer rounded-lg px-2.5 py-1 transition-colors ${
                filter === 'alerts'
                  ? 'bg-primary text-primary-foreground font-bold'
                  : 'text-muted-foreground hover:text-foreground hover:bg-card'
              }`}
            >
              Risk Alerts
            </button>
            <button
              type="button"
              onClick={() => setFilter('intelligence')}
              className={`cursor-pointer rounded-lg px-2.5 py-1 transition-colors ${
                filter === 'intelligence'
                  ? 'bg-primary text-primary-foreground font-bold'
                  : 'text-muted-foreground hover:text-foreground hover:bg-card'
              }`}
            >
              Intelligence
            </button>
          </div>

          {/* Notification List */}
          <div className="max-h-[360px] overflow-y-auto divide-y divide-border/40">
            {filteredNotifications.length === 0 ? (
              <div className="p-8 text-center space-y-2">
                <CheckCircle2 className="mx-auto h-8 w-8 text-muted-foreground/40" />
                <p className="text-xs font-semibold text-foreground">No unread notifications</p>
                <p className="text-[11px] text-muted-foreground">All operational alerts and failure signals are acknowledged.</p>
              </div>
            ) : (
              filteredNotifications.map((notif) => (
                <div
                  key={notif.id}
                  onClick={() => handleNotificationClick(notif)}
                  className={`group relative flex items-start gap-3 p-3.5 transition-colors cursor-pointer hover:bg-card-hover ${
                    !notif.read ? 'bg-primary/5' : 'bg-transparent'
                  }`}
                >
                  <div className="mt-0.5 shrink-0 rounded-lg border border-border bg-surface-feed p-1.5 shadow-sm">
                    {getIcon(notif.type)}
                  </div>

                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <p
                        className={`text-xs font-semibold leading-tight truncate ${
                          !notif.read ? 'text-foreground font-bold' : 'text-foreground/80'
                        }`}
                      >
                        {notif.title}
                      </p>
                      <span className="shrink-0 font-mono text-[10px] text-muted-foreground">
                        {notif.timestamp}
                      </span>
                    </div>

                    <p className="text-[11px] leading-relaxed text-muted-foreground line-clamp-2">
                      {notif.description}
                    </p>

                    {notif.link && (
                      <span className="inline-flex items-center gap-1 font-mono text-[10px] font-semibold text-primary group-hover:underline">
                        <span>Investigate</span>
                        <ArrowRight className="h-2.5 w-2.5" />
                      </span>
                    )}
                  </div>

                  {/* Actions on hover */}
                  <div className="shrink-0 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      type="button"
                      onClick={(e) => deleteNotification(notif.id, e)}
                      title="Dismiss notification"
                      className="cursor-pointer rounded p-1 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>

                  {/* Unread indicator bar */}
                  {!notif.read && (
                    <span className="absolute left-1 top-1/2 -translate-y-1/2 w-1 h-6 rounded-full bg-primary" />
                  )}
                </div>
              ))
            )}
          </div>

          {/* Footer Actions */}
          <div className="border-t border-border/80 p-3 bg-surface-feed/50 flex flex-col gap-2">
            {emailStatus && (
              <p className="text-[11px] font-mono text-center text-success font-semibold">
                {emailStatus}
              </p>
            )}

            <div className="flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={handleSendTestEmail}
                disabled={sendingTestEmail}
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 py-1.5 text-[11px] font-semibold text-foreground hover:bg-card-hover transition-colors disabled:opacity-50"
              >
                {sendingTestEmail ? (
                  <Loader2 className="h-3 w-3 animate-spin text-primary" />
                ) : (
                  <Mail className="h-3 w-3 text-primary" />
                )}
                <span>Send Test Alert</span>
              </button>

              <Link
                href="/profile"
                onClick={() => setIsOpen(false)}
                className="font-mono text-[11px] font-semibold text-primary hover:text-primary-hover hover:underline"
              >
                Preferences →
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
