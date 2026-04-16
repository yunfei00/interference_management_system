"use client";

import type { UserBrief } from "@/lib/contracts";

import styles from "./projects.module.css";
import { getInitials, getUserLabel } from "./project-utils";

export function MemberAvatarGroup({
  members,
  maxVisible = 4,
}: {
  members: UserBrief[];
  maxVisible?: number;
}) {
  if (!members.length) {
    return <span className={styles.secondaryText}>No members</span>;
  }

  const visibleMembers = members.slice(0, maxVisible);
  const extraCount = members.length - visibleMembers.length;

  return (
    <div className={styles.avatarGroup}>
      {visibleMembers.map((member) => (
        <span
          className={styles.avatar}
          key={member.id}
          title={getUserLabel(member)}
        >
          {getInitials(member)}
        </span>
      ))}
      {extraCount > 0 ? (
        <span className={styles.avatar} title={`${extraCount} more members`}>
          +{extraCount}
        </span>
      ) : null}
    </div>
  );
}
