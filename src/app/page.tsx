"use client"

import {useRouter} from "next/navigation"
import {Authenticated, AuthLoading, Unauthenticated} from "convex/react"
import {Spinner} from "@/components/ui/spinner"
import {useEffect} from "react"

function AuthenticatedRedirect() {
    const router = useRouter()
    useEffect(() => {
        router.push("/org/")
    }, [router])
    return null
}

function UnauthenticatedRedirect() {
    const router = useRouter()
    useEffect(() => {
        router.push("/login")
    }, [router])
    return null
}

export default function RootPage() {
    return (
        <main className="min-h-screen flex items-center justify-center">
            <AuthLoading>
                <Spinner className="size-8" />
            </AuthLoading>
            <Authenticated>
                <AuthenticatedRedirect />
            </Authenticated>
            <Unauthenticated>
                <UnauthenticatedRedirect />
            </Unauthenticated>
        </main>
    )
}