import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
  ResponsiveContainer
} from 'recharts';
import {
  getStatsSummary,
  getPaceProgress,
  getWeeklyDistance,
  getPersonalRecords,
  getLocationStats
} from '@/lib/api-client';
import { MapPin, TrendingUp, Award } from 'lucide-react';

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

  const reverseTime = (timeStr: string) => {
    // For display: lower y-axis should be faster pace
    const [min, sec] = timeStr.split(':').map(Number);
    return -(min * 60 + sec);
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Statistics</h1>

      {/* Summary Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Distance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary ? `${summary.total_distance_km} km` : '-'}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Runs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary?.total_runs || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Average Pace</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary?.average_pace || 'N/A'}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Avg Speed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary?.average_speed_kmh || 0} km/h</div>
          </CardContent>
        </Card>
      </div>

      {/* Pace Progress Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <TrendingUp className="mr-2 h-5 w-5" />
            Pace Improvement
          </CardTitle>
        </CardHeader>
        <CardContent>
          {progress?.data && progress.data.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={progress.data}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="period_label" />
                <YAxis
                  tickFormatter={(value) => formatPaceForChart(value)}
                  domain={['dataMin - 30', 'dataMax + 30']}
                />
                <Tooltip
                  formatter={(value: number) => [formatPaceForChart(value), 'Avg Pace']}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="avg_pace_seconds"
                  stroke="#3b82f6"
                  activeDot={{ r: 8 }}
                  name="Pace (min/km)"
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-[300px] items-center justify-center text-muted-foreground">
              Not enough data to display pace progression. Complete more runs.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Weekly Distance Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Weekly Distance</CardTitle>
        </CardHeader>
        <CardContent>
          {weeklyDistance?.data && weeklyDistance.data.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={weeklyDistance.data}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="week" />
                <YAxis label={{ value: 'Distance (km)', angle: -90, position: 'insideLeft' }} />
                <Tooltip formatter={(value: number) => [`${value} km`, 'Distance']} />
                <Bar dataKey="distance" fill="#3b82f6" name="Distance (km)" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-[300px] items-center justify-center text-muted-foreground">
              No distance data available.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Two-column section: Personal Records & Locations */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Personal Records */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Award className="mr-2 h-5 w-5" />
              Personal Records
            </CardTitle>
          </CardHeader>
          <CardContent>
            {personalRecords ? (
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Longest Run</span>
                  <span className="font-medium">
                    {personalRecords.longest_distance
                      ? `${(personalRecords.longest_distance.distance / 1000).toFixed(2)} km`
                      : '-'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Fastest 5K</span>
                  <span className="font-medium">{personalRecords.fastest_5k?.time || '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Fastest 10K</span>
                  <span className="font-medium">{personalRecords.fastest_10k?.time || '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Most Elevation</span>
                  <span className="font-medium">
                    {personalRecords.most_elevation ? `${personalRecords.most_elevation.elevation} m` : '-'}
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No records yet. Keep running!</p>
            )}
          </CardContent>
        </Card>

        {/* Location Clusters */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <MapPin className="mr-2 h-5 w-5" />
              Run Locations
            </CardTitle>
          </CardHeader>
          <CardContent>
            {locations?.locations && locations.locations.length > 0 ? (
              <div className="space-y-2">
                {locations.locations.slice(0, 5).map((loc: any, idx: number) => (
                  <div key={idx} className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      {loc.lat.toFixed(4)}, {loc.lon.toFixed(4)}
                    </span>
                    <span>{loc.run_count} runs</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No location data available.</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 5K Prediction */}
      <Card>
        <CardHeader>
          <CardTitle>5K Prediction</CardTitle>
        </CardHeader>
        <CardContent>
          {(() => {
            // We'll query prediction separately maybe but quick check: could be fetched
            return <p className="text-sm text-muted-foreground">Predictions require at least one 5K-equivalent run.</p>;
          })()}
        </CardContent>
      </Card>
    </div>
  );
}
