package com.joseph.physiodesk;

import android.app.AlarmManager;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.os.Build;
import android.telephony.SmsManager;
import androidx.core.app.NotificationCompat;
import androidx.core.content.ContextCompat;
import java.util.ArrayList;
import org.json.JSONArray;
import org.json.JSONObject;

/** Keeps the list of reminder SMS, sets an alarm for each, and sends them. Works with the app closed. */
public class SmsScheduler {
    static final String PREFS = "physiodesk_sms";
    static final String CHANNEL = "sms_reminders";

    static SharedPreferences prefs(Context c) {
        return c.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    }

    static PendingIntent pending(Context c, int id, JSONObject item) {
        Intent i = new Intent(c, SmsAlarmReceiver.class);
        i.setAction("com.joseph.physiodesk.SEND_SMS_" + id);
        if (item != null) i.putExtra("item", item.toString());
        return PendingIntent.getBroadcast(c, id, i, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }

    /** Replaces every scheduled reminder with this list. */
    static void replaceAll(Context c, JSONArray items) throws Exception {
        cancelAll(c);
        prefs(c).edit().putString("items", items.toString()).apply();
        armAll(c);
    }

    static void cancelAll(Context c) {
        AlarmManager am = (AlarmManager) c.getSystemService(Context.ALARM_SERVICE);
        try {
            JSONArray old = new JSONArray(prefs(c).getString("items", "[]"));
            for (int k = 0; k < old.length(); k++) {
                am.cancel(pending(c, old.getJSONObject(k).getInt("id"), null));
            }
        } catch (Exception ignored) {}
        prefs(c).edit().putString("items", "[]").apply();
    }

    /** Sets an alarm for every stored reminder that is still in the future (also used after a restart). */
    static void armAll(Context c) {
        AlarmManager am = (AlarmManager) c.getSystemService(Context.ALARM_SERVICE);
        long now = System.currentTimeMillis();
        try {
            JSONArray items = new JSONArray(prefs(c).getString("items", "[]"));
            for (int k = 0; k < items.length(); k++) {
                JSONObject it = items.getJSONObject(k);
                long at = it.getLong("at");
                if (at < now - 10 * 60 * 1000) continue;
                PendingIntent pi = pending(c, it.getInt("id"), it);
                long when = Math.max(at, now + 1000);
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S && !am.canScheduleExactAlarms()) {
                    am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, when, pi);
                } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                    am.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, when, pi);
                } else {
                    am.setExact(AlarmManager.RTC_WAKEUP, when, pi);
                }
            }
        } catch (Exception ignored) {}
    }

    static boolean canSend(Context c) {
        return ContextCompat.checkSelfPermission(c, android.Manifest.permission.SEND_SMS) == PackageManager.PERMISSION_GRANTED;
    }

    @SuppressWarnings("deprecation")
    static SmsManager manager(Context c) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            SmsManager m = c.getSystemService(SmsManager.class);
            if (m != null) return m;
        }
        return SmsManager.getDefault();
    }

    /** Sends one SMS now. Returns null when it went out, or the reason it didn't. */
    static String send(Context c, String phone, String text) {
        if (!canSend(c)) return "PhysioDesk isn't allowed to send SMS";
        try {
            SmsManager m = manager(c);
            ArrayList<String> parts = m.divideMessage(text);
            if (parts.size() > 1) m.sendMultipartTextMessage(phone, null, parts, null, null);
            else m.sendTextMessage(phone, null, text, null, null);
            return null;
        } catch (Exception e) {
            return e.getMessage() == null ? "the phone refused to send it" : e.getMessage();
        }
    }

    /** Called by the alarm: send, remember the result, and tell the therapist. */
    static void fire(Context c, JSONObject it) {
        String err = send(c, it.optString("phone"), it.optString("text"));
        try {
            JSONArray log = new JSONArray(prefs(c).getString("log", "[]"));
            JSONObject e = new JSONObject();
            e.put("apptId", it.optString("apptId"));
            e.put("key", it.optString("key"));
            e.put("at", System.currentTimeMillis());
            e.put("ok", err == null);
            if (err != null) e.put("error", err);
            log.put(e);
            prefs(c).edit().putString("log", log.toString()).apply();
        } catch (Exception ignored) {}
        notifyResult(c, it, err);
    }

    static void notifyResult(Context c, JSONObject it, String err) {
        try {
            NotificationManager nm = (NotificationManager) c.getSystemService(Context.NOTIFICATION_SERVICE);
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                nm.createNotificationChannel(new NotificationChannel(CHANNEL, "SMS reminders", NotificationManager.IMPORTANCE_DEFAULT));
            }
            Intent open = c.getPackageManager().getLaunchIntentForPackage(c.getPackageName());
            PendingIntent tap = open == null ? null : PendingIntent.getActivity(c, 0, open, PendingIntent.FLAG_IMMUTABLE);
            String name = it.optString("name", "your client");
            NotificationCompat.Builder b = new NotificationCompat.Builder(c, CHANNEL)
                .setSmallIcon(c.getApplicationInfo().icon)
                .setContentTitle(err == null ? "Reminder SMS sent to " + name : "Reminder SMS to " + name + " not sent")
                .setContentText(err == null ? it.optString("text") : err)
                .setStyle(new NotificationCompat.BigTextStyle().bigText(err == null ? it.optString("text") : err))
                .setAutoCancel(true);
            if (tap != null) b.setContentIntent(tap);
            nm.notify(it.optInt("id", 1) ^ 0x5a5a, b.build());
        } catch (Exception ignored) {}
    }
}
