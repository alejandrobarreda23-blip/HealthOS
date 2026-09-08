import { Activity, Bike, Dumbbell, Footprints, Mountain, PersonStanding, Snowflake, TreePine, Waves } from 'lucide-react';
export default function SportIcon({ sport, size=22 }: { sport: string; size?: number }) {
  const Icon = /Ride|Cycling|Bike/i.test(sport) ? Bike : /Trail|Climb/i.test(sport) ? Mountain : /Hike/i.test(sport) ? TreePine
    : /Run|Walk/i.test(sport) ? Footprints : /Swim/i.test(sport) ? Waves : /Weight|Strength/i.test(sport) ? Dumbbell
    : /Ski|Snow/i.test(sport) ? Snowflake : /Yoga|Pilates/i.test(sport) ? PersonStanding : Activity;
  return <Icon size={size} aria-hidden="true" strokeWidth={1.6}/>;
}
