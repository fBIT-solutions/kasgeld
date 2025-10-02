"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import dayjs from "dayjs";
import { Popover, PopoverContent, PopoverTrigger,} from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import QRCodeComponent from "@/components/qr-generator";

const roles = ["default", "guest", "member", "family", "worker", "admin"];

export function SignUpForm() {

    const { data: session } = useSession()
    const router = useRouter();
    const [qrToken, setQrToken] = useState(null);
    const [loading, setLoading] = useState(false);
    const [open, setOpen] = useState(false);
    const form = useForm({
        defaultValues: {
            email: "",
            firstname: "",
            displayname: "",
            lastname: "",
            password: "",
            role: ["default"],
            expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        },
    });

    async function onSubmit(values) {

        // const formData = new FormData();
        // formData.append("firstname", values.firstname);
        // formData.append("lastname", values.lastname);
        // formData.append("password", values.password);
        // formData.append("email", values.email);
        // formData.append("role", "default");

        const data = {
            email: values.email,
            firstname: values.firstname,
            displayname: values.displayname,
            lastname: values.lastname,
            password: values.password,
            role: ["guest", "default"],
            expires: values.expires ? new Date(values.expires).toISOString() : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // Default to 7 days if not provided
        };

        const res = await fetch("/api/register", {
            method: "POST",
            body: JSON.stringify(data),
        });

        if (res.status == 400) {
            toast.error("This user account alreay exists, Please use the login form to sign in.");
            return;
        }
        if (!res.ok) {
            toast.error("Failed to create user");
            return;
        }
        const user = await res.json();
        toast.success("Your account is created");

        const userToken = Buffer.from(`${values.email}:${values.password}`).toString("base64");
        setQrToken(`https://fambalker.net/guest-access?token=${userToken}`);
        // router.push("/circles");
    }

    // if (loading) {
    return (
        <div className="min-h-screen flex flex-col gap-8 items-center justify-center">
            <h1 className="text-2xl font-bold">Create your account</h1>
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
                        name="firstname"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Name</FormLabel>
                                <FormControl>
                                    <Input placeholder="e.g. John" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="displayname"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Display Name</FormLabel>
                                <FormControl>
                                    <Input placeholder="zichtbaar voor alle gebruikers" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="lastname"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Lastname</FormLabel>
                                <FormControl>
                                    <Input placeholder="e.g. smith" {...field} />
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
                    <FormField
                        control={form.control}
                        name="role"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Roles</FormLabel>
                                {/* <FormControl> */}
                                <Popover open={open} onOpenChange={setOpen}>
                                    <PopoverTrigger asChild>
                                        <Button variant="outline" className="w-full justify-start">
                                            {field.value?.length
                                                ? field.value.join(", ")
                                                : "Select roles"}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-[200px]">
                                        <div className="flex flex-col space-y-2">
                                            {roles.map((role) => (
                                                <div key={role} className="flex items-center space-x-2">
                                                    <Checkbox
                                                        id={role}
                                                        checked={field.value?.includes(role)}
                                                        onCheckedChange={(checked) => {
                                                            const newValue = checked
                                                                ? [...(field.value || []), role]
                                                                : field.value?.filter((r) => r !== role);

                                                            field.onChange(newValue);
                                                        }}
                                                    />
                                                    <label
                                                        htmlFor={role}
                                                        className="text-sm font-medium leading-none"
                                                    >
                                                        {role.charAt(0).toUpperCase() + role.slice(1)}
                                                    </label>
                                                </div>
                                            ))}
                                        </div>
                                    </PopoverContent>
                                </Popover>
                                {/* </FormControl> */}
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="expires"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Expires</FormLabel>
                                <FormControl>
                                    <Input
                                        type="date"
                                        value={dayjs().add(7, 'day').format('YYYY-MM-DD')}
                                        placeholder="28/05/2025" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <Button type="submit" className="w-full">Submit</Button>
                    <div className="text-sm pb-20 text-gray-500">
                    {qrToken && <QRCodeComponent url={qrToken} />}
                    </div>
                </form>
            </Form>
        </div>
    );
}
//     else {
//         return (<></>);
//     }
// }

export default SignUpForm;