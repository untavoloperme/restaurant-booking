import { Loader2 } from "lucide-react";

export default function AdminLoading() {
  return (
    <div className="flex items-center justify-center py-24">
      <Loader2 className="h-7 w-7 animate-spin text-muted-foreground" />
    </div>
  );
}
