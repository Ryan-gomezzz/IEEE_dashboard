'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { useRouter } from 'next/navigation';

export function ApprovalActions({ approval }: { approval: any }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [comments, setComments] = useState('');

  const handleApproval = async (status: 'approved' | 'rejected') => {
    setLoading(true);
    try {
      const response = await fetch('/api/approvals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event_id: approval.event_id,
          approval_type: approval.approval_type,
          status,
          comments: comments || undefined,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        alert(data.error || 'Failed to submit approval');
        return;
      }

      router.refresh();
    } catch (error) {
      alert('An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Comments (optional)
        </label>
        <textarea
          value={comments}
          onChange={(e) => setComments(e.target.value)}
          rows={3}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-gray-900 bg-white"
          placeholder="Add any comments..."
        />
      </div>
      <div className="flex gap-4">
        <Button
          variant="primary"
          onClick={() => handleApproval('approved')}
          disabled={loading}
        >
          Approve
        </Button>
        <Button
          variant="danger"
          onClick={() => handleApproval('rejected')}
          disabled={loading}
        >
          Reject
        </Button>
      </div>
    </div>
  );
}
