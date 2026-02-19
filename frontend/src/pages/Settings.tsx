import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { getStravaStatus, getStravaAuthUrl, triggerStravaSync } from '@/lib/api-client';
import { getParkrunSchedule, updateParkrunSchedule } from '@/lib/api-client';
import { RefreshCw, Link2, Unlink } from 'lucide-react';
import toast from 'react-hot-toast';

export default function Settings() {
  const queryClient = useQueryClient();
  const [stravaName, setStravaName] = useState('');
  const [parkrunUrl, setParkrunUrl] = useState('');
  const [parkrunSchedule, setParkrunSchedule] = useState('');
  const [parkrunEnabled, setParkrunEnabled] = useState(true);

  // Strava status
  const { data: stravaStatus, refetch: refetchStravaStatus } = useQuery({
    queryKey: ['strava', 'status'],
    queryFn: () => getStravaStatus(),
    staleTime: 10000
  });

  // Parkrun schedule
  const { data: parkrunScheduleData } = useQuery({
    queryKey: ['parkrun', 'schedule'],
    queryFn: () => getParkrunSchedule(),
    onSuccess: (data) => {
      setParkrunUrl(data.base_url || '');
      setParkrunSchedule(data.schedule || '');
      setParkrunEnabled(data.enabled);
    }
  });

  const syncMutation = useMutation({
    mutationFn: () => triggerStravaSync(),
    onSuccess: (data) => {
      toast({
        title: 'Sync Complete',
        description: `Added ${data.activities_added} activities`
      });
      queryClient.invalidateQueries({ queryKey: ['runs'] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Sync Failed',
        description: error.response?.data?.error || error.message,
        variant: 'destructive'
      });
    }
  });

  const handleConnectStrava = async () => {
    try {
      const response = await getStravaAuthUrl();
      window.location.href = response.url;
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.error || error.message,
        variant: 'destructive'
      });
    }
  };

  const handleSaveParkrunConfig = async () => {
    try {
      await updateParkrunSchedule({
        schedule: parkrunSchedule,
        enabled: parkrunEnabled
      });
      toast({
        title: 'Settings Saved',
        description: 'Parkrun configuration updated'
      });
      queryClient.invalidateQueries({ queryKey: ['parkrun', 'schedule'] });
    } catch (error: any) {
      toast({
        title: 'Save Failed',
        description: error.response?.data?.error || error.message,
        variant: 'destructive'
      });
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Settings</h1>

      {/* Strava */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Link2 className="mr-2 h-5 w-5" />
            Strava Integration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Connection Status</p>
              <p className="text-sm text-muted-foreground">
                {stravaStatus?.connected
                  ? `Connected • Token expires ${new Date(stravaStatus.token_expires_at).toLocaleDateString()}`
                  : 'Not connected'}
              </p>
            </div>
            {stravaStatus?.connected ? (
              <Button variant="outline" onClick={() => refetchStravaStatus()}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Refresh Status
              </Button>
            ) : (
              <Button onClick={handleConnectStrava}>
                <Link2 className="mr-2 h-4 w-4" />
                Connect Strava
              </Button>
            )}
          </div>

          {stravaStatus?.connected && (
            <div className="flex items-center justify-between rounded-md bg-muted p-4">
              <div>
                <p className="text-sm font-medium">Manual Sync</p>
                <p className="text-xs text-muted-foreground">
                  Fetch new activities immediately (runs automatically every { /* poll interval from config */ }6 hours)
                </p>
              </div>
              <Button onClick={() => syncMutation.mutate()} disabled={syncMutation.isPending}>
                {syncMutation.isPending ? (
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="mr-2 h-4 w-4" />
                )}
                Sync Now
              </Button>
            </div>
          )}

          {!stravaStatus?.connected && (
            <div className="rounded-md bg-muted p-4">
              <p className="text-sm">
                Connect your Strava account to automatically import your running activities.
                You'll be redirected to Strava to authorize.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Parkrun */}
      <Card>
        <CardHeader>
          <CardTitle>Parkrun Configuration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="parkrunUrl">Parkrun Results URL</Label>
            <Input
              id="parkrunUrl"
              value={parkrunUrl}
              onChange={(e) => setParkrunUrl(e.target.value)}
              placeholder="https://www.parkrun.org.uk/kettering/results/"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="scrapeSchedule">Scrape Schedule (Cron)</Label>
            <Input
              id="scrapeSchedule"
              value={parkrunSchedule}
              onChange={(e) => setParkrunSchedule(e.target.value)}
              placeholder="0 8 * * 6"
            />
            <p className="text-xs text-muted-foreground">
              Cron expression when to automatically scrape. Current default: Saturdays at 8 AM.
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="parkrunEnabled"
              checked={parkrunEnabled}
              onChange={(e) => setParkrunEnabled(e.target.checked)}
              className="h-4 w-4"
            />
            <Label htmlFor="parkrunEnabled">Enabled</Label>
          </div>

          <Button onClick={handleSaveParkrunConfig}>Save Configuration</Button>
        </CardContent>
      </Card>

      {/* About */}
      <Card>
        <CardHeader>
          <CardTitle>About</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Running Dashboard v1.0.0
            <br />
            A personal running statistics dashboard.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
