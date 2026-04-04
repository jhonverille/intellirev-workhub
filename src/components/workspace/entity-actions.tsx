import { PencilIcon, TrashIcon } from "@/components/icons";
import { Button } from "@/components/ui/button";

type EntityActionsProps = {
  onEdit: () => void;
  onDelete: () => void;
  editLabel?: string;
  deleteLabel?: string;
  canEdit?: boolean;
};

export function EntityActions({
  onEdit,
  onDelete,
  editLabel = "Edit",
  deleteLabel = "Delete",
  canEdit = true,
}: EntityActionsProps) {
  if (!canEdit) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        variant="secondary"
        size="sm"
        icon={<PencilIcon className="h-4 w-4" />}
        onClick={onEdit}
      >
        {editLabel}
      </Button>
      <Button
        variant="ghost"
        size="sm"
        icon={<TrashIcon className="h-4 w-4" />}
        onClick={onDelete}
      >
        {deleteLabel}
      </Button>
    </div>
  );
}
