import Link from "next/link";
import { formatMonth } from "@/lib/utils";
import SendReminderButton from "@/components/dashboard/SendReminderButton";

type Props = {
  missingCloseCount:      number;
  missingPrevBilledCount: number;
  totalClients:           number;
  currentMonth:           string;
  prevMonth:              string;
};

export default function DashboardAlerts({
  missingCloseCount,
  missingPrevBilledCount,
  totalClients,
  currentMonth,
  prevMonth,
}: Props) {
  if (missingCloseCount === 0 && missingPrevBilledCount === 0) return null;

  return (
    <div className="space-y-2 mb-4">
      {/* Missing close alert */}
      {missingCloseCount > 0 && (
        <div className="flex items-start gap-3 bg-warning-bg border border-warning-border rounded-lg px-4 py-3">
          <svg
            className="flex-shrink-0 mt-0.5 text-warning"
            width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
          </svg>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-warning">
              {missingCloseCount} client{missingCloseCount !== 1 ? "s" : ""} missing a close for{" "}
              {formatMonth(currentMonth)}
            </p>
            <p className="text-xs text-warning/80 mt-0.5">
              It&apos;s past the 25th — closes should be locked before month end.{" "}
              {missingCloseCount < totalClients && (
                <span>{totalClients - missingCloseCount} of {totalClients} clients are closed.</span>
              )}
            </p>
            <div className="flex items-center gap-3 mt-1.5">
              <Link
                href={`/dashboard?status=pending&month=${currentMonth}`}
                className="text-xs text-warning font-medium underline underline-offset-2 hover:opacity-80"
              >
                View missing →
              </Link>
              <SendReminderButton type="close" month={currentMonth} />
            </div>
          </div>
        </div>
      )}

      {/* Missing billed (previous month) alert */}
      {missingPrevBilledCount > 0 && (
        <div className="flex items-start gap-3 bg-negative-bg border border-negative-border rounded-lg px-4 py-3">
          <svg
            className="flex-shrink-0 mt-0.5 text-negative"
            width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
          </svg>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-negative">
              {missingPrevBilledCount} client{missingPrevBilledCount !== 1 ? "s" : ""} missing billed amount for{" "}
              {formatMonth(prevMonth)}
            </p>
            <p className="text-xs text-negative/80 mt-0.5">
              It&apos;s past the 5th — previous month&apos;s billed amounts should be entered.
            </p>
            <div className="flex items-center gap-3 mt-1.5">
              <Link
                href={`/billed?month=${prevMonth}`}
                className="text-xs text-negative font-medium underline underline-offset-2 hover:opacity-80"
              >
                Enter billed →
              </Link>
              <SendReminderButton type="billed" month={prevMonth} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
