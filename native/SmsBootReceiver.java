package com.joseph.physiodesk;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

/** Alarms are wiped when the phone restarts, so set them again. */
public class SmsBootReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context context, Intent intent) {
        SmsScheduler.armAll(context);
    }
}
