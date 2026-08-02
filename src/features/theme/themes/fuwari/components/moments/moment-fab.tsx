import { Plus } from "lucide-react";

interface MomentFabProps {
  onClick: () => void;
}

export function MomentFab({ onClick }: MomentFabProps) {
  return (
    <button
      onClick={onClick}
      className="fixed bottom-22 right-6 z-40 w-14 h-14 rounded-full bg-(--fuwari-primary) text-white shadow-lg hover:shadow-xl active:scale-95 transition-all flex items-center justify-center"
      aria-label="发布动态"
    >
      <Plus size={24} />
    </button>
  );
}