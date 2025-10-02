"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { SignInForm } from "@/components/signin_form";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";


export default function SignInPage() {
    const { data: session } = useSession();
    const [loading, setLoading] = useState(false);

    return (
        <div className="flex flex-col items-center justify-center min-h-screen py-2">
            <h1 className="text-3xl font-bold mb-6">Sign in to Fambalker</h1>
        </div>
    );
}
