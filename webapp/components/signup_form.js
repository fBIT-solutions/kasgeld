"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import dayjs from "dayjs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import QRCodeComponent from "@/components/qr-generator";
import { Save, X } from "lucide-react";

const roles = ["default", "guest", "member", "family", "admin"];

export function SignUpForm() {
    const [qrToken, setQrToken] = useState(null);
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

        const data = {
            email: values.email,
            firstname: values.firstname,
            displayname: values.displayname,
            lastname: values.lastname,
            password: values.password,
            role: values.role,
            expires: values.expires ? new Date(values.expires).toISOString() : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // Default to 7 days if not provided
        };

        const res = await fetch("/api/register", {
            method: "POST",
            body: JSON.stringify(data),
        });

        if (res.status == 400) {
            toast.error("Dit e-mailadres is al in gebruik.");
            return;
        }
        if (!res.ok) {
            toast.error("Fout bij het aanmaken van deelnemer.");
            return;
        }
        const user = await res.json();
        toast.success("Je account is aangemaakt.");

        const userToken = Buffer.from(`${values.email}:${values.password}`).toString("base64");
        setQrToken(`https://fambalker.net/guest-access?token=${userToken}`);
    }

    // if (loading) {
    return (
        <div className="min-h-screen flex flex-col gap-8 items-center justify-center">
            <h1 className="text-2xl font-bold">Account aanmaken</h1>
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
                                <FormLabel>Voornaam</FormLabel>
                                <FormControl>
                                    <Input placeholder="bijv. John" {...field} />
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
                                <FormLabel>Weergave Naam</FormLabel>
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
                                <FormLabel>Achternaam</FormLabel>
                                <FormControl>
                                    <Input placeholder="bijv. Smith" {...field} />
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
                    <FormField
                        control={form.control}
                        name="role"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Rollen</FormLabel>
                                <Dialog open={open} onOpenChange={setOpen}>
                                    <DialogTrigger asChild>
                                        <Button variant="outline" className="w-full justify-start">
                                            {field.value?.length
                                                ? field.value.join(", ")
                                                : "Selecteer rollen"}
                                        </Button>
                                    </DialogTrigger>
                                    <DialogContent className="sm:max-w-md">
                                        <DialogHeader>
                                            <DialogTitle>Selecteer rollen</DialogTitle>
                                        </DialogHeader>
                                        <div className="flex flex-col space-y-3 py-4">
                                            {roles.map((role) => (
                                                <div 
                                                    key={role} 
                                                    className="flex items-center space-x-3 p-2 rounded-md hover:bg-gray-50 cursor-pointer"
                                                    onClick={() => {
                                                        // Toggle the checkbox state
                                                        const isCurrentlyChecked = field.value?.includes(role);
                                                        const newValue = !isCurrentlyChecked
                                                            ? [...(field.value || []), role]
                                                            : field.value?.filter((r) => r !== role);
                                                        field.onChange(newValue);
                                                    }}
                                                >
                                                    <Checkbox
                                                        id={role}
                                                        checked={field.value?.includes(role) || false}
                                                        onCheckedChange={(checked) => {
                                                            const newValue = checked
                                                                ? [...(field.value || []), role]
                                                                : field.value?.filter((r) => r !== role);
                                                            field.onChange(newValue);
                                                        }}
                                                    />
                                                    <label
                                                        htmlFor={role}
                                                        className="text-sm font-medium leading-none cursor-pointer flex-1"
                                                    >
                                                        {role.charAt(0).toUpperCase() + role.slice(1)}
                                                    </label>
                                                </div>
                                            ))}
                                        </div>
                                        <div className="flex justify-end gap-2 pt-4 border-t">
                                            <Button 
                                                variant="outline" 
                                                onClick={() => setOpen(false)}
                                            >
                                                Annuleren
                                            </Button>
                                            <Button 
                                                onClick={() => setOpen(false)}
                                            >
                                                <Save className="w-4 h-4 mr-2" />
                                                Klaar
                                            </Button>
                                        </div>
                                    </DialogContent>
                                </Dialog>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="expires"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Verloopt</FormLabel>
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
                    <Button type="submit" className="w-full">Verzenden</Button>
                    <div className="text-sm pb-40 text-gray-500">
                    {qrToken && <QRCodeComponent url={qrToken} />}
                    </div>
                </form>
            </Form>
        </div>
    );
}

export default SignUpForm;