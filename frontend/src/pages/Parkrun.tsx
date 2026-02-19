import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  getParkrunResults,
  scrapeParkrun,
  getParkrunSchedule
} from '@/lib/api-client';
import { Calendar, RefreshCw, Clock, Trophy, Target, Search } from 'lucide-react';
import toast from 'react-hot-toast';

export default function Parkrun() {
  const [runnerFilter, setRunnerFilter] = useState('');
  const { data: resultsData, refetch } = useQuery({
    queryKey: ['parkrun', 'results', runnerFilter],
    queryFn: () => getParkrunResults({ runnerName: runnerFilter || undefined, limit: 50 }),
    staleTime: 30000
  });

  const { data: schedule, error: scheduleError } = useQuery({
    queryKey: ['parkrun', 'schedule'],
    queryFn: () => getParkrunSchedule(),
    refetchInterval: 60000, // update next run time every minute
    retry: 1
  });

  const handleScrape = async () => {
    try {
      const result = await scrapeParkrun(90);
      toast.success(`✓ Found ${result.eventsFound} events, added ${result.resultsAdded} results.`);
      refetch();
    } catch (error: any) {
      toast.error(`✗ ${error.response?.data?.error || error.message}`);
    }
  };

  const formatNextRun = (dateStr?: string) => {
    if (!dateStr) return 'Not scheduled';
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return 'Invalid date';
      return date.toLocaleDateString('en-GB', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (e) {
      return 'Error';
    }
  };

  // Calculate some quick stats
  const totalResults = resultsData?.results?.length || 0;
  const avgPosition = resultsData?.results?.length > 0
    ? Math.round(resultsData.results.reduce((sum: number, r: any) => sum + (r.position || 0), 0) / resultsData.results.length)
    : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Parkrun</h1>
        <div className="flex items-center space-x-4">
          <div className="flex items-center text-sm text-muted-foreground">
            <Clock className="mr-1 h-4 w-4" />
            Next scrape: {scheduleError ? 'Error loading schedule' : formatNextRun(schedule?.next_run)}
          </div>
          <Button onClick={handleScrape}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Scrape Now
          </Button>
        </div>
      </div>
          <Button
            onClick={handleScrape}
            size="lg"
            className="bg-white text-purple-700 hover:bg-purple-50 shadow-lg"
          >
            <RefreshCw className="mr-2 h-5 w-5" />
            Sync Results
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Results</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">{totalResults}</div>
            <p className="text-xs text-muted-foreground mt-1">runs recorded</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-emerald-500">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Next Auto-Sync</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold text-emerald-600">
              {formatNextRun(schedule?.next_run)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {schedule?.enabled ? 'Automated' : 'Disabled'}
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-amber-500">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Avg Position</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-amber-600">
              {avgPosition > 0 ? `#${avgPosition}` : '-'}
            </div>
            <p className="text-xs text-muted-foreground mt-1">out of all runners</p>
          </CardContent>
        </Card>
      </div>

      {/* Filter Card */}
      <Card className="bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Search className="mr-2 h-5 w-5 text-blue-600" />
            Search Your Results
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 items-end">
            <div className="flex-1 max-w-md">
              <label className="text-sm font-medium mb-1.5 block">Runner Name</label>
              <Input
                placeholder="Enter your name as it appears on parkrun"
                value={runnerFilter}
                onChange={(e) => setRunnerFilter(e.target.value)}
                className="bg-white dark:bg-slate-950"
              />
            </div>
            <Button
              variant="outline"
              onClick={() => setRunnerFilter('')}
              disabled={!runnerFilter}
            >
              Clear
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Results Table */}
      <Card>
        <CardHeader className="bg-gradient-to-r from-slate-100 to-slate-50 dark:from-slate-800 dark:to-slate-900">
          <CardTitle className="flex items-center">
            <Target className="mr-2 h-5 w-5 text-emerald-600" />
            Results History
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {resultsData?.results && resultsData.results.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-100 dark:bg-slate-800">
                  <tr>
                    {['Date', 'Position', 'Time', 'Category', 'Gender Pos', 'Age Grade'].map((col, i) => (
                      <th key={col} className="py-3 px-4 text-left font-semibold text-slate-700 dark:text-slate-300">
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {resultsData.results.map((result: any, idx: number) => {
                    const position = result.position || 0;
                    const total = result.total_runners || 0;
                    const percentile = total > 0 ? Math.round((position / total) * 100) : 0;
                    let badgeVariant: "default" | "secondary" | "destructive" | "outline" | "success" | "warning" = "default";
                    if (percentile <= 10) badgeVariant = "success";
                    else if (percentile <= 25) badgeVariant = "default";
                    else if (percentile <= 50) badgeVariant = "secondary";
                    else badgeVariant = "outline";

                    return (
                      <tr
                        key={idx}
                        className="border-b hover:bg-blue-50/50 dark:hover:bg-blue-900/20 transition-colors"
                      >
                        <td className="py-3 px-4 font-medium">
                          {new Date(result.parkrun_date).toLocaleDateString('en-GB', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric'
                          })}
                        </td>
                        <td className="py-3 px-4">
                          <Badge variant={badgeVariant}>
                            {position}/{total}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 font-mono text-base font-semibold text-slate-800 dark:text-slate-200">
                          {result.finish_time}
                        </td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-1 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300 text-xs font-medium">
                            {result.age_category || 'N/A'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-muted-foreground">
                          {result.gender_position ? `${result.gender_position}/${total}` : '-'}
                        </td>
                        <td className="py-3 px-4">
                          {result.age_grading ? (
                            <span className={`font-medium ${result.age_grading >= 80 ? 'text-emerald-600' : result.age_grading >= 50 ? 'text-amber-600' : 'text-slate-600'}`}>
                              {result.age_grading.toFixed(1)}%
                            </span>
                          ) : '-'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="py-16 text-center">
              <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                <Search className="h-8 w-8 text-slate-400" />
              </div>
              <p className="text-lg font-medium text-slate-700 dark:text-slate-300">
                No parkrun results found
              </p>
              <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">
                {runnerFilter
                  ? `No results match "${runnerFilter}". Try a different name or clear the filter.`
                  : 'Scrape your parkrun results to see them here. Kettering parkrun is configured by default.'}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Schedule Card */}
      <Card className="bg-gradient-to-br from-slate-800 to-slate-900 text-white border-0 shadow-xl">
        <CardHeader>
          <CardTitle className="flex items-center text-white">
            <Calendar className="mr-2 h-5 w-5 text-emerald-400" />
            Automation Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <p className="text-sm text-slate-400 mb-1">Cron Schedule</p>
              <code className="block bg-slate-950/50 px-3 py-2 rounded text-emerald-400 font-mono text-sm">
                {schedule?.schedule || 'Not set'}
              </code>
            </div>
            <div>
              <p className="text-sm text-slate-400 mb-1">Status</p>
              <Badge variant={schedule?.enabled ? "success" : "destructive"} className="text-sm px-3 py-1">
                {schedule?.enabled ? 'Active' : 'Disabled'}
              </Badge>
            </div>
            <div>
              <p className="text-sm text-slate-400 mb-1">Manual Trigger</p>
              <p className="text-sm text-slate-300">
                Scrape the last 90 days of results immediately
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
