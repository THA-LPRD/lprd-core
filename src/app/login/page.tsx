"use client"

import Link from "next/link"
import {Button} from "@/components/ui/button"

export default function LoginPage() {
    return (
        <div className="min-h-screen flex items-center justify-center">
            <div className="flex flex-col gap-6 max-w-sm text-center">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Welcome to LPRD</h1>
                    <p className="text-muted-foreground mt-2">
                        Sign in to your account to continue
                    </p>
                </div>
                <div className="flex flex-col gap-3">
                    <Button
                        nativeButton={false}
                        render={(props) => <Link {...props} href="/sign-in">Sign in</Link>}
                    />
                    <Button
                        variant="outline"
                        nativeButton={false}
                        render={(props) => <Link {...props} href="/sign-up">Sign up</Link>}
                    />
                </div>
            </div>
        </div>
    )
}