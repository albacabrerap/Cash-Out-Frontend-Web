import { CircleCheck, Clock, TimerOff } from 'lucide-react'
import { GOAL_STATUS_LABEL } from '@/lib/goals'
import type { GoalStatus } from '@/types/goals'
import { Badge } from '@/components/ui/badge'

export function GoalStatusBadge({ status }: { status: GoalStatus }) {
  if (status === 'COMPLETED') {
    return (
      <Badge variant="outline" className="border-success/40 text-success">
        <CircleCheck aria-hidden="true" />
        {GOAL_STATUS_LABEL.COMPLETED}
      </Badge>
    )
  }
  if (status === 'EXPIRED') {
    return (
      <Badge variant="outline" className="text-muted-foreground">
        <TimerOff aria-hidden="true" />
        {GOAL_STATUS_LABEL.EXPIRED}
      </Badge>
    )
  }
  return (
    <Badge variant="secondary">
      <Clock aria-hidden="true" />
      {GOAL_STATUS_LABEL.IN_PROGRESS}
    </Badge>
  )
}
