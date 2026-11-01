package com.joseph.physiodesk;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import org.json.JSONObject;

public class SmsAlarmReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context context, Intent intent) {
        String raw = intent.getStringExtra("item");
        if (raw == null) return;
        try {
            SmsScheduler.fire(context, new JSONObject(raw));
        } catch (Exception ignored) {}
    }
}
