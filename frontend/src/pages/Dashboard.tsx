import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  getRuns,
  getStatsSummary,
  getConsistencyStats,
  triggerStravaSync,
  scrapeParkrun
} from '@/lib/api-client';
import { RefreshCw, Trophy, Activity } from 'lucide-react';
import { toast } from '@radix-ui/react-toast';
import { format } from 'date-fns';

export default function Dashboard() {
  const { data: runsData, refetch: refetchRuns } = useQuery({
    queryKey: ['runs'],
    queryFn: () => getRuns({ limit: 5 }),
    staleTime: 60000
  });

  const { data: summary } = useQuery({
    queryKey: ['stats', 'summary'],
    queryFn: () => getStatsSummary(30),
    staleTime: 60000
  });

  const { data: consistency } = useQuery({
    queryKey: ['stats', 'consistency'],
    queryFn: () => getConsistencyStats(30),
    staleTime: 60000
  });

  const handleSync = async () => {
    try {
      const result = await triggerStravaSync();
      toast({
        title: 'Sync Complete',
        description: `Added ${result.activities_added} new activities`,
      });
      refetchRuns();
    } catch (error: any) {
      toast({
        title: 'Sync Failed',
        description: error.response?.data?.error || error.message,
        variant: 'destructive'
      });
    }
  };

  const handleScrape = async () => {
    try {
      const result = await scrapeParkrun(90);
      toast({
        title: 'Scrape Complete',
        description: `Added ${result.resultsAdded} new results`,
      });
    } catch (error: any) {
      toast({
        title: 'Scrape Failed',
        description: error.response?.data?.error || error.message,
        variant: 'destructive'
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <div className="flex space-x-2">
          <Button onClick={handleSync} disabled={!summary}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Sync Strava
          </Button>
          <Button onClick={handleScrape} variant="outline">
            <Activity className="mr-2 h-4 w-4" />
            Scrape Parkrun
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Runs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary?.total_runs || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Distance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {summary ? `${(summary.total_distance_km).toFixed(1)} km` : '0 km'}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Avg Pace</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary?.average_pace || 'N/A'}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Current Streak</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{consistency?.current_streak || 0} days</div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Runs */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Runs</CardTitle>
          <CardDescription>Your latest activities</CardDescription>
        </CardHeader>
        <CardContent>
          {runsData?.runs && runsData.runs.length > 0 ? (
            <div className="space-y-4">
              {runsData.runs.map((run: any) => (
                <div key={run.id} className="flex items-center justify-between border-b pb-2">
                  <div>
                    <p className="font-medium">{run.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(run.start_date_local).toLocaleDateString()} • {(run.distance / 1000).toFixed(2)} km
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm">
                      {Math.floor(run.moving_time / 60)}:{(run.moving_time % 60).toString().padStart(2, '0')}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {run.average_heartrate ? `${run.average_heartrate} bpm` : 'No HR'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground">No runs yet. Connect Strava and sync to get started.</p>
          )}
        </CardContent>
      </Card>

      {/* Personal Records */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Trophy className="mr-2 h-5 w-5" />
            Personal Records
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Records will appear here once you have enough data.</p>
          {/* Personal records will be added in a separate query */}
        </CardContent>
      </Card>
    </div>
  );
}
