"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import dayjs from "dayjs";

export default function CreateKasgeldRun({ onSuccess }) {
    const form = useForm({
        defaultValues: {
            year: dayjs().add(1, 'year').format('YYYY'),
            unitsAvailable: "24",
            start: dayjs().format('YYYY-MM-DD'),
            end: dayjs().add(1, 'year').format('YYYY-MM-DD'),
        },
    });

    async function onSubmit(values) {

        const data = {
            year: values.year,
            unitsAvailable: values.unitsAvailable,
            start: values.start,
            end: values.end,
            units: [],
        };
        const transactionAMonth = values.unitsAvailable / 12;
        for (let i = 1; i <= 12; i++) {
            for (let j = 1; j <= parseInt(transactionAMonth); j++) {
                data.units.push({ name: `${dayjs(values.start).add(i, 'month').format('MM-YYYY')}`, hand: j, assignedTo: null });
            }
        }

        const res = await fetch("/api/runs", {
            method: "POST",
            body: JSON.stringify(data),
        });

        if (res.status == 400) {
            toast.error("This run already exists.");
            return;
        }
        if (!res.ok) {
            toast.error("Failed to create run");
            return;
        }
        const newRun = await res.json();
        toast.success("Your run is created");
        
        // Call the onSuccess callback to close the sheet and update the runs
        if (onSuccess) {
            onSuccess(newRun);
        }
    }

    // if (loading) {
    return (
        <div className="min-h-screen flex flex-col gap-8 items-center justify-center">
            <h1 className="text-2xl font-bold">Nieuwe Kasgeld Jaar maken</h1>
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    <FormField
                        control={form.control}
                        name="year"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Jaar</FormLabel>
                                <FormControl>
                                    <Input
                                        type="year"
                                        placeholder="e.g. 2025" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="unitsAvailable"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Beschikbare Handen</FormLabel>
                                <FormControl>
                                    <Input placeholder="e.g. 24" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="start"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Eerste Inleg</FormLabel>
                                <FormControl>
                                    <Input type="month" placeholder="e.g. 2025-01" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="end"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Laatste Inleg</FormLabel>
                                <FormControl>
                                    <Input
                                        type="month"
                                        placeholder="e.g. 2025-12" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <Button type="submit" className="w-full">Indienen</Button>
                    <div className="text-sm pb-20 text-gray-500">
                    </div>
                </form>
            </Form>
        </div>
    );
}