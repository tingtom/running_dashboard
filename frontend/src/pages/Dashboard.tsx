import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  getRuns,
  getStatsSummary,
  getConsistencyStats,
  triggerStravaSync,
  scrapeParkrun,
  getPersonalRecords
} from '@/lib/api-client';
import { RefreshCw, Trophy, Activity, Flame, Target, TrendingUp, MapPin } from 'lucide-react';
import toast from 'react-hot-toast';
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

  const { data: records } = useQuery({
    queryKey: ['stats', 'pr'],
    queryFn: () => getPersonalRecords(),
    staleTime: 60000
  });

  const handleSync = async () => {
    try {
      const result = await triggerStravaSync();
      toast.success(`✓ Synced ${result.activities_added} new activities`);
      refetchRuns();
    } catch (error: any) {
      toast.error(`✗ ${error.response?.data?.error || error.message}`);
    }
  };

  const handleScrape = async () => {
    try {
      const result = await scrapeParkrun(90);
      toast.success(`✓ Parkrun sync complete: ${result.resultsAdded} results added`);
    } catch (error: any) {
      toast.error(`✗ ${error.response?.data?.error || error.message}`);
    }
  };

  // Calculate some derived stats
  const thisWeekDistance = summary?.total_distance_km || 0;
  const totalRuns = summary?.total_runs || 0;

  return (
    <div className="space-y-6">
      {/* Header with actions */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-emerald-600 bg-clip-text text-transparent">
            Dashboard
          </h1>
          <p className="text-muted-foreground mt-1">
            Your running overview and quick stats
          </p>
        </div>
        <div className="flex space-x-3">
          <Button onClick={handleSync} size="lg" className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg">
            <RefreshCw className="mr-2 h-4 w-4" />
            Sync Strava
          </Button>
          <Button onClick={handleScrape} variant="outline" size="lg" className="shadow-sm">
            <Activity className="mr-2 h-4 w-4" />
            Sync Parkrun
          </Button>
        </div>
      </div>

      {/* Hero Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[
          {
            title: 'Total Distance',
            value: `${(thisWeekDistance).toFixed(1)} km`,
            icon: Target,
            color: 'text-blue-600',
            bg: 'bg-blue-50 dark:bg-blue-900/20',
            border: 'border-l-blue-500'
          },
          {
            title: 'Runs Completed',
            value: totalRuns.toString(),
            icon: Activity,
            color: 'text-emerald-600',
            bg: 'bg-emerald-50 dark:bg-emerald-900/20',
            border: 'border-l-emerald-500'
          },
          {
            title: 'Average Pace',
            value: summary?.average_pace || 'N/A',
            sub: 'min/km',
            icon: TrendingUp,
            color: 'text-purple-600',
            bg: 'bg-purple-50 dark:bg-purple-900/20',
            border: 'border-l-purple-500'
          },
          {
            title: 'Current Streak',
            value: `${consistency?.current_streak || 0} days`,
            icon: Flame,
            color: 'text-amber-600',
            bg: 'bg-amber-50 dark:bg-amber-900/20',
            border: 'border-l-amber-500'
          }
        ].map((stat, idx) => (
          <Card key={idx} className={`${stat.border} border-l-4 shadow-sm hover:shadow-md transition-shadow`}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.title}
                </CardTitle>
                <div className={`p-2 rounded-lg ${stat.bg}`}>
                  <stat.icon className={`h-5 w-5 ${stat.color}`} />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stat.value}</div>
              {stat.sub && (
                <p className="text-xs text-muted-foreground mt-1">{stat.sub}</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Recent Runs */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900">
              <CardTitle>Recent Activities</CardTitle>
              <CardDescription>Your latest running sessions</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              {runsData?.runs && runsData.runs.length > 0 ? (
                <div className="space-y-4">
                  {runsData.runs.map((run: any) => (
                    <div
                      key={run.id}
                      className="group flex items-center justify-between rounded-lg border p-4 hover:border-blue-300 hover:bg-blue-50/50 dark:hover:border-blue-700 dark:hover:bg-blue-900/20 transition-all cursor-pointer"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-semibold">{run.name}</p>
                          {run.average_heartrate && (
                            <Badge variant="secondary" className="text-xs">
                              ♥ {run.average_heartrate}
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(run.start_date_local), 'PPP')} • {(run.distance / 1000).toFixed(2)} km
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-mono font-semibold text-slate-800 dark:text-slate-200">
                          {Math.floor(run.moving_time / 60)}:{(run.moving_time % 60).toString().padStart(2, '0')}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {run.moving_time && run.distance && (
                            <span className="text-blue-600 font-medium">
                              {Math.floor((run.moving_time * 1000 / run.distance) / 60)}:{Math.round((run.moving_time * 1000 / run.distance) % 60).toString().padStart(2, '0')}/km
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-12 text-center">
                  <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                    <Activity className="h-8 w-8 text-slate-400" />
                  </div>
                  <p className="text-lg font-medium">No activities yet</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Connect your Strava account and sync to see your runs here.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Personal Records */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Trophy className="mr-2 h-5 w-5 text-amber-500" />
                Personal Records
              </CardTitle>
            </CardHeader>
            <CardContent>
              {records ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { label: 'Longest Run', value: records.longest_distance ? `${(records.longest_distance.distance / 1000).toFixed(1)} km` : '—' },
                    { label: '5K PB', value: records.fastest_5k?.time || '—' },
                    { label: '10K PB', value: records.fastest_10k?.time || '—' },
                    { label: 'Most Elevation', value: records.most_elevation ? `${records.most_elevation.elevation}m` : '—' }
                  ].map((record, idx) => (
                    <div key={idx} className="rounded-lg border p-4 text-center">
                      <p className="text-sm text-muted-foreground mb-1">{record.label}</p>
                      <p className="text-2xl font-bold">{record.value}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Complete more runs to establish records.</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions Sidebar */}
        <div className="space-y-6">
          <Card className="bg-gradient-to-br from-slate-800 to-slate-900 text-white border-0 shadow-xl">
            <CardHeader>
              <CardTitle className="flex items-center text-white">
                <Flame className="mr-2 h-5 w-5 text-orange-400" />
                Current Streak
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center">
                <div className="text-5xl font-bold text-orange-400 mb-2">
                  {consistency?.current_streak || 0}
                </div>
                <p className="text-slate-300 text-sm">days in a row</p>
              </div>
              <div className="mt-4 pt-4 border-t border-slate-700">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Longest streak:</span>
                  <span className="font-semibold">{consistency?.longest_streak || 0} days</span>
                </div>
                <div className="flex justify-between text-sm mt-2">
                  <span className="text-slate-400">Avg/week:</span>
                  <span className="font-semibold">{consistency?.avg_runs_per_week || 0}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-600 to-indigo-700 text-white border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center text-white">
                <MapPin className="mr-2 h-5 w-5" />
                Quick Stats
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-blue-100">Total runs</span>
                <span className="font-bold text-xl">{summary?.total_runs || 0}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-blue-100">Distance</span>
                <span className="font-bold text-xl">{summary ? `${summary.total_distance_km} km` : '0 km'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-blue-100">Avg speed</span>
                <span className="font-bold text-xl">{summary?.average_speed_kmh || 0} km/h</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
