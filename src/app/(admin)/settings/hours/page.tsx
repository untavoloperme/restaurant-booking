"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { Save, Plus, Trash2 } from "lucide-react";

interface Shift {
  start: string;
  end: string;
}

interface DayHours {
  id?: string;
  dayOfWeek: number;
  active: boolean;
  shifts: Shift[];
  slotInterval: number;
}

const DAY_NAMES = ["Domenica", "Lunedì", "Martedì", "Mercoledì", "Giovedì", "Venerdì", "Sabato"];

const DEFAULT_HOURS: DayHours[] = Array.from({ length: 7 }, (_, i) => ({
  dayOfWeek: i,
  active: i !== 0,
  shifts: i === 0 || i === 6
    ? [{ start: "19:00", end: "23:00" }]
    : [{ start: "12:00", end: "14:30" }, { start: "19:00", end: "23:00" }],
  slotInterval: 15,
}));

export default function HoursSettingsPage() {
  const [hours, setHours] = useState<DayHours[]>(DEFAULT_HOURS);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/hours")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setHours(
            data.map((d: DayHours) => ({
              ...d,
              shifts: Array.isArray(d.shifts) ? d.shifts : [],
            }))
          );
        }
      });
  }, []);

  function updateDay(idx: number, update: Partial<DayHours>) {
    setHours((prev) => prev.map((d, i) => (i === idx ? { ...d, ...update } : d)));
  }

  function updateShift(dayIdx: number, shiftIdx: number, field: "start" | "end", value: string) {
    setHours((prev) =>
      prev.map((d, i) => {
        if (i !== dayIdx) return d;
        return {
          ...d,
          shifts: d.shifts.map((s, si) => (si === shiftIdx ? { ...s, [field]: value } : s)),
        };
      })
    );
  }

  function addShift(dayIdx: number) {
    setHours((prev) =>
      prev.map((d, i) =>
        i === dayIdx ? { ...d, shifts: [...d.shifts, { start: "19:00", end: "23:00" }] } : d
      )
    );
  }

  function removeShift(dayIdx: number, shiftIdx: number) {
    setHours((prev) =>
      prev.map((d, i) =>
        i === dayIdx ? { ...d, shifts: d.shifts.filter((_, si) => si !== shiftIdx) } : d
      )
    );
  }

  async function save() {
    setSaving(true);
    try {
      const res = await fetch("/api/hours", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(hours),
      });
      if (!res.ok) throw new Error();
      toast({ title: "Orari salvati", variant: "default" });
    } catch {
      toast({ title: "Errore nel salvataggio", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Orari di apertura</h1>
        <Button onClick={save} disabled={saving}>
          <Save className="h-4 w-4 mr-1" /> {saving ? "Salvataggio…" : "Salva"}
        </Button>
      </div>

      <p className="text-sm text-muted-foreground">
        Nota: sabato e domenica il chatbot propone automaticamente solo i turni serali (19–21 e 21–23).
      </p>

      <div className="space-y-4">
        {hours.map((day, dayIdx) => (
          <Card key={day.dayOfWeek}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">{DAY_NAMES[day.dayOfWeek]}</CardTitle>
                <div className="flex items-center gap-2">
                  <Label className="text-sm text-muted-foreground">Aperto</Label>
                  <Switch
                    checked={day.active}
                    onCheckedChange={(v) => updateDay(dayIdx, { active: v })}
                  />
                </div>
              </div>
            </CardHeader>
            {day.active && (
              <CardContent className="space-y-3">
                {day.shifts.map((shift, shiftIdx) => (
                  <div key={shiftIdx} className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm text-muted-foreground w-14">Turno {shiftIdx + 1}</span>
                    <div className="flex items-center gap-2">
                      <Input
                        type="time"
                        value={shift.start}
                        onChange={(e) => updateShift(dayIdx, shiftIdx, "start", e.target.value)}
                        className="w-28"
                      />
                      <span className="text-sm">–</span>
                      <Input
                        type="time"
                        value={shift.end}
                        onChange={(e) => updateShift(dayIdx, shiftIdx, "end", e.target.value)}
                        className="w-28"
                      />
                    </div>
                    {day.shifts.length > 1 && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive"
                        onClick={() => removeShift(dayIdx, shiftIdx)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
                <Button variant="outline" size="sm" onClick={() => addShift(dayIdx)}>
                  <Plus className="h-3 w-3 mr-1" /> Aggiungi turno
                </Button>
              </CardContent>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}
