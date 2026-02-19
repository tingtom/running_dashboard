import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  getParkrunResults,
  scrapeParkrun,
  getParkrunSchedule
} from '@/lib/api-client';
import { Calendar, RefreshCw, Clock } from 'lucide-react';
import { toast } from '@radix-ui/react-toast';

export default function Parkrun() {
  const [runnerFilter, setRunnerFilter] = useState('');
  const { data: resultsData, refetch } = useQuery({
    queryKey: ['parkrun', 'results', runnerFilter],
    queryFn: () => getParkrunResults({ runnerName: runnerFilter || undefined, limit: 50 }),
    staleTime: 30000
  });

  const { data: schedule } = useQuery({
    queryKey: ['parkrun', 'schedule'],
    queryFn: () => getParkrunSchedule(),
    refetchInterval: 60000 // update next run time every minute
  });

  const handleScrape = async () => {
    try {
      const result = await scrapeParkrun(90);
      toast({
        title: 'Scrape Complete',
        description: `Found ${result.eventsFound} events, added ${result.resultsAdded} results.`
      });
      refetch();
    } catch (error: any) {
      toast({
        title: 'Scrape Failed',
        description: error.response?.data?.error || error.message,
        variant: 'destructive'
      });
    }
  };

  const formatNextRun = (dateStr?: string) => {
    if (!dateStr) return 'Not scheduled';
    const date = new Date(dateStr);
    return date.toLocaleString();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Parkrun</h1>
        <div className="flex items-center space-x-4">
          <div className="flex items-center text-sm text-muted-foreground">
            <Clock className="mr-1 h-4 w-4" />
            Next scrape: {formatNextRun(schedule?.next_run)}
          </div>
          <Button onClick={handleScrape}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Scrape Now
          </Button>
        </div>
      </div>

      {/* Filter */}
      <Card>
        <CardHeader>
          <CardTitle>Filter Results</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid w-full max-w-sm items-center gap-1.5">
            <label className="text-sm font-medium">Runner Name</label>
            <Input
              placeholder="Your name"
              value={runnerFilter}
              onChange={(e) => setRunnerFilter(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Results Table */}
      <Card>
        <CardHeader>
          <CardTitle>Results</CardTitle>
        </CardHeader>
        <CardContent>
          {resultsData?.results && resultsData.results.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="py-2 text-left">Date</th>
                    <th className="py-2 text-left">Position</th>
                    <th className="py-2 text-left">Time</th>
                    <th className="py-2 text-left">Category</th>
                    <th className="py-2 text-left">Gender Pos</th>
                    <th className="py-2 text-left">Age Grade</th>
                  </tr>
                </thead>
                <tbody>
                  {resultsData.results.map((result: any, idx: number) => (
                    <tr key={idx} className="border-b">
                      <td className="py-2">
                        {new Date(result.parkrun_date).toLocaleDateString()}
                      </td>
                      <td className="py-2">
                        {result.position}/{result.total_runners}
                      </td>
                      <td className="py-2 font-mono">{result.finish_time}</td>
                      <td className="py-2">{result.age_category}</td>
                      <td className="py-2">
                        {result.gender_position ? `${result.gender_position}/${result.total_runners}` : '-'}
                      </td>
                      <td className="py-2">
                        {result.age_grading ? `${result.age_grading.toFixed(1)}%` : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="py-8 text-center text-muted-foreground">
              No parkrun results found. Scrape now to get your results.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Schedule Info Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Calendar className="mr-2 h-5 w-5" />
            Scrape Schedule
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-1 text-sm">
            <p><span className="font-medium">Cron:</span> {schedule?.schedule || 'Not set'}</p>
            <p><span className="font-medium">Enabled:</span> {schedule?.enabled ? 'Yes' : 'No'}</p>
            <p className="text-muted-foreground">
              Parkrun results are automatically scraped weekly. You can also manually trigger a scrape for the last 90 days.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
