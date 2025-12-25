import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';

export async function CalendarPreview() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Calendar Preview</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-center py-8 text-gray-500 text-sm">
          Calendar preview coming soon
        </div>
      </CardContent>
    </Card>
  );
}
