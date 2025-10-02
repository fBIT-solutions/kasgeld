"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useRouter } from "next/navigation";


export function CreateEventForm(eventid, onEventCreated) {
  const router = useRouter();
  const form = useForm({
    defaultValues: {
      name: "",
      description: "",
      location: "",
      startDate: "",
      startTime: "",
      endDate: "",
      endTime: "",
      tasks: [],
      flight: {
        flightNumber: "",
        departureAirport: "",
        arrivalAirport: "",
        departure: "",
        arrival: "",
        checkedIn: false,
        returnFlight: false,
        bookedWith: "",
        bookingNumber: "",
        returnFlight: {
          flightNumber: "",
          departureAirport: "",
          arrivalAirport: "",
          departure: "",
          arrival: "",
          checkedIn: false,
        },
      },
      carRental: {
        rentalCompany: "",
        pickupLocation: "",
        dropoffLocation: "",
        pickupDate: "",
        pickupTime: "",
        dropoffDate: "",
        dropoffTime: "",
      },
      accommodation: {
        name: "",
        type: "", // e.g. hotel, Airbnb, etc.
        bookingNumber: "",
        bookedWith: "", // e.g. Booking.com, Airbnb, etc.
        phone: "",
        address: "",
        checkInDate: "",
        checkInTime: "",
        checkOutDate: "",
        checkOutTime: "",
        petsAllowed: false, // Checkbox for pets allowed
        link: "", // Link to the booking
      },
    }});

  const [selectedFile, setSelectedFile] = useState(null);

  async function onSubmit(values) {
    const formData = new FormData();
    formData.append("name", values.name);
    formData.append("description", values.description);
    formData.append("location", values.location);
    formData.append("startDate", values.startDate);
    formData.append("startTime", values.startTime);
    formData.append("endDate", values.endDate);
    formData.append("endTime", values.endTime);
    // formData.append("tasks", values.tasks);

    // Flight details
    // formData.append("flight[flightNumber]", values.flight.flightNumber);
    // formData.append("flight[departureAirport]", values.flight.departureAirport);
    // formData.append("flight[arrivalAirport]", values.flight.arrivalAirport);
    // formData.append("flight[departure]", values.flight.departure);
    // formData.append("flight[arrival]", values.flight.arrival);
    // formData.append("flight[checkedIn]", values.flight.checkedIn);
    // formData.append("flight[returnFlight]", values.flight.returnFlight);
    // formData.append("flight[bookedWith]", values.flight.bookedWith);
    // formData.append("flight[bookingNumber]", values.flight.bookingNumber);

    // Return flight details (if present)
    // if (values.flight.returnFlight && typeof values.flight.returnFlight === "object") {
    //   formData.append("flight[returnFlight][flightNumber]", values.flight.returnFlight.flightNumber);
    //   formData.append("flight[returnFlight][departureAirport]", values.flight.returnFlight.departureAirport);
    //   formData.append("flight[returnFlight][arrivalAirport]", values.flight.returnFlight.arrivalAirport);
    //   formData.append("flight[returnFlight][departure]", values.flight.returnFlight.departure);
    //   formData.append("flight[returnFlight][arrival]", values.flight.returnFlight.arrival);
    //   formData.append("flight[returnFlight][checkedIn]", values.flight.returnFlight.checkedIn);
    // }

    // Car rental details
    // formData.append("carRental[rentalCompany]", values.carRental.rentalCompany);
    // formData.append("carRental[pickupLocation]", values.carRental.pickupLocation);
    // formData.append("carRental[dropoffLocation]", values.carRental.dropoffLocation);
    // formData.append("carRental[pickupDate]", values.carRental.pickupDate);
    // formData.append("carRental[pickupTime]", values.carRental.pickupTime);
    // formData.append("carRental[dropoffDate]", values.carRental.dropoffDate);
    // formData.append("carRental[dropoffTime]", values.carRental.dropoffTime);

    // Accommodation details
    // formData.append("accommodation[name]", values.accommodation.name);
    // formData.append("accommodation[type]", values.accommodation.type);
    // formData.append("accommodation[bookingNumber]", values.accommodation.bookingNumber);
    // formData.append("accommodation[bookedWith]", values.accommodation.bookedWith);
    // formData.append("accommodation[phone]", values.accommodation.phone);
    // formData.append("accommodation[address]", values.accommodation.address);
    // formData.append("accommodation[checkInDate]", values.accommodation.checkInDate);
    // formData.append("accommodation[checkInTime]", values.accommodation.checkInTime);
    // formData.append("accommodation[checkOutDate]", values.accommodation.checkOutDate);
    // formData.append("accommodation[checkOutTime]", values.accommodation.checkOutTime);
    // formData.append("accommodation[petsAllowed]", values.accommodation.petsAllowed);
    // formData.append("accommodation[link]", values.accommodation.link);

    // File upload
    if (selectedFile) {
      formData.append("featuredImage", selectedFile);
    }

    const res = await fetch(`/api/events`, {
      method: "POST",
      body: formData,
    });

    if (!res.ok) {
      console.error("Failed to create event");
      return;
    }

    const event = await res.json();
    toast.success("New event created");

    if (onEventCreated) onEventCreated(event);
    router.push(`/events`);
    // router.push(`/events/?id=${event.id}`);
  }

  // Watch first fields for conditional rendering
  const flightNumber = form.watch("flight.flightNumber");
  const carRentalCompany = form.watch("carRental.rentalCompany");
  const accommodationName = form.watch("accommodation.name");

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Event Name */}
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Event Name</FormLabel>
              <FormControl>
                <Input placeholder="e.g. My Party" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        {/* Description */}
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Input placeholder="Short description" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        {/* Location */}
        <FormField
          control={form.control}
          name="location"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Event Location</FormLabel>
              <FormControl>
                <Input placeholder="e.g. @ My Home" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        {/* Start Date */}
        <FormField
          control={form.control}
          name="startDate"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Event Start Date</FormLabel>
              <FormControl>
                <Input type="date" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        {/* Start Time */}
        <FormField
          control={form.control}
          name="startTime"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Event Start Time</FormLabel>
              <FormControl>
                <Input type="time" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        {/* End Date */}
        <FormField
          control={form.control}
          name="endDate"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Event End Date</FormLabel>
              <FormControl>
                <Input type="date" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        {/* End Time */}
        <FormField
          control={form.control}
          name="endTime"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Event End Time</FormLabel>
              <FormControl>
                <Input type="time" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        {/* File Upload */}
        <FormItem>
          <FormLabel>Upload Event Photo</FormLabel>
          <FormControl>
            <Input
              type="file"
              accept="image/*"
              onChange={(e) => {
                setSelectedFile(e.target.files?.[0]);
              }}
            />
          </FormControl>
          <FormMessage />
        </FormItem>

        <Button type="submit" className="w-full">Create Event</Button>
      </form>
    </Form >
  );
}

export default CreateEventForm;