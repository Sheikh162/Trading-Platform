import { Button } from "@/src/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/src/components/ui/card";
import { Input } from "@/src/components/ui/input";
import { Label } from "@radix-ui/react-label";



export default function SettingsPage() {
    return (
        <div className="mx-auto max-w-[800px] px-4 md:px-8 py-12 space-y-8">
            <h1 className="text-3xl font-medium">Settings</h1>

            <Card>
                <CardHeader>
                    <CardTitle>Profile Information</CardTitle>
                    <CardDescription>Update your personal details.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                            <Label>First Name</Label>
                            <Input defaultValue="User" />
                        </div>
                        <div className="space-y-2">
                            <Label>Last Name</Label>
                            <Input defaultValue="One" />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label>Email</Label>
                        <Input defaultValue="user@example.com" disabled />
                    </div>
                    <Button>Save Changes</Button>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Security</CardTitle>
                    <CardDescription>Manage your passwords and 2FA.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                    <div className="flex items-center justify-between p-4 border rounded-lg">
                        <div>
                            <div className="font-medium">Two-Factor Authentication</div>
                            <div className="text-sm text-muted-foreground">Secure your account with 2FA.</div>
                        </div>
                        <Button variant="outline">Enable</Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}