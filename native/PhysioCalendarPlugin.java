package com.joseph.physiodesk;

import android.Manifest;
import android.content.ContentResolver;
import android.content.ContentUris;
import android.content.ContentValues;
import android.database.Cursor;
import android.net.Uri;
import android.provider.CalendarContract;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;
import java.util.TimeZone;

/**
 * Reads and writes the phone's calendars (Google, Samsung, Outlook accounts synced to the phone).
 * Uses the Instances table so repeating events come back as separate sessions.
 */
@CapacitorPlugin(
    name = "PhysioCalendar",
    permissions = {
        @Permission(alias = "calendar", strings = { Manifest.permission.READ_CALENDAR, Manifest.permission.WRITE_CALENDAR })
    }
)
public class PhysioCalendarPlugin extends Plugin {

    private boolean granted() {
        return getPermissionState("calendar") == PermissionState.GRANTED;
    }

    private boolean ensure(PluginCall call) {
        if (!granted()) {
            call.reject("Calendar access is not allowed", "NO_PERMISSION");
            return false;
        }
        return true;
    }

    @PluginMethod
    public void requestAccess(PluginCall call) {
        if (granted()) {
            JSObject r = new JSObject();
            r.put("granted", true);
            call.resolve(r);
        } else {
            requestPermissionForAlias("calendar", call, "accessCallback");
        }
    }

    @PermissionCallback
    private void accessCallback(PluginCall call) {
        JSObject r = new JSObject();
        r.put("granted", granted());
        call.resolve(r);
    }

    @PluginMethod
    public void listCalendars(PluginCall call) {
        if (!ensure(call)) return;
        String[] p = {
            CalendarContract.Calendars._ID,
            CalendarContract.Calendars.CALENDAR_DISPLAY_NAME,
            CalendarContract.Calendars.ACCOUNT_NAME,
            CalendarContract.Calendars.ACCOUNT_TYPE,
            CalendarContract.Calendars.CALENDAR_ACCESS_LEVEL,
            CalendarContract.Calendars.IS_PRIMARY
        };
        JSArray list = new JSArray();
        try (Cursor c = getContext().getContentResolver().query(CalendarContract.Calendars.CONTENT_URI, p, null, null, null)) {
            while (c != null && c.moveToNext()) {
                JSObject o = new JSObject();
                o.put("id", String.valueOf(c.getLong(0)));
                o.put("name", c.getString(1));
                o.put("account", c.getString(2));
                o.put("accountType", c.getString(3));
                o.put("writable", c.getInt(4) >= CalendarContract.Calendars.CAL_ACCESS_CONTRIBUTOR);
                o.put("primary", !c.isNull(5) && c.getInt(5) == 1);
                list.put(o);
            }
        } catch (Exception e) {
            call.reject("Could not read the calendars: " + e.getMessage());
            return;
        }
        JSObject r = new JSObject();
        r.put("calendars", list);
        call.resolve(r);
    }

    @PluginMethod
    public void listInstances(PluginCall call) {
        if (!ensure(call)) return;
        Long start = call.getLong("start");
        Long end = call.getLong("end");
        if (start == null || end == null) {
            call.reject("start and end are required");
            return;
        }
        String[] p = {
            CalendarContract.Instances.EVENT_ID,
            CalendarContract.Instances.BEGIN,
            CalendarContract.Instances.END,
            CalendarContract.Instances.TITLE,
            CalendarContract.Instances.DESCRIPTION,
            CalendarContract.Instances.ALL_DAY,
            CalendarContract.Instances.CALENDAR_ID,
            CalendarContract.Instances.CALENDAR_DISPLAY_NAME,
            CalendarContract.Instances.STATUS,
            CalendarContract.Instances.EVENT_LOCATION
        };
        JSArray list = new JSArray();
        try (Cursor c = CalendarContract.Instances.query(getContext().getContentResolver(), p, start, end)) {
            while (c != null && c.moveToNext()) {
                JSObject o = new JSObject();
                o.put("eventId", String.valueOf(c.getLong(0)));
                o.put("begin", c.getLong(1));
                o.put("end", c.getLong(2));
                o.put("title", c.getString(3));
                o.put("description", c.getString(4));
                o.put("allDay", !c.isNull(5) && c.getInt(5) == 1);
                o.put("calendarId", String.valueOf(c.getLong(6)));
                o.put("calendarName", c.getString(7));
                o.put("status", c.isNull(8) ? 0 : c.getInt(8));
                o.put("location", c.getString(9));
                list.put(o);
            }
        } catch (Exception e) {
            call.reject("Could not read the calendar: " + e.getMessage());
            return;
        }
        JSObject r = new JSObject();
        r.put("events", list);
        call.resolve(r);
    }

    private ContentValues values(PluginCall call, boolean withCalendar) {
        ContentValues v = new ContentValues();
        if (withCalendar) v.put(CalendarContract.Events.CALENDAR_ID, Long.parseLong(call.getString("calendarId")));
        v.put(CalendarContract.Events.TITLE, call.getString("title", ""));
        v.put(CalendarContract.Events.DESCRIPTION, call.getString("description", ""));
        v.put(CalendarContract.Events.EVENT_LOCATION, call.getString("location", ""));
        v.put(CalendarContract.Events.DTSTART, call.getLong("start"));
        v.put(CalendarContract.Events.DTEND, call.getLong("end"));
        v.put(CalendarContract.Events.EVENT_TIMEZONE, TimeZone.getDefault().getID());
        return v;
    }

    @PluginMethod
    public void createEvent(PluginCall call) {
        if (!ensure(call)) return;
        try {
            Uri uri = getContext().getContentResolver().insert(CalendarContract.Events.CONTENT_URI, values(call, true));
            if (uri == null) throw new Exception("the calendar refused the event");
            JSObject r = new JSObject();
            r.put("id", uri.getLastPathSegment());
            call.resolve(r);
        } catch (Exception e) {
            call.reject("Could not add the event: " + e.getMessage());
        }
    }

    @PluginMethod
    public void updateEvent(PluginCall call) {
        if (!ensure(call)) return;
        try {
            long id = Long.parseLong(call.getString("id"));
            ContentResolver cr = getContext().getContentResolver();
            Uri uri = ContentUris.withAppendedId(CalendarContract.Events.CONTENT_URI, id);
            boolean exists = false;
            try (Cursor c = cr.query(uri, new String[] { CalendarContract.Events.DELETED }, null, null, null)) {
                exists = c != null && c.moveToFirst() && c.getInt(0) == 0;
            }
            int n = exists ? cr.update(uri, values(call, false), null, null) : 0;
            JSObject r = new JSObject();
            r.put("updated", n > 0);
            call.resolve(r);
        } catch (Exception e) {
            call.reject("Could not change the event: " + e.getMessage());
        }
    }

    @PluginMethod
    public void deleteEvent(PluginCall call) {
        if (!ensure(call)) return;
        try {
            long id = Long.parseLong(call.getString("id"));
            int n = getContext().getContentResolver().delete(ContentUris.withAppendedId(CalendarContract.Events.CONTENT_URI, id), null, null);
            JSObject r = new JSObject();
            r.put("deleted", n > 0);
            call.resolve(r);
        } catch (Exception e) {
            call.reject("Could not delete the event: " + e.getMessage());
        }
    }
}
