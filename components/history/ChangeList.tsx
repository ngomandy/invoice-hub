import { CloseChange } from "@/lib/types";
import ChangeEntry from "./ChangeEntry";

export default function ChangeList({ changes }: { changes: CloseChange[] }) {
  return (
    <div className="space-y-4">
      {changes.map((change) => (
        <ChangeEntry key={change.id} change={change} />
      ))}
    </div>
  );
}
