import { useRouter } from 'expo-router';
import { View } from 'react-native';
import { BackHeader, Card, Row, Screen, T } from '@/components/ui';
import { today, ymd } from '@/lib/dates';
import { useFood } from '@/lib/food-store';
import { weeklyReview } from '@/lib/planning';
import { useStore } from '@/lib/store';
import { C } from '@/lib/theme';
import { useWorkNest } from '@/lib/worknest-store';

export default function WeeklyReview() {
  const router = useRouter();
  const { habits, workout, profile } = useStore(), { food } = useFood(), nest = useWorkNest();
  const report = weeklyReview(today(), habits, workout.logs, food, profile.days);
  const metrics = [
    { title: 'Habits completed', value: report.current.habitRate === null ? '—' : `${report.current.habitRate}%`, previous: report.previous.habitRate === null ? 'No scheduled habits before' : `${report.previous.habitRate}% before` },
    { title: 'Workouts logged', value: report.current.workouts, previous: `${report.previous.workouts} before` },
    { title: 'Days with food logs', value: `${report.current.mealDays}/7`, previous: `${report.previous.mealDays}/7 before` },
  ];
  const tasksDone = nest.entries.filter((t) => t.completedAt && ymd(new Date(t.completedAt)) >= report.start && ymd(new Date(t.completedAt)) <= report.end && t.status === 'Done').length;
  return <Screen>
    <BackHeader title="Weekly review" onBack={() => router.back()} />
    <Card style={{ backgroundColor: C.hero, gap: 8 }}><T size={12} color={C.heroMuted}>{report.start} — {report.end}</T><T size={26} w="s" color={C.white}>Your week, in perspective.</T><T size={13} color={C.heroMuted}>The last seven complete days, compared with the seven before.</T></Card>
    {metrics.map((m) => <Card key={m.title}><Row style={{ justifyContent: 'space-between' }}><View style={{ gap: 4 }}><T w="m">{m.title}</T><T size={12} color={C.muted}>{m.previous}</T></View><T size={27} w="s" color={C.accent}>{m.value}</T></Row></Card>)}
    <Card style={{ gap: 10 }}><T size={18} w="s">What improved</T>{(report.wins.length ? report.wins : ['No increase in tracked activity this week. Small, consistent steps still count.']).map((s) => <T key={s} color={C.muted}>{s}</T>)}</Card>
    <Card style={{ gap: 10 }}><T size={18} w="s">What slipped</T>{(report.slips.length ? report.slips : ['No decline in your tracked activity compared with the previous week.']).map((s) => <T key={s} color={C.muted}>{s}</T>)}<T size={12} color={C.muted}>These comparisons reflect what you logged, not everything you did.</T></Card>
    <T size={20} w="s">Three goals for next week</T>
    {report.goals.map((goal, index) => <Card key={goal} style={{ flexDirection: 'row', gap: 12, backgroundColor: C.lavender }}><T size={24} w="s" color={C.lavenderInk}>{index + 1}</T><T style={{ flex: 1 }}>{goal}</T></Card>)}
    {nest.status === 'on' && <Card style={{ gap: 6 }}><T w="s">WorkNest</T><T color={C.muted}>{tasksDone} currently connected tasks completed during this period.</T><T size={12} color={C.muted}>Archived or unavailable tasks are not included.</T></Card>}
  </Screen>;
}
