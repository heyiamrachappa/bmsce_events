import { supabase } from "@/integrations/supabase/client";

export const eventService = {
    /**
     * Fetch all published events
     */
    async fetchAllEvents() {
        const { data, error } = await supabase
            .from("events")
            .select("*, clubs(name), colleges(name), event_categories(name, color)")
            .eq("is_published", true)
            .eq("archived", false)
            .gte("end_date", new Date().toISOString())
            .order("start_date", { ascending: true });
        if (error) throw error;
        return data;
    },

    /**
     * Fetch events for a specific college (BMSCE)
     */
    async fetchEventsByCollege(collegeId: string) {
        const { data, error } = await supabase
            .from("events")
            .select("*, clubs(name), colleges(name), event_categories(name, color)")
            .eq("college_id", collegeId)
            .eq("is_published", true)
            .eq("archived", false)
            .gte("end_date", new Date().toISOString())
            .order("start_date", { ascending: true });
        if (error) throw error;
        return data;
    },

    /**
     * Fetch events managed by the current organizer (club-based)
     */
    async fetchOrganizerEvents(userId: string) {
        const { data, error } = await supabase
            .from("events")
            .select("*, clubs(name), colleges(name), event_categories(name, color)")
            .eq("created_by", userId)
            .order("start_date", { ascending: false });
        if (error) throw error;
        return data;
    },

    /**
     * Create a new event linked to the organizer's club
     */
    async createEvent(eventData: any) {
        // Validation
        if (!eventData.title) throw new Error("Title is required");
        if (!eventData.start_date || !eventData.end_date) throw new Error("Start and end dates are required");
        if (new Date(eventData.start_date) >= new Date(eventData.end_date)) {
            throw new Error("End date must be after start date");
        }

        const { data, error } = await supabase
            .from("events")
            .insert(eventData)
            .select()
            .single();
        if (error) throw error;
        return data;
    },

    /**
     * Register a user for an event
     */
    async registerForEvent(userId: string, eventId: string) {
        const { data, error } = await supabase
            .from("event_registrations")
            .insert({ user_id: userId, event_id: eventId })
            .select()
            .single();
        if (error) throw error;
        return data;
    },

    /**
     * Unregister a user from an event
     */
    async unregisterFromEvent(registrationId: string) {
        const { error } = await supabase
            .from("event_registrations")
            .delete()
            .eq("id", registrationId);
        if (error) throw error;
    }
};
