import { useEffect, useMemo, useState, type ComponentProps, type ReactNode } from "react";

import { Calendar, CalendarDayButton } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import type { ClubEvent } from "@/lib/api";
import { parseEventDate, toDateKey } from "@/lib/event-date";
import { cn } from "@/lib/utils";

function findInitialEvent(events: ClubEvent[]) {
  const ordered = [...events].sort((a, b) => a.eventDate.localeCompare(b.eventDate));
  const today = toDateKey(new Date());
  return ordered.find((event) => event.eventDate >= today) ?? ordered.at(-1);
}

export function EventCalendar({
  events,
  renderEvent,
  className,
}: {
  events: ClubEvent[];
  renderEvent: (event: ClubEvent) => ReactNode;
  className?: string;
}) {
  const eventsByDate = useMemo(() => {
    const grouped = new Map<string, ClubEvent[]>();
    [...events]
      .sort((a, b) =>
        `${a.eventDate}T${a.startTime}`.localeCompare(`${b.eventDate}T${b.startTime}`),
      )
      .forEach((event) => {
        grouped.set(event.eventDate, [...(grouped.get(event.eventDate) ?? []), event]);
      });
    return grouped;
  }, [events]);
  const initialEvent = useMemo(() => findInitialEvent(events), [events]);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(() =>
    initialEvent ? parseEventDate(initialEvent.eventDate) : new Date(),
  );
  const [month, setMonth] = useState<Date>(() =>
    initialEvent ? parseEventDate(initialEvent.eventDate) : new Date(),
  );
  const [selectedEventId, setSelectedEventId] = useState(initialEvent?.id);

  useEffect(() => {
    if (!initialEvent) return;
    const initialDate = parseEventDate(initialEvent.eventDate);
    setSelectedDate(initialDate);
    setMonth(initialDate);
    setSelectedEventId(initialEvent.id);
  }, [initialEvent]);

  const selectedEvents = selectedDate ? (eventsByDate.get(toDateKey(selectedDate)) ?? []) : [];
  const selectedEvent =
    selectedEvents.find((event) => event.id === selectedEventId) ?? selectedEvents[0];
  const eventDates = [...eventsByDate.keys()].map(parseEventDate);

  function EventDayButton(props: ComponentProps<typeof CalendarDayButton>) {
    const count = eventsByDate.get(toDateKey(props.day.date))?.length ?? 0;
    const dateLabel = props.day.date.toLocaleDateString("en-ZA", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });

    return (
      <CalendarDayButton
        {...props}
        aria-label={count ? `${dateLabel}, ${count} event${count === 1 ? "" : "s"}` : dateLabel}
      />
    );
  }

  return (
    <div className={cn("event-calendar-layout", className)}>
      <div className="event-calendar__panel">
        <Calendar
          mode="single"
          month={month}
          onMonthChange={setMonth}
          selected={selectedDate}
          onSelect={(date) => {
            if (!date) return;
            const dayEvents = eventsByDate.get(toDateKey(date));
            if (!dayEvents?.length) return;
            setSelectedDate(date);
            setSelectedEventId(dayEvents[0]?.id);
          }}
          disabled={(date) => !eventsByDate.has(toDateKey(date))}
          modifiers={{ hasEvent: eventDates }}
          modifiersClassNames={{ hasEvent: "event-calendar__day--event" }}
          components={{ DayButton: EventDayButton }}
          showOutsideDays={false}
          className="event-calendar"
          aria-label="Wine and Chapters event calendar"
        />
        <p className="event-calendar__legend">
          <span aria-hidden="true" /> Marked dates have events
        </p>
      </div>

      <div className="event-calendar__details" aria-live="polite">
        {selectedEvents.length > 1 ? (
          <div className="event-calendar__event-switcher" aria-label="Events on selected date">
            {selectedEvents.map((event, index) => (
              <Button
                key={event.id}
                type="button"
                size="sm"
                variant={event.id === selectedEvent?.id ? "hero" : "outline"}
                aria-pressed={event.id === selectedEvent?.id}
                onClick={() => setSelectedEventId(event.id)}
              >
                {index + 1}. {event.title}
              </Button>
            ))}
          </div>
        ) : null}
        {selectedEvent ? renderEvent(selectedEvent) : null}
      </div>
    </div>
  );
}
