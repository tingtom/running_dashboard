import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { getRuns, deleteRun } from '@/lib/api-client';
import { MapPin, Trash2 } from 'lucide-react';
import RunMap from '@/components/maps/RunMap';
import { format } from 'date-fns';

export default function Runs() {
  const [selectedRunId, setSelectedRunId] = useState<number | null>(null);
  const [filters, setFilters] = useState({ startDate: '', endDate: '' });

  const { data: runsData, refetch } = useQuery({
    queryKey: ['runs', filters],
    queryFn: () => getRuns({
      startDate: filters.startDate || undefined,
      endDate: filters.endDate || undefined,
      limit: 100,
      sortBy: 'start_date',
      sortOrder: 'desc'
    }),
    staleTime: 30000
  });

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this run?')) return;
    try {
      await deleteRun(id);
      refetch();
      if (selectedRunId === id) setSelectedRunId(null);
    } catch (error: any) {
      alert(`Delete failed: ${error.response?.data?.error || error.message}`);
    }
  };

  const selectedRun = runsData?.runs.find((r: any) => r.id === selectedRunId);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Runs</h1>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filter Runs</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-end gap-4">
            <div className="flex items-center space-x-4">
              <div className="grid grid-cols-2 gap-1.5">
                <div>
                  <Label htmlFor="startDate" className="text-xs">Start</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={filters.startDate}
                    onChange={(e) => setFilters(prev => ({ ...prev, startDate: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="endDate" className="text-xs">End</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={filters.endDate}
                    onChange={(e) => setFilters(prev => ({ ...prev, endDate: e.target.value }))}
                  />
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setFilters({
                    startDate: '',
                    endDate: ''
                  });
                }}
              >
                Clear
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Runs List */}
        <div className="lg:col-span-2 space-y-4">
          {runsData?.runs && runsData.runs.length > 0 ? (
            runsData.runs.map((run: any) => (
              <Card
                key={run.id}
                className={`cursor-pointer transition-colors ${selectedRunId === run.id ? 'border-primary' : ''}`}
                onClick={() => setSelectedRunId(run.id)}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-base">{run.name}</CardTitle>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(run.start_date_local), 'PPP p')}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(run.id);
                      }}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap items-center gap-4">
                    <div>
                      <p className="text-muted-foreground">Distance</p>
                      <p className="font-medium">{(run.distance / 1000).toFixed(1)} km</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Duration</p>
                      <p className="font-medium">
                        {Math.floor(run.moving_time / 60)}:{(run.moving_time % 60).toString().padStart(2, '0')}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Avg Pace</p>
                      <p className="font-medium">
                        {run.moving_time && run.distance
                          ? `${Math.floor((run.moving_time * 1000 / run.distance) / 60)}:${Math.round((run.moving_time * 1000 / run.distance) % 60).toString().padStart(2, '0')} /km`
                          : 'N/A'}
                      </p>
                    </div>
                  </div>
                  {run.average_heartrate && (
                    <p className="mt-2 text-sm text-muted-foreground">
                      Avg HR: {run.average_heartrate} bpm
                    </p>
                  )}
                </CardContent>
              </Card>
            ))
          ) : (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                No runs found. Connect Strava and sync your activities.
              </CardContent>
            </Card>
          )}
        </div>

        {/* Map */}
        <div className="lg:col-span-1">
          <Card className="sticky top-6 h-[600px]">
            <CardHeader>
              <CardTitle className="flex items-center">
                <MapPin className="mr-2 h-5 w-5" />
                Route Map
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {selectedRun && selectedRun.polyline ? (
                <RunMap polyline={selectedRun.polyline} startLat={selectedRun.latitude_start} startLng={selectedRun.longitude_start} />
              ) : (
                <div className="flex h-[500px] items-center justify-center text-muted-foreground">
                  Select a run to view map
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
