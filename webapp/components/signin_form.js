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

    const form = useForm({
        defaultValues: {
            email: "",
            password: "",
        },
    });

    async function onSubmit(values) {

        const res = await signIn("credentials", {
            email: values.email,
            password: values.password,
            redirect: false,
        });

        if (!res.ok) {
            console.error("Failed to login user");
            return;
        }
        // const user = await res.json();
        toast.success("Your are logged in!");
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
                        <Button type="submit" className="w-full">Inloggen</Button>
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