import { useAuth } from "../../context/AuthContext";

interface Props {
  /** The user ID that created the item (created_by, added_by, author_id, etc.) */
  userId: number | null | undefined;
  /** Optional: partner user object if already loaded. If not provided, shows ID-based fallback */
  partnerName?: string;
  /** Optional: partner user ID to resolve name */
  partnerId?: number;
  /** Show creation date alongside the name */
  date?: string;
  /** Size variant */
  size?: "sm" | "md";
}

/**
 * Shows who created an item. Resolves user ID to "Tu" (you) or partner's name.
 */
export default function CreatorBadge({ userId, partnerName, partnerId, date, size = "sm" }: Props) {
  const { user } = useAuth();

  if (!userId) return null;

  const isMe = user?.id === userId;
  const name = isMe ? "Tu" : (partnerId === userId && partnerName) ? partnerName : "Pareja";

  const formattedDate = date
    ? new Date(date).toLocaleDateString("es", { day: "numeric", month: "short" })
    : null;

  if (size === "sm") {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] text-charcoal-400 dark:text-warm-500">
        <span className={`w-1.5 h-1.5 rounded-full ${isMe ? "bg-verdigris-400" : "bg-burnt-300"}`} />
        {name}
        {formattedDate && <span className="text-charcoal-300 dark:text-charcoal-500">· {formattedDate}</span>}
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-charcoal-400 dark:text-warm-500">
      <span className={`w-2 h-2 rounded-full ${isMe ? "bg-verdigris-400" : "bg-burnt-300"}`} />
      <span className="font-medium">{name}</span>
      {formattedDate && <span className="text-charcoal-300 dark:text-charcoal-500">· {formattedDate}</span>}
    </span>
  );
}
