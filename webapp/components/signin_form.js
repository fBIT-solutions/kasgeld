"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { signIn, useSession } from "next-auth/react";


export function SignInForm() {
    const [isLoading, setIsLoading] = useState(false);
    const router = useRouter();

    const form = useForm({
        defaultValues: {
            email: "",
            password: "",
        },
    });

    async function onSubmit(values) {
        setIsLoading(true);

        try {
            const res = await signIn("credentials", {
                email: values.email,
                password: values.password,
                redirect: false,
            });

            // Debug logging
            console.log("SignIn response:", res);

            // Check if the response exists
            if (!res) {
                toast.error("Inloggen mislukt. Controleer je verbinding.");
                setIsLoading(false);
                return;
            }

            // Check for errors first (CredentialsSignin means invalid credentials)
            if (res.error) {
                toast.error("Ongeldige inloggegevens. Controleer je e-mail en wachtwoord.");
                setIsLoading(false);
                return;
            }

            // If we get here and ok is true, login was successful
            if (res.ok === true && !res.error) {
                toast.success("Je bent ingelogd!");
                setIsLoading(false);
                router.push("/");
                return;
            }

            // Any other error
            toast.error("Inloggen mislukt. Probeer het later opnieuw.");
            setIsLoading(false);
        } catch (error) {
            console.error("SignIn error:", error);
            toast.error("Inloggen mislukt. Probeer het later opnieuw.");
            setIsLoading(false);
        }
    }

    // if (loading) {
        return (
            <div className="min-h-screen flex flex-col gap-8 items-center justify-center">
                <h1 className="text-2xl font-bold">Log In</h1>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                        <FormField
                            control={form.control}
                            name="email"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Email</FormLabel>
                                    <FormControl>
                                        <Input 
                                            type="email"
                                            placeholder="e.g. my@example.nl" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="password"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Wachtwoord</FormLabel>
                                    <FormControl>
                                        <Input
                                            type="password"
                                            placeholder="********" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <Button type="submit" className="w-full" disabled={isLoading}>
                            {isLoading ? "Inloggen..." : "Inloggen"}
                        </Button>
                    </form>
                </Form>
            </div>
        );
    } 
//     else {
//         return (<></>);
//     }
// }

export default SignInForm;