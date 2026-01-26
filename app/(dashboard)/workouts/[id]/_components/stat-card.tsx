import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

export function StatCard({ label, value, icon: Icon, badge }: any) {
    return (
        <Card>
            <CardContent className="flex flex-col items-center justify-center p-4 text-center">
                {Icon && <Icon className="h-4 w-4 text-muted-foreground mb-2" />}
                <div className="text-xs text-muted-foreground uppercase font-medium">{label}</div>
                {badge ? (
                    <Badge variant="secondary" className="mt-1 capitalize">{value}</Badge>
                ) : (
                    <div className="text-2xl font-bold tracking-tight mt-1">{value}</div>
                )}
            </CardContent>
        </Card>
    );
}