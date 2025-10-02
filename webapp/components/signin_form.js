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

    const { data: session } = useSession()
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const form = useForm({
        defaultValues: {
            email: "",
            password: "",
        },
    });

    // const [selectedFile, setSelectedFile] = useState(null);

    // useEffect(() => {
    //     if (session) {
    //         checkUser();
    //     }
    // }, [session, router]);

    // async function checkUser() {
    //     const userId = session?.user?.id;
    //     const res = await fetch(`/api/users?id=${userId}`, {
    //         method: "GET",
    //     });
    //     if (res.status === 404) {
    //         setLoading(true);
    //     } else if (res.status === 200) {
    //     const data = await res.json();
    //     if (data.id) {
    //         toast.success("Welcome back!");
    //         router.push("/");
    //     } }
    //     if (!res.ok) {
    //         console.error("Failed to fetch user data");
    //         return;
    //     }
    // }

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
                <h1 className="text-2xl font-bold">Login</h1>
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
                                    <FormLabel>Password</FormLabel>
                                    <FormControl>
                                        <Input
                                            type="password"
                                            placeholder="********" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <Button type="submit" className="w-full">Submit</Button>
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