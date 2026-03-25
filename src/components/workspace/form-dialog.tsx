import { Dialog } from "@/components/ui/dialog";

type FormDialogProps = {
  open: boolean;
  mode: "create" | "edit";
  noun: string;
  createDescription: string;
  editDescription: string;
  size?: "md" | "lg";
  onClose: () => void;
  children: React.ReactNode;
};

export function FormDialog({
  open,
  mode,
  noun,
  createDescription,
  editDescription,
  size = "md",
  onClose,
  children,
}: FormDialogProps) {
  return (
    <Dialog
      open={open}
      title={`${mode === "create" ? "Create" : "Edit"} ${noun}`}
      description={mode === "create" ? createDescription : editDescription}
      onClose={onClose}
      size={size}
    >
      {children}
    </Dialog>
  );
}
