import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'react-hot-toast';
import { getRecommendations, RecommendationResponse } from '@/lib/api-client';
import { Calendar, Target, TrendingUp, Info } from 'lucide-react';
import { format, startOfWeek, addWeeks } from 'date-fns';

export default function Recommendations() {
  const [data, setData] = useState<RecommendationResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [weeks, setWeeks] = useState(4);
  const [goalDistance, setGoalDistance] = useState<number | undefined>();

  const fetchRecommendations = async () => {
    setLoading(true);
    try {
      const result = await getRecommendations(weeks, goalDistance);
      setData(result);
    } catch (error: any) {
      toast.error('Failed to load recommendations');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecommendations();
  }, []);

  const handleRecalc = () => {
    fetchRecommendations();
  };

  const getRunTypeIcon = (type: string) => {
    switch (type) {
      case 'long':
        return <span className="text-lg">🏃‍♂️</span>;
      case 'tempo':
        return <span className="text-lg">⚡</span>;
      case 'easy':
        return <span className="text-lg">🚶</span>;
      case 'rest':
        return <span className="text-lg">🧘</span>;
      case 'parkrun':
        return <span className="text-lg">🏅</span>;
      default:
        return null;
    }
  };

  const getRunTypeColor = (type: string) => {
    switch (type) {
      case 'long':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300';
      case 'tempo':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300';
      case 'easy':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
      case 'rest':
        return 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400';
      case 'parkrun':
        return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300';
      default:
        return 'bg-slate-100';
    }
  };

  const getDayName = (dateStr: string) => {
    return format(new Date(dateStr), 'EEE');
  };

  const getDateDisplay = (dateStr: string) => {
    return format(new Date(dateStr), 'MMM d');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Training Recommendations</h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">
            Personalized schedule based on your running history
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Label htmlFor="weeks">Weeks</Label>
            <Input
              id="weeks"
              type="number"
              min={1}
              max={12}
              value={weeks}
              onChange={(e) => setWeeks(Math.min(12, Math.max(1, parseInt(e.target.value) || 1)))}
              className="w-20"
            />
          </div>
          <div className="flex items-center gap-2">
            <Label htmlFor="goal">Goal km/week</Label>
            <Input
              id="goal"
              type="number"
              min={5}
              max={200}
              value={goalDistance || ''}
              onChange={(e) => {
                const val = e.target.value;
                setGoalDistance(val === '' ? undefined : Math.min(200, Math.max(5, parseFloat(val) || 5)));
              }}
              placeholder="Auto"
              className="w-24"
            />
          </div>
          <Button onClick={handleRecalc} disabled={loading}>
            {loading ? 'Calculating...' : 'Update'}
          </Button>
        </div>
      </div>

      {data && (
        <>
          {/* Current Stats Card */}
          <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-l-4 border-l-blue-500">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-blue-600" />
                Your Current Stats
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <p className="text-sm text-slate-600 dark:text-slate-400">Weekly Average</p>
                  <p className="text-2xl font-bold text-blue-600">{data.currentStats.weeklyAverage} km</p>
                  <p className="text-xs text-slate-500">{data.currentStats.currentRunsPerWeek} runs/week</p>
                </div>
                <div>
                  <p className="text-sm text-slate-600 dark:text-slate-400">Recent Trend</p>
                  <div className="flex flex-col gap-1 mt-1">
                    {data.currentStats.last4Weeks.map((week, idx) => (
                      <div key={idx} className="flex justify-between text-xs">
                        <span>{week.week}</span>
                        <span>{week.distance} km ({week.runs} runs)</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-sm text-slate-600 dark:text-slate-400">Rationale</p>
                  <p className="text-sm text-slate-700 dark:text-slate-300 mt-1">{data.rationale}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Recommendations Calendar */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-green-600" />
              <h2 className="text-xl font-semibold">Recommended Training Schedule</h2>
            </div>

            {data.recommendations.map((week, weekIdx) => {
              const weekLabel = weekIdx === 0 
                ? 'This Week'
                : format(addWeeks(new Date(week.weekStart), weekIdx), 'MMM d') + ' - ' +
                  format(addWeeks(new Date(week.weekStart), weekIdx + 1), 'MMM d, yyyy');

              return (
                <Card key={weekIdx} className={weekIdx === 0 ? 'border-2 border-green-500' : ''}>
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-center">
                      <CardTitle className="text-lg">
                        Week {weekIdx + 1} ({weekLabel})
                      </CardTitle>
                      <div className="flex items-center gap-2 text-sm">
                        <Target className="h-4 w-4 text-green-600" />
                        <span className="font-medium">{week.targetDistance} km target</span>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-7 gap-2">
                      {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((dayName, dayIdx) => {
                        const dayDate = new Date(week.weekStart);
                        dayDate.setDate(dayDate.getDate() + dayIdx);
                        const dateStr = dayDate.toISOString().split('T')[0];
                        const run = week.runs.find(r => r.date === dateStr);
                        const isToday = weekIdx === 0 && dayIdx === new Date().getDay() || (new Date().getDay()===0?6:new Date().getDay()-1)===dayIdx ? 'today' : false; // rough

                        return (
                          <div
                            key={dayName}
                            className={`min-h-24 p-3 rounded-lg border ${
                              isToday ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-slate-200 dark:border-slate-800'
                            }`}
                          >
                            <div className="text-xs font-medium text-slate-500 mb-2">
                              {dayName}<br/>{format(dayDate, 'd')}
                            </div>
                            {run ? (
                              <div className={`p-2 rounded text-xs ${getRunTypeColor(run.type)}`}>
                                <div className="flex items-center gap-1 mb-1">
                                  {getRunTypeIcon(run.type)}
                                  <span className="capitalize font-medium">{run.type}</span>
                                </div>
                                {run.distance && (
                                  <div className="font-bold">{run.distance} km</div>
                                )}
                                {run.duration && !run.distance && (
                                  <div className="font-bold">{run.duration} min</div>
                                )}
                                <div className="mt-1 opacity-90">{run.notes}</div>
                              </div>
                            ) : (
                              <div className="flex items-center justify-center h-full text-slate-400 text-sm">
                                Off
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </>
      )}

      {loading && (
        <div className="flex items-center justify-center p-8">
          <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full"></div>
          <span className="ml-3">Generating recommendations...</span>
        </div>
      )}

      {!loading && !data && (
        <Card>
          <CardContent className="p-8 text-center text-slate-500">
            <Info className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No running data available to generate recommendations.</p>
            <p className="text-sm">Add some runs first to get personalized suggestions.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
