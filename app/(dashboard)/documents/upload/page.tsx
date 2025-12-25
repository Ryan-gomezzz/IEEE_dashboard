'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardContent } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';

const DOCUMENT_TYPES = [
  { value: 'minutes', label: 'Minutes of the Meet' },
  { value: 'weekly_report', label: 'Weekly Activity Report' },
];

export default function UploadDocumentPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    title: '',
    document_type: '',
    document_date: '',
  });
  const [file, setFile] = useState<File | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      if (selectedFile.type !== 'application/pdf') {
        alert('Only PDF files are allowed');
        return;
      }
      if (selectedFile.size > 10 * 1024 * 1024) {
        alert('File size must be less than 10MB');
        return;
      }
      setFile(selectedFile);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setError('Please select a file');
      return;
    }

    setError('');
    setLoading(true);

    const uploadFormData = new FormData();
    uploadFormData.append('file', file);
    uploadFormData.append('title', formData.title);
    uploadFormData.append('document_type', formData.document_type);
    uploadFormData.append('document_date', formData.document_date);

    try {
      const response = await fetch('/api/documents', {
        method: 'POST',
        body: uploadFormData,
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to upload document');
        setLoading(false);
        return;
      }

      router.push('/documents');
    } catch (err) {
      setError('An error occurred. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div>
      <PageHeader title="Upload Chapter Document" />
      
      <Card>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                {error}
              </div>
            )}

            <Input
              label="Document Title"
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Enter document title"
            />

            <Select
              label="Document Type"
              required
              options={DOCUMENT_TYPES}
              value={formData.document_type}
              onChange={(e) => setFormData({ ...formData, document_type: e.target.value })}
            />

            <Input
              label="Document Date"
              type="date"
              required
              value={formData.document_date}
              onChange={(e) => setFormData({ ...formData, document_date: e.target.value })}
            />

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Upload Document (PDF - Max 10MB)
              </label>
              <input
                type="file"
                accept=".pdf"
                onChange={handleFileChange}
                required
                className="block w-full text-sm text-gray-900 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100"
              />
              {file && (
                <p className="mt-2 text-sm text-gray-600">Selected: {file.name}</p>
              )}
            </div>

            <div className="flex gap-4">
              <Button type="submit" disabled={loading}>
                {loading ? 'Uploading...' : 'Upload Document'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
              >
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
