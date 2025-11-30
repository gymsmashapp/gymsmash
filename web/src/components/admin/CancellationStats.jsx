import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { XCircle, MessageSquare } from "lucide-react";

const CANCELLATION_REASONS = {
  'customer_service': 'Customer Service',
  'low_quality': 'Low Quality',
  'missing_features': 'Missing Features',
  'switched_service': 'Switched Service',
  'too_complex': 'Too Complex',
  'too_expensive': 'Too Expensive',
  'unused': 'Unused',
  'other': 'Other',
  'none': 'No Reason Given',
  'not_provided': 'Not Provided'
};

export default function CancellationStats({ users }) {
  // Filter users who have cancelled
  const cancelledUsers = users.filter(u => u.cancellation_reason || u.cancelled_at);
  
  // Count reasons
  const reasonCounts = {};
  cancelledUsers.forEach(user => {
    const reason = user.cancellation_reason || 'not_provided';
    reasonCounts[reason] = (reasonCounts[reason] || 0) + 1;
  });

  // Sort by count descending
  const sortedReasons = Object.entries(reasonCounts)
    .sort((a, b) => b[1] - a[1]);

  const totalCancellations = cancelledUsers.length;

  if (totalCancellations === 0) {
    return null;
  }

  return (
    <Card className="border-none shadow-lg mb-8">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <XCircle className="w-5 h-5 text-red-500" />
          Cancellation Feedback
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="mb-4">
          <p className="text-2xl font-bold text-slate-900">{totalCancellations}</p>
          <p className="text-sm text-slate-600">Total Cancellations</p>
        </div>

        <div className="space-y-3">
          {sortedReasons.map(([reason, count]) => {
            const percentage = Math.round((count / totalCancellations) * 100);
            const label = CANCELLATION_REASONS[reason] || reason;
            
            return (
              <div key={reason}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-slate-700">{label}</span>
                  <span className="text-slate-500">{count} ({percentage}%)</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2">
                  <div 
                    className="bg-red-500 h-2 rounded-full transition-all"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* Show recent cancellation comments */}
        {cancelledUsers.some(u => u.cancellation_comment) && (
          <div className="mt-6 pt-4 border-t border-slate-200">
            <h4 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              Recent Comments
            </h4>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {cancelledUsers
                .filter(u => u.cancellation_comment)
                .slice(0, 10)
                .map((user, idx) => (
                  <div key={idx} className="bg-slate-50 rounded-lg p-3">
                    <p className="text-sm text-slate-700 italic">"{user.cancellation_comment}"</p>
                    <p className="text-xs text-slate-500 mt-1">{user.email}</p>
                  </div>
                ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}