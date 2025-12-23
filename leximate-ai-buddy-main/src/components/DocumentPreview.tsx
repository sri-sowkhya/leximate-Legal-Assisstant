import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface Props {
  open: boolean;
  onClose: () => void;
  title: string;
  content: string;
}

export default function DocumentPreview({ open, onClose, title, content }: Props) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        {/* Show EXACT generated text */}
        <div className="whitespace-pre-line p-4 bg-secondary rounded-md text-sm leading-relaxed">
          {content}
        </div>
      </DialogContent>
    </Dialog>
  );
}

