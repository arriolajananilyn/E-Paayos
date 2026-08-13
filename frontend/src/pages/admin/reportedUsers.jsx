import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertTriangle } from 'lucide-react'

/** Admin: reported users list (wire to moderation API when ready). */
export default function AdminReportedUsers() {
  return (
    <Card className="border-dashed border-border/80 bg-background/60 shadow-none">
      <CardHeader>
        <CardTitle className="text-base">Reported User</CardTitle>
        <CardDescription>
          Users with reports or flagged activity. Connect the admin moderation API when ready.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex min-h-[220px] flex-col items-center justify-center rounded-md border border-border/60 bg-muted/30 p-8 text-center">
        <AlertTriangle className="mb-3 h-10 w-10 text-muted-foreground/50" />
        <p className="max-w-md text-sm text-muted-foreground">
          No report data yet. When an endpoint is available (e.g. GET /api/reports/users), render the list here.
        </p>
      </CardContent>
    </Card>
  )
}
