"use client";

import * as React from "react";
import { motion, LayoutGroup } from "motion/react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { TooltipProvider, Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export interface PresenceReviewUser {
  id: number;
  name: string;
  image?: string;
  fallback: string;
  review: string;
  online?: boolean;
}

export interface UserPresenceAvatarProps {
  users?: PresenceReviewUser[];
  avatarClassName?: string;
}

const AVATAR_MOTION_TRANSITION = {
  type: "spring",
  stiffness: 200,
  damping: 25,
} as const;

const GROUP_CONTAINER_TRANSITION = {
  type: "spring",
  stiffness: 150,
  damping: 20,
} as const;

export function UserPresenceAvatar({ users = [], avatarClassName }: UserPresenceAvatarProps) {
  const [memberList, setMemberList] = React.useState(users);
  const [togglingGroup, setTogglingGroup] = React.useState<"online" | "offline" | null>(null);

  const online = memberList.filter((u) => u.online);
  const offline = memberList.filter((u) => !u.online);

  const toggleStatus = (id: number) => {
    const user = memberList.find((u) => u.id === id);
    if (!user) return;

    setTogglingGroup(user.online ? "online" : "offline");
    setMemberList((prev) => {
      const idx = prev.findIndex((u) => u.id === id);
      if (idx === -1) return prev;
      const updated = [...prev];
      const target = updated[idx];
      if (!target) return prev;
      updated.splice(idx, 1);
      updated.push({ ...target, online: !target.online });
      return updated;
    });
    window.setTimeout(() => setTogglingGroup(null), 500);
  };

  const renderGroup = (group: PresenceReviewUser[], groupKey: "online" | "offline") => {
    if (group.length === 0) return null;
    return (
      <motion.div
        layout
        className={cn(
          "rounded-full bg-neutral-300 p-0.5 dark:bg-neutral-700",
          togglingGroup === groupKey ? "z-5" : "z-10",
        )}
        transition={GROUP_CONTAINER_TRANSITION}
      >
        <div
          key={group.map((u) => u.id).join("_") + `-${groupKey}`}
          className="flex h-20 items-center -space-x-5"
        >
          {group.map((user) => (
            <Tooltip key={user.id}>
              <TooltipTrigger asChild>
                <motion.div
                  layoutId={`avatar-${user.id}`}
                  className="cursor-pointer"
                  onClick={() => toggleStatus(user.id)}
                  animate={
                    user.online
                      ? { filter: "grayscale(0)", scale: 1 }
                      : { filter: "grayscale(1)", scale: 0.96 }
                  }
                  transition={AVATAR_MOTION_TRANSITION}
                  initial={false}
                >
                  <Avatar
                    className={cn(
                      "size-20 border-4 border-neutral-300 dark:border-neutral-700",
                      avatarClassName,
                    )}
                  >
                    {user.image ? <AvatarImage src={user.image} alt={user.name} /> : null}
                    <AvatarFallback>{user.fallback}</AvatarFallback>
                    <TooltipContent
                      side="top"
                      sideOffset={12}
                      className="max-w-[22rem] rounded-2xl border border-border/60 bg-card/95 p-5 text-left shadow-lift"
                    >
                      <p className="eyebrow eyebrow-accent mb-2">{user.name}</p>
                      <p className="text-sm leading-relaxed text-muted-foreground">
                        “{user.review}”
                      </p>
                    </TooltipContent>
                  </Avatar>
                </motion.div>
              </TooltipTrigger>
            </Tooltip>
          ))}
        </div>
      </motion.div>
    );
  };

  return (
    <div className="flex items-center justify-center gap-5">
      <LayoutGroup>
        <TooltipProvider delayDuration={150}>
          {renderGroup(online, "online")}
          {renderGroup(offline, "offline")}
        </TooltipProvider>
      </LayoutGroup>
    </div>
  );
}
