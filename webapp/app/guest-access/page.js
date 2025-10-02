"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { SignInForm } from "@/components/signin_form";
import { toast } from "sonner";
import { Router, useRouter, useSearchParams } from "next/navigation";
import { getSession, signIn, useSession } from "next-auth/react";


export default function GuestAccessPage() {
    const { data: session } = useSession();
    const [loading, setLoading] = useState(false);
    const router = useRouter();
    const searchParams = new useSearchParams();
    const redirectTo = searchParams.get("redirectTo") || "/";
    const token = searchParams.get("token") || "";

    if (!token) return

    useEffect(() => {
        const doSignIn = async () => {
            if (token && !session) {
                console.log("Token found, attempting to login user...");
                const decodedToken = Buffer.from(token, "base64").toString("utf-8");
                const [userEmail, userPassword] = decodedToken.split(":");

                setLoading(true);

                const res = await signIn("credentials", {
                    email: userEmail,
                    password: userPassword,
                    redirect: false,
                });
                console.log("Sign-in user:", session);
                if (res.ok) {
                  router.push("/home-management");
                } else {
                    toast.error("Failed to log in. Please check your credentials.");
                    console.error("Sign-in error:", res?.error);
                }

                setLoading(false);
            }
        };

        doSignIn();
    }, [token, session]);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen py-2">
                <h1 className="text-3xl font-bold mb-6">Logging in...</h1>
                <p className="text-lg">Please wait while we log you in...</p>
            </div>
        );
    }
    if (session) {
        console.log("User is already logged in, redirecting to home management...");
        router.push("/home-management");
        return null; // Prevent rendering the page content
    }

    return (
        <div className="flex flex-col items-center justify-center min-h-screen py-2">
            <h1 className="text-3xl font-bold mb-6">Welcome to Fambalker</h1>
            <SignInForm />
        </div>
    );
}
