"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { Trash2, Plus } from "lucide-react";
import { format, parseISO } from "date-fns";
import { it } from "date-fns/locale";

interface ClosureDay {
  id: string;
  date: string;
  note: string | null;
}

export default function ClosuresPage() {
  const [closures, setClosures] = useState<ClosureDay[]>([]);
  const [newDate, setNewDate] = useState("");
  const [newNote, setNewNote] = useState("");
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    fetch("/api/closures")
      .then((r) => r.json())
      .then(setClosures);
  }, []);

  async function addClosure() {
    if (!newDate) {
      toast({ title: "Seleziona una data", variant: "destructive" });
      return;
    }
    setAdding(true);
    try {
      const res = await fetch("/api/closures", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: newDate, note: newNote.trim() || undefined }),
      });
      if (!res.ok) {
        const data = await res.json();
        toast({ title: data.error ?? "Errore", variant: "destructive" });
        return;
      }
      const closure: ClosureDay = await res.json();
      setClosures((prev) => [...prev, closure].sort((a, b) => a.date.localeCompare(b.date)));
      setNewDate("");
      setNewNote("");
    } finally {
      setAdding(false);
    }
  }

  async function removeClosure(id: string) {
    await fetch(`/api/closures/${id}`, { method: "DELETE" });
    setClosures((prev) => prev.filter((c) => c.id !== id));
  }

  return (
    <div className="space-y-6 max-w-xl">
      <h1 className="text-2xl font-bold">Giorni di chiusura</h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Aggiungi chiusura</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-2">
            <Input
              type="date"
              value={newDate}
              onChange={(e) => setNewDate(e.target.value)}
              min={new Date().toISOString().split("T")[0]}
              className="flex-1"
            />
            <Input
              placeholder="Nota (opzionale)"
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              className="flex-1"
            />
            <Button onClick={addClosure} disabled={adding}>
              <Plus className="h-4 w-4 mr-1" /> Aggiungi
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-2">
        {closures.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            Nessun giorno di chiusura configurato.
          </p>
        ) : (
          closures.map((c) => (
            <Card key={c.id}>
              <CardContent className="flex items-center justify-between p-4">
                <div>
                  <p className="font-medium">
                    {format(parseISO(c.date.split("T")[0]), "EEEE d MMMM yyyy", { locale: it })}
                  </p>
                  {c.note && <p className="text-sm text-muted-foreground">{c.note}</p>}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-destructive"
                  onClick={() => removeClosure(c.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
