import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';
import {
  getStatsSummary,
  getPaceProgress,
  getWeeklyDistance,
  getPersonalRecords,
  getLocationStats
} from '@/lib/api-client';
import {
  MapPin, TrendingUp, Trophy, Activity, Target
} from 'lucide-react';

export default function Stats() {
  const { data: summary } = useQuery({
    queryKey: ['stats', 'summary'],
    queryFn: () => getStatsSummary(365),
    staleTime: 60000
  });

  const { data: progress } = useQuery({
    queryKey: ['stats', 'progress'],
    queryFn: () => getPaceProgress('weekly'),
    staleTime: 60000
  });

  const { data: weeklyDistance } = useQuery({
    queryKey: ['stats', 'weekly-distance'],
    queryFn: () => getWeeklyDistance(12),
    staleTime: 60000
  });

  const { data: personalRecords } = useQuery({
    queryKey: ['stats', 'pr'],
    queryFn: () => getPersonalRecords(),
    staleTime: 60000
  });

  const { data: locations } = useQuery({
    queryKey: ['stats', 'locations'],
    queryFn: () => getLocationStats(1000),
    staleTime: 60000
  });

  const formatPaceForChart = (seconds: number) => {
    const min = Math.floor(seconds / 60);
    const sec = Math.round(seconds % 60);
    return `${min}:${sec.toString().padStart(2, '0')}`;
  };

  // Helper to parse pace string to seconds
  const paceStringToSeconds = (paceStr: string): number => {
    const [min, sec] = paceStr.split(':').map(Number);
    return min * 60 + sec;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
            Statistics & Analytics
          </h1>
          <p className="text-muted-foreground mt-1">
            Deep dive into your running performance metrics
          </p>
        </div>
        <div className="flex gap-2">
          <Badge variant="outline" className="text-sm px-3 py-1">
            <Calendar className="mr-1 h-3 w-3" />
            Last 365 days
          </Badge>
        </div>
      </div>

      {/* Summary Stats with colorful cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[
          {
            title: 'Total Distance',
            value: summary ? `${summary.total_distance_km} km` : '-',
            icon: Target,
            color: 'text-blue-600',
            bg: 'bg-blue-50 dark:bg-blue-900/20',
            border: 'border-l-blue-500'
          },
          {
            title: 'Runs Completed',
            value: summary?.total_runs?.toString() || '0',
            icon: Activity,
            color: 'text-emerald-600',
            bg: 'bg-emerald-50 dark:bg-emerald-900/20',
            border: 'border-l-emerald-500'
          },
          {
            title: 'Average Pace',
            value: summary?.average_pace || 'N/A',
            icon: TrendingUp,
            color: 'text-purple-600',
            bg: 'bg-purple-50 dark:bg-purple-900/20',
            border: 'border-l-purple-500'
          },
          {
            title: 'Avg Speed',
            value: `${summary?.average_speed_kmh || 0} km/h`,
            icon: Trophy,
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
              <div className="text-2xl font-bold">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Pace Progress Chart */}
      <Card className="bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900 border-0 shadow-lg">
        <CardHeader className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-t-lg">
          <CardTitle className="flex items-center">
            <TrendingUp className="mr-2 h-5 w-5" />
            Pace Improvement Over Time
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          {progress?.data && progress.data.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={progress.data}>
                <defs>
                  <linearGradient id="paceGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="currentColor" strokeOpacity={0.2} />
                <XAxis dataKey="period_label" tick={{ fontSize: 12 }} />
                <YAxis
                  tickFormatter={(value) => formatPaceForChart(value)}
                  domain={['dataMin - 30', 'dataMax + 30']}
                  tick={{ fontSize: 12 }}
                />
                <Tooltip
                  contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }}
                  formatter={(value: number) => [formatPaceForChart(value), 'Avg Pace']}
                />
                <Area
                  type="monotone"
                  dataKey="avg_pace_seconds"
                  stroke="#8b5cf6"
                  strokeWidth={3}
                  fill="url(#paceGradient)"
                  name="Pace (min/km)"
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-[300px] items-center justify-center text-muted-foreground">
              <div className="text-center">
                <TrendingUp className="h-12 w-12 mx-auto mb-3 text-slate-300" />
                <p>Not enough data to display pace progression.</p>
                <p className="text-sm">Complete more runs to see your improvement over time.</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Weekly Distance Chart */}
      <Card className="bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-slate-800 dark:to-slate-900 border-0 shadow-lg">
        <CardHeader className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-t-lg">
          <CardTitle>Weekly Distance (Last 12 Weeks)</CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          {weeklyDistance?.data && weeklyDistance.data.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={weeklyDistance.data}>
                <CartesianGrid strokeDasharray="3 3" stroke="currentColor" strokeOpacity={0.2} />
                <XAxis dataKey="week" tick={{ fontSize: 12 }} />
                <YAxis
                  label={{ value: ' km ', angle: -90, position: 'insideLeft' }}
                  tick={{ fontSize: 12 }}
                />
                <Tooltip
                  contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }}
                  formatter={(value: number) => [`${value} km`, 'Distance']}
                />
                <Bar
                  dataKey="distance"
                  fill="url(#barGradient)"
                  radius={[4, 4, 0, 0]}
                  name="Distance (km)"
                />
                <defs>
                  <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" />
                    <stop offset="100%" stopColor="#14b8a6" />
                  </linearGradient>
                </defs>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-[300px] items-center justify-center text-muted-foreground">
              <div className="text-center">
                <Activity className="h-12 w-12 mx-auto mb-3 text-slate-300" />
                <p>No distance data available yet.</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Two-column section: Personal Records & Locations */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Personal Records */}
        <Card className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-slate-800 dark:to-slate-900 border-0 shadow-lg">
          <CardHeader className="bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-t-lg">
            <CardTitle className="flex items-center">
              <Award className="mr-2 h-5 w-5" />
              Personal Records
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            {personalRecords ? (
              <div className="grid grid-cols-2 gap-4">
                {[
                  { label: 'Longest Run', value: personalRecords.longest_distance ? `${(personalRecords.longest_distance.distance / 1000).toFixed(1)} km` : '—', icon: Target },
                  { label: '5K PB', value: personalRecords.fastest_5k?.time || '—', icon: Trophy },
                  { label: '10K PB', value: personalRecords.fastest_10k?.time || '—', icon: Trophy },
                  { label: 'Most Elevation', value: personalRecords.most_elevation ? `${personalRecords.most_elevation.elevation}m` : '—', icon: MapPin }
                ].map((record, idx) => (
                  <div key={idx} className="rounded-lg border bg-white/50 dark:bg-slate-800/50 p-4 text-center">
                    <record.icon className="h-5 w-5 mx-auto mb-2 text-amber-600" />
                    <p className="text-xs text-muted-foreground mb-1">{record.label}</p>
                    <p className="text-lg font-bold">{record.value}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center text-muted-foreground">
                <Award className="h-12 w-12 mx-auto mb-3 text-slate-300" />
                <p>No records yet. Keep running to establish PBs!</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Location Clusters */}
        <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-slate-800 dark:to-slate-900 border-0 shadow-lg">
          <CardHeader className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-t-lg">
            <CardTitle className="flex items-center">
              <MapPin className="mr-2 h-5 w-5" />
              Favorite Running Spots
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            {locations?.locations && locations.locations.length > 0 ? (
              <div className="space-y-3">
                {locations.locations.slice(0, 5).map((loc: any, idx: number) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between rounded-lg border bg-white/60 dark:bg-slate-800/60 p-3"
                  >
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center text-blue-600 dark:text-blue-300 font-bold text-xs">
                        {idx + 1}
                      </div>
                      <div>
                        <p className="text-sm font-medium">
                          {loc.lat.toFixed(3)}, {loc.lon.toFixed(3)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {(loc.total_distance / 1000).toFixed(1)} km total
                        </p>
                      </div>
                    </div>
                    <Badge variant="default" className="bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300">
                      {loc.run_count} runs
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center text-muted-foreground">
                <MapPin className="h-12 w-12 mx-auto mb-3 text-slate-300" />
                <p>No location data available.</p>
                <p className="text-sm">Runs with GPS data will appear here.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
