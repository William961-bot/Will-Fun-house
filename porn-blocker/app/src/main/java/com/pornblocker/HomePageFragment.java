package com.pornblocker;

import androidx.annotation.NonNull;
import android.content.Context;
import android.content.SharedPreferences;
import android.os.Bundle;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.Switch;
import android.widget.TextView;
import android.widget.Button;
import androidx.fragment.app.Fragment;

public class HomePageFragment extends Fragment {

    private static final String PREFS = "porn_blocker_prefs";
    private static final String KEY_ADULT_CONTENT = "adult_content_enabled";

    private Switch switchAdultContent;
    private TextView tvStatus;
    private TextView tvBlockedCount;
    private TextView tvToggleLabel;
    private TextView tvToggleValue;
    private Button btnStartVpn;
    private Button btnStopVpn;

    private boolean isAdultContentEnabled;
    private MainActivity activity;

    @Override
    public void onAttach(@NonNull Context context) {
        super.onAttach(context);
        if (context instanceof MainActivity) {
            activity = (MainActivity) context;
        }
    }

    @Override
    public View onCreateView(@NonNull LayoutInflater inflater, ViewGroup container, Bundle savedInstanceState) {
        return inflater.inflate(R.layout.fragment_home, container, false);
    }

    @Override
    public void onViewCreated(@NonNull View view, Bundle savedInstanceState) {
        super.onViewCreated(view, savedInstanceState);

        switchAdultContent = view.findViewById(R.id.switchAdultContent);
        tvStatus = view.findViewById(R.id.tvStatus);
        tvBlockedCount = view.findViewById(R.id.tvBlockedCount);
        tvToggleLabel = view.findViewById(R.id.tvToggleLabel);
        tvToggleValue = view.findViewById(R.id.tvToggleValue);
        btnStartVpn = view.findViewById(R.id.btnStartVpn);
        btnStopVpn = view.findViewById(R.id.btnStopVpn);

        isAdultContentEnabled = getPreferences().getBoolean(KEY_ADULT_CONTENT, false);
        updateSwitchState();

        switchAdultContent.setChecked(isAdultContentEnabled);
        switchAdultContent.setOnCheckedChangeListener((buttonView, isChecked) -> {
            isAdultContentEnabled = isChecked;
            getPreferences().edit().putBoolean(KEY_ADULT_CONTENT, isChecked).apply();
            updateSwitchState();
        });

        btnStartVpn.setOnClickListener(v -> activity.startVpn());
        btnStopVpn.setOnClickListener(v -> activity.stopVpn());

        updateStatus();
    }

    @Override
    public void onResume() {
        super.onResume();
        updateStatus();
    }

    private SharedPreferences getPreferences() {
        return getActivity().getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    }

    private void updateSwitchState() {
        tvToggleLabel.setText(isAdultContentEnabled ? "ON" : "OFF");
        tvToggleValue.setText(isAdultContentEnabled ? "DISABLED" : "ENABLED");
        tvToggleLabel.setTextColor(isAdultContentEnabled ? 0xFF4CAF50 : 0xFFF44336);
        tvToggleValue.setTextColor(isAdultContentEnabled ? 0xFF4CAF50 : 0xFFF44336);
    }

    private void updateStatus() {
        boolean running = activity.isVpnRunning();
        tvStatus.setText(running ? "Status: active" : "Status: inactive");
        tvBlockedCount.setText("Blocked requests: " + activity.getBlockedCount());

        btnStartVpn.setEnabled(!running);
        btnStopVpn.setEnabled(running);
    }
}