package com.joseph.physiodesk;

import android.Manifest;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;
import org.json.JSONArray;

@CapacitorPlugin(name = "PhysioSms", permissions = { @Permission(alias = "sms", strings = { Manifest.permission.SEND_SMS }) })
public class PhysioSmsPlugin extends Plugin {

    private JSObject state() {
        JSObject r = new JSObject();
        r.put("granted", getPermissionState("sms") == PermissionState.GRANTED);
        return r;
    }

    @PluginMethod
    public void check(PluginCall call) {
        call.resolve(state());
    }

    @PluginMethod
    public void requestAccess(PluginCall call) {
        if (getPermissionState("sms") == PermissionState.GRANTED) call.resolve(state());
        else requestPermissionForAlias("sms", call, "accessCallback");
    }

    @PermissionCallback
    private void accessCallback(PluginCall call) {
        call.resolve(state());
    }

    /** items: [{id, at, phone, text, apptId, key, name}] replaces everything scheduled before. */
    @PluginMethod
    public void schedule(PluginCall call) {
        try {
            JSArray items = call.getArray("items", new JSArray());
            SmsScheduler.replaceAll(getContext(), new JSONArray(items.toString()));
            JSObject r = new JSObject();
            r.put("count", items.length());
            call.resolve(r);
        } catch (Exception e) {
            call.reject("Could not schedule the SMS: " + e.getMessage());
        }
    }

    @PluginMethod
    public void cancelAll(PluginCall call) {
        SmsScheduler.cancelAll(getContext());
        call.resolve();
    }

    @PluginMethod
    public void sendNow(PluginCall call) {
        String err = SmsScheduler.send(getContext(), call.getString("phone", ""), call.getString("text", ""));
        JSObject r = new JSObject();
        r.put("ok", err == null);
        if (err != null) r.put("error", err);
        call.resolve(r);
    }

    /** Returns what was sent while the app was closed, and clears it. */
    @PluginMethod
    public void takeLog(PluginCall call) {
        try {
            String raw = SmsScheduler.prefs(getContext()).getString("log", "[]");
            SmsScheduler.prefs(getContext()).edit().putString("log", "[]").apply();
            JSObject r = new JSObject();
            r.put("log", new JSArray(raw));
            call.resolve(r);
        } catch (Exception e) {
            call.reject(e.getMessage());
        }
    }
}
