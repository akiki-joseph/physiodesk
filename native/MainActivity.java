package com.joseph.physiodesk;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(PhysioCalendarPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
