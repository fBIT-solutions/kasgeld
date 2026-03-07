"use client";

import { useState, useEffect } from "react";
import { Info, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import ReactMarkdown from "react-markdown";

export function KasgeldRulesButton() {
  const [open, setOpen] = useState(false);
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchRules = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch("/regels.md");
      if (!response.ok) {
        throw new Error("Regels bestand niet gevonden");
      }

      const text = await response.text();
      setContent(text);
    } catch (err) {
      console.error("Error fetching rules:", err);
      setError(err.message);
      setContent("# Kasgeld Regels\n\nRegels konden niet worden geladen.");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenChange = (newOpen) => {
    setOpen(newOpen);
    if (newOpen && !content) {
      fetchRules();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" title="Kasgeld Regels">
          <Info className="h-5 w-5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Kasgeld Regels & Informatie</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 p-4 rounded-lg">
            <p className="text-sm text-red-800">Fout: {error}</p>
          </div>
        ) : (
          <div className="prose prose-sm max-w-none">
            <ReactMarkdown
              components={{
                h1: ({ node, ...props }) => (
                  <h1 className="text-2xl font-bold mt-4 mb-2" {...props} />
                ),
                h2: ({ node, ...props }) => (
                  <h2 className="text-lg font-semibold mt-4 mb-2" {...props} />
                ),
                h3: ({ node, ...props }) => (
                  <h3 className="text-base font-semibold mt-3 mb-1" {...props} />
                ),
                p: ({ node, ...props }) => (
                  <p className="text-sm text-gray-700 mb-2" {...props} />
                ),
                ul: ({ node, ...props }) => (
                  <ul className="list-disc list-inside text-sm text-gray-700 mb-2" {...props} />
                ),
                ol: ({ node, ...props }) => (
                  <ol className="list-decimal list-inside text-sm text-gray-700 mb-2" {...props} />
                ),
                li: ({ node, ...props }) => (
                  <li className="mb-1 ml-2" {...props} />
                ),
                hr: ({ node, ...props }) => (
                  <hr className="my-4 border-gray-300" {...props} />
                ),
              }}
            >
              {content}
            </ReactMarkdown>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
