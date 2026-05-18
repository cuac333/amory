import { useState } from "react";
import { Trash2, AlertTriangle, X, Check, Clock } from "lucide-react";
import api from "../../services/api";
import type { DeletionRequest } from "../../types";
import { useTranslation } from "../../context/I18nContext";

interface DeleteButtonProps {
  entityType: string;
  entityId: number;
  pendingRequest?: DeletionRequest | null;
  currentUserId: number;
  onAction: () => void;
  size?: "sm" | "md";
  /** When true, deletes directly without partner consent (e.g. private diary entries, secret wishlist items) */
  directDelete?: boolean;
  /** The direct-delete API endpoint path, e.g. "/diary/123" */
  directDeleteUrl?: string;
}

export default function DeleteButton({
  entityType,
  entityId,
  pendingRequest,
  currentUserId,
  onAction,
  size = "sm",
  directDelete = false,
  directDeleteUrl,
}: DeleteButtonProps) {
  const { t } = useTranslation();
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);

  const requestDelete = async () => {
    setLoading(true);
    await api.post("/deletion-requests/", { entity_type: entityType, entity_id: entityId });
    setLoading(false);
    setShowConfirm(false);
    onAction();
  };

  const approve = async (requestId: number) => {
    setLoading(true);
    await api.put(`/deletion-requests/${requestId}/approve`);
    setLoading(false);
    onAction();
  };

  const reject = async (requestId: number) => {
    setLoading(true);
    await api.put(`/deletion-requests/${requestId}/reject`);
    setLoading(false);
    onAction();
  };

  const cancel = async (requestId: number) => {
    setLoading(true);
    await api.delete(`/deletion-requests/${requestId}/cancel`);
    setLoading(false);
    onAction();
  };

  const directDeleteEntity = async () => {
    setLoading(true);
    await api.delete(directDeleteUrl!);
    setLoading(false);
    setShowConfirm(false);
    onAction();
  };

  const iconSize = size === "sm" ? 12 : 14;

  // There's a pending request from the partner → show approve/reject
  if (pendingRequest && pendingRequest.requested_by !== currentUserId) {
    return (
      <div className="flex items-center gap-1.5">
        <span className="text-xs text-sandy-600 flex items-center gap-1">
          <AlertTriangle size={11} /> {t("deletion.wants.delete", { name: pendingRequest.requested_by_name })}
        </span>
        <button
          onClick={() => approve(pendingRequest.id)}
          disabled={loading}
          className="p-1.5 bg-verdigris-50 text-verdigris-700 rounded-lg hover:bg-verdigris-100 transition-colors disabled:opacity-40"
          title={t("deletion.approve.title")}
        >
          <Check size={iconSize} />
        </button>
        <button
          onClick={() => reject(pendingRequest.id)}
          disabled={loading}
          className="p-1.5 bg-burnt-50 text-burnt-300 rounded-lg hover:bg-burnt-100 transition-colors disabled:opacity-40"
          title={t("deletion.reject.title")}
        >
          <X size={iconSize} />
        </button>
      </div>
    );
  }

  // There's a pending request from the current user → show "waiting" + cancel
  if (pendingRequest && pendingRequest.requested_by === currentUserId) {
    return (
      <div className="flex items-center gap-1.5">
        <span className="text-xs text-warm-400 flex items-center gap-1">
          <Clock size={11} /> {t("deletion.waiting")}
        </span>
        <button
          onClick={() => cancel(pendingRequest.id)}
          disabled={loading}
          className="p-1.5 bg-warm-50 text-charcoal-400 rounded-lg hover:bg-warm-100 transition-colors disabled:opacity-40"
          title={t("deletion.cancel.title")}
        >
          <X size={iconSize} />
        </button>
      </div>
    );
  }

  // Direct delete mode (no partner consent needed)
  if (directDelete && directDeleteUrl) {
    if (showConfirm) {
      return (
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-burnt-300">{t("deletion.confirm")}</span>
          <button
            onClick={directDeleteEntity}
            disabled={loading}
            className="p-1.5 bg-burnt-50 text-burnt-300 rounded-lg hover:bg-burnt-100 transition-colors disabled:opacity-40"
            title={t("confirm")}
          >
            <Check size={iconSize} />
          </button>
          <button
            onClick={() => setShowConfirm(false)}
            className="p-1.5 bg-warm-50 text-charcoal-400 rounded-lg hover:bg-warm-100 transition-colors"
            title={t("cancel")}
          >
            <X size={iconSize} />
          </button>
        </div>
      );
    }
    return (
      <button
        onClick={() => setShowConfirm(true)}
        className="p-1.5 text-warm-300 hover:text-burnt-300 hover:bg-burnt-50 rounded-lg transition-colors"
        title={t("delete")}
      >
        <Trash2 size={iconSize} />
      </button>
    );
  }

  // No pending request → show delete button with confirmation
  if (showConfirm) {
    return (
      <div className="flex items-center gap-1.5">
        <span className="text-xs text-burnt-300">{t("deletion.confirm")}</span>
        <button
          onClick={requestDelete}
          disabled={loading}
          className="p-1.5 bg-burnt-50 text-burnt-300 rounded-lg hover:bg-burnt-100 transition-colors disabled:opacity-40"
          title={t("confirm")}
        >
          <Check size={iconSize} />
        </button>
        <button
          onClick={() => setShowConfirm(false)}
          className="p-1.5 bg-warm-50 text-charcoal-400 rounded-lg hover:bg-warm-100 transition-colors"
          title={t("cancel")}
        >
          <X size={iconSize} />
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => setShowConfirm(true)}
      className="p-1.5 text-warm-300 hover:text-burnt-300 hover:bg-burnt-50 rounded-lg transition-colors"
      title={t("delete")}
    >
      <Trash2 size={iconSize} />
    </button>
  );
}
