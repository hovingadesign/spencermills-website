import ical from 'node-ical';
import rrule from 'rrule';
const { RRule } = rrule;

export default async function() {
  const CALENDAR_ICS_URL = 'https://outlook.office365.com/owa/calendar/538c36847685491abca604bee38d38cd@smopc.org/4c45c9f7638a4d698f37daa720157be74879970629639563496/calendar.ics';

  try {
    console.log('Fetching calendar events from ICS feed...');
    const events = await ical.async.fromURL(CALENDAR_ICS_URL);

    // Calculate date range (next 21 days)
    const now = new Date();
    const lookaheadEnd = new Date(now.getTime() + (21 * 24 * 60 * 60 * 1000));

    const eventList = [];

    for (const event of Object.values(events)) {
      if (event.type !== 'VEVENT') continue;

      // Handle recurring events
      if (event.rrule) {
        try {
          const rrule = event.rrule;
          const dates = rrule.between(now, lookaheadEnd, true);

          // Add each occurrence within the date range
          for (const date of dates) {
            // Calculate the duration of the original event
            const duration = event.end ? event.end.getTime() - event.start.getTime() : 0;
            const endDate = new Date(date.getTime() + duration);

            const isAllDay = event.datetype === 'date';
            eventList.push({
              title: event.summary || 'Untitled Event',
              start: date,
              end: endDate,
              location: event.location || null,
              description: event.description || null,
              isAllDay: isAllDay,
              // Pre-format the date/time for display
              formattedDateTime: isAllDay
                ? date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'America/Detroit' })
                : date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: 'America/Detroit' })
            });
          }
        } catch (err) {
          console.warn(`Error processing recurring event: ${event.summary}`, err.message);
        }
      } else {
        // Single event
        const eventDate = event.start;
        if (!eventDate) continue;
        if (eventDate < now || eventDate > lookaheadEnd) continue;

        const isAllDay = event.datetype === 'date';
        eventList.push({
          title: event.summary || 'Untitled Event',
          start: event.start,
          end: event.end,
          location: event.location || null,
          description: event.description || null,
          isAllDay: isAllDay,
          // Pre-format the date/time for display
          formattedDateTime: isAllDay
            ? event.start.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'America/Detroit' })
            : event.start.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: 'America/Detroit' })
        });
      }
    }

    // Sort by start date and limit to next 4 events
    const sortedEvents = eventList
      .sort((a, b) => a.start - b.start)
      .slice(0, 4);

    console.log(`✓ Loaded ${sortedEvents.length} upcoming events`);

    // Debug output
    sortedEvents.forEach(e => {
      console.log(`  - ${e.title}: ${e.start.toISOString()} (all-day: ${e.isAllDay})`);
    });

    return sortedEvents;

  } catch (error) {
    console.error('Error fetching calendar:', error.message);
    return [];
  }
};
