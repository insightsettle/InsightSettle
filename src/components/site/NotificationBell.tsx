import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { listNotifications, markAllNotificationsRead } from "@/lib/notifications";
import { formatDate } from "@/lib/demo-data";
import { useLocale } from "@/lib/locale";

export function NotificationBell() {
  const { text } = useLocale();
  const queryClient = useQueryClient();
  const notifications = useQuery({
    queryKey: ["notifications"],
    queryFn: () => listNotifications(20),
    refetchInterval: 45_000,
  });
  const markRead = useMutation({
    mutationFn: markAllNotificationsRead,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const items = notifications.data ?? [];
  const unread = items.filter((n) => !n.read_at).length;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label={text("Notifications")}>
          <Bell className="size-4" />
          {unread > 0 && (
            <span key={unread} className="checkout-pop absolute -right-0.5 -top-0.5 flex size-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
              <span aria-hidden className="absolute inset-0 rounded-full bg-primary opacity-50 motion-safe:animate-ping [animation-duration:2.4s]" /><span className="relative">{unread > 9 ? "9+" : unread}</span>
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <p className="text-sm font-semibold">{text("Notifications")}</p>
          {unread > 0 && (
            <button
              className="text-xs text-primary hover:underline"
              onClick={() => markRead.mutate()}
            >
              {text("Mark all read")}
            </button>
          )}
        </div>
        <div className="max-h-80 overflow-y-auto">
          {items.length === 0 && (
            <p className="px-4 py-6 text-center text-sm text-muted-foreground">
              {text("You have no notifications yet.")}
            </p>
          )}
          {items.map((n) => (
            <div
              key={n.id}
              className={`border-b border-border/60 px-4 py-3 last:border-0 ${n.read_at ? "" : "bg-primary/5"}`}
            >
              <p className="text-sm font-medium">{n.title}</p>
              {n.body && <p className="mt-1 text-xs text-muted-foreground">{n.body}</p>}
              <p className="mt-1 text-[11px] text-muted-foreground">{formatDate(n.created_at)}</p>
            </div>
          ))}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
