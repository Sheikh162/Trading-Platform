import { Card, CardContent, CardHeader, CardTitle } from "@/src/components/ui/card";
import { LucideIcon } from "lucide-react";

interface StatCardProps {
    title: string;
    value: string;
    subValue?: string;
    icon: LucideIcon;
    trend?: "up" | "down" | "neutral";
}

export function StatCard({ title, value, subValue, icon: Icon, trend }: StatCardProps) {
    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{value}</div>
                {subValue && (
                    <p className={`text-xs mt-1 ${
                        trend === 'up' ? 'text-green-500' : 
                        trend === 'down' ? 'text-red-500' : 'text-muted-foreground'
                    }`}>
                        {subValue}
                    </p>
                )}
            </CardContent>
        </Card>
    );
}