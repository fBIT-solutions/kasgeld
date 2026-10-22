"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Mail, Loader2 } from "lucide-react";
import { toast } from "sonner";

const MESSAGE_SUBJECT_PREFIX = "[Kasgeld Contact]";

export function ContactMessageButton() {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");

  const handleSend = async (e) => {
    e.preventDefault();

    if (!subject.trim() || !message.trim()) {
      toast.error("Onderwerp en bericht zijn verplicht");
      return;
    }

    try {
      setIsLoading(true);

      // Create full subject with prefix
      const fullSubject = `${MESSAGE_SUBJECT_PREFIX} ${subject}`;

      const response = await fetch("/api/contact/send-message", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          subject: fullSubject,
          message,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || "Fout bij verzenden");
        return;
      }

      toast.success(data.message || "Bericht verzonden naar beheerder");
      if (!data.emailSent) {
        toast.info("Bericht is opgeslaan maar email kon niet verzonden worden");
      }
      setSubject("");
      setMessage("");
      setOpen(false);
    } catch (error) {
      console.error("Error sending message:", error);
      toast.error("Fout bij verzenden bericht");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" title="Bericht aan beheerder">
          <Mail className="h-5 w-5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Bericht aan beheerder</DialogTitle>
          <DialogDescription>
            Stuur een bericht naar de beheerder van Kasgeld
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSend} className="space-y-4">
          <div>
            <Label htmlFor="subject">Onderwerp</Label>
            <Input
              id="subject"
              placeholder="Wat is je vraag of opmerking?"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              disabled={isLoading}
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              Prefix &apos;[Kasgeld Contact]&apos; wordt automatisch toegevoegd
            </p>
          </div>

          <div>
            <Label htmlFor="message">Bericht</Label>
            <Textarea
              id="message"
              placeholder="Typ je bericht hier..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              disabled={isLoading}
              required
              className="min-h-[120px]"
            />
          </div>

          <div className="flex gap-2 justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isLoading}
            >
              Annuleren
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Bezig...
                </>
              ) : (
                <>
                  <Mail className="h-4 w-4 mr-2" />
                  Verzenden
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
