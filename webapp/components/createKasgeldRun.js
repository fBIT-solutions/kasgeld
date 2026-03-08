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
        
        // Calculate number of months between start and end (inclusive)
        const startDate = dayjs(values.start);
        const endDate = dayjs(values.end);
        const monthDiff = endDate.diff(startDate, 'month') + 1;
        
        // Calculate units per month based on total available hands
        const unitsPerMonth = Math.ceil(parseInt(values.unitsAvailable) / monthDiff);
        
        const now = new Date();
        const currentMonth = `${String(now.getMonth() + 1).padStart(2, '0')}-${now.getFullYear()}`;
        
        // Generate units for each month
        for (let i = 0; i < monthDiff; i++) {
            const monthDate = startDate.add(i, 'month');
            const monthName = monthDate.format('MM-YYYY');
            
            // Set first available month to "open", rest to "pending"
            let status = "pending";
            if (monthName === currentMonth || (i === 0 && startDate.format('MM-YYYY') <= currentMonth)) {
              status = "open";
            }
            
            for (let j = 1; j <= unitsPerMonth; j++) {
                data.units.push({ 
                  name: monthName, 
                  hand: j, 
                  assignedTo: null,
                  status: status
                });
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