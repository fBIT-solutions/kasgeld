"use client";

import { useEffect, useState } from "react";
import { SignInForm } from "@/components/signin_form";
import { toast } from "sonner";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn, useSession } from "next-auth/react";


export default function GuestAccessPage() {
    const { data: session } = useSession();
    const [loading, setLoading] = useState(false);
    const router = useRouter();
    const searchParams = useSearchParams();
    const token = searchParams.get("token") || "";

    useEffect(() => {
        if (!token) return;

        if (session) {
            router.push("/home-management");
            return;
        }

        const doSignIn = async () => {
            console.log("Token found, attempting to login user...");
            const decodedToken = Buffer.from(token, "base64").toString("utf-8");
            const [userEmail, userPassword] = decodedToken.split(":");

            setLoading(true);

            const res = await signIn("credentials", {
                email: userEmail,
                password: userPassword,
                redirect: false,
            });
            if (res.ok) {
                router.push("/home-management");
            } else {
                toast.error("Failed to log in. Please check your credentials.");
                console.error("Sign-in error:", res?.error);
            }

            setLoading(false);
        };

        doSignIn();
    }, [token, session, router]);

    if (!token) return null;

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen py-2">
                <h1 className="text-3xl font-bold mb-6">Logging in...</h1>
                <p className="text-lg">Please wait while we log you in...</p>
            </div>
        );
    }
    return (
        <div className="flex flex-col items-center justify-center min-h-screen py-2">
            <h1 className="text-3xl font-bold mb-6">Welcome to Fambalker</h1>
            <SignInForm />
        </div>
    );
}
