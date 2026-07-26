package com.pornblocker;

import android.content.Context;
import android.os.Bundle;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.TextView;
import android.widget.Button;
import androidx.annotation.NonNull;
import androidx.fragment.app.Fragment;

public class ProfileFragment extends Fragment {

    private TextView tvDisplayName;
    private TextView tvEmail;
    private TextView tvRole;
    private TextView tvProtectionStatus;
    private Button btnSettings;
    private ProtectionManager protectionManager;

    @Override
    public void onAttach(@NonNull Context context) {
        super.onAttach(context);
        protectionManager = ProtectionManager.getInstance(context);
    }

    @Override
    public View onCreateView(@NonNull LayoutInflater inflater, ViewGroup container, Bundle savedInstanceState) {
        return inflater.inflate(R.layout.fragment_profile, container, false);
    }

    @Override
    public void onViewCreated(@NonNull View view, Bundle savedInstanceState) {
        super.onViewCreated(view, savedInstanceState);

        tvDisplayName = view.findViewById(R.id.tvDisplayName);
        tvEmail = view.findViewById(R.id.tvEmail);
        tvRole = view.findViewById(R.id.tvRole);
        tvProtectionStatus = view.findViewById(R.id.tvProtectionStatus);
        btnSettings = view.findViewById(R.id.btnSettings);

        boolean isProtected = protectionManager.isProtectionActive();
        tvProtectionStatus.setText(isProtected ? "Protection: ON" : "Protection: OFF");
        tvProtectionStatus.setTextColor(isProtected ? 0xFF4CAF50 : 0xFFFF9800);

        btnSettings.setOnClickListener(v -> {
            // Navigate to settings
        });
    }
}