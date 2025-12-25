'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { useRouter } from 'next/navigation';

export function DocumentReview({ documents }: { documents: any[] }) {
  const router = useRouter();
  const [loading, setLoading] = useState<Record<string, boolean>>({});

  const handleReview = async (documentId: string, eventId: string, approved: boolean) => {
    setLoading({ ...loading, [documentId]: true });

    try {
      const response = await fetch(`/api/events/${eventId}/documentation/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          document_id: documentId,
          approved,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        alert(data.error || 'Failed to review document');
        return;
      }

      router.refresh();
    } catch (error) {
      alert('An error occurred');
    } finally {
      setLoading({ ...loading, [documentId]: false });
    }
  };

  if (documents.length === 0) {
    return <div className="text-center py-8 text-gray-500">No documents pending review</div>;
  }

  return (
    <div className="space-y-4">
      {documents.map((doc) => (
        <div key={doc.id} className="border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold text-gray-900">{doc.event?.title}</h3>
              <p className="text-sm text-gray-500 mt-1">
                Uploaded by {doc.uploaded_by_user?.name} • {new Date(doc.created_at).toLocaleDateString()}
              </p>
            </div>
            <Badge variant="warning">Pending Review</Badge>
          </div>

          <div className="flex items-center gap-4">
            <a
              href={doc.file_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary-600 hover:underline text-sm"
            >
              View Document
            </a>
            <div className="flex gap-2 ml-auto">
              <Button
                variant="primary"
                size="sm"
                onClick={() => handleReview(doc.id, doc.event_id, true)}
                disabled={loading[doc.id]}
              >
                Approve
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={() => handleReview(doc.id, doc.event_id, false)}
                disabled={loading[doc.id]}
              >
                Reject
              </Button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
