package com.pornblocker;

import android.content.Context;
import android.os.Bundle;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.TextView;
import android.widget.Switch;
import android.widget.Button;
import android.widget.Toast;
import androidx.annotation.NonNull;
import androidx.fragment.app.Fragment;

public class DashboardFragment extends Fragment {

    private TextView tvWelcome;
    private TextView tvRole;
    private TextView tvStatus;
    private Switch switchProtection;
    private Button btnViewActivity;
    private DataManager dataManager;

    @Override
    public void onAttach(@NonNull Context context) {
        super.onAttach(context);
        dataManager = DataManager.getInstance(context);
    }

    @Override
    public View onCreateView(@NonNull LayoutInflater inflater, ViewGroup container, Bundle savedInstanceState) {
        return inflater.inflate(R.layout.fragment_dashboard, container, false);
    }

    @Override
    public void onViewCreated(@NonNull View view, Bundle savedInstanceState) {
        super.onViewCreated(view, savedInstanceState);

        tvWelcome = view.findViewById(R.id.tvWelcome);
        tvRole = view.findViewById(R.id.tvRole);
        tvStatus = view.findViewById(R.id.tvStatus);
        switchProtection = view.findViewById(R.id.switchProtection);
        btnViewActivity = view.findViewById(R.id.btnViewActivity);

        UserProfile user = dataManager.getCurrentUser();
        if (user != null) {
            tvWelcome.setText("Welcome, " + user.displayName);
            tvRole.setText("Role: " + user.role.name());
        }

        boolean isProtected = ProtectionManager.isProtectionActive(requireContext());
        switchProtection.setChecked(isProtected);

        updateStatus();

        switchProtection.setOnCheckedChangeListener((buttonView, isChecked) -> {
            if (isChecked) {
                ProtectionManager.setProtectionActive(requireContext(), true);
                Toast.makeText(getContext(), "Protection enabled", Toast.LENGTH_SHORT).show();
            } else {
                ProtectionManager.setProtectionActive(requireContext(), false);
                Toast.makeText(getContext(), "Protection disabled", Toast.LENGTH_SHORT).show();
            }
            updateStatus();
        });

        btnViewActivity.setOnClickListener(v -> {
            // Navigate to activity log
            getParentFragmentManager()
                .beginTransaction()
                .replace(R.id.fragment_container, new ActivityLogFragment())
                .addToBackStack(null)
                .commit();
        });
    }

    private void updateStatus() {
        boolean active = ProtectionManager.isProtectionActive(requireContext());
        tvStatus.setText(active ? "Status: Active" : "Status: Inactive");
        tvStatus.setTextColor(active ? 0xFF4CAF50 : 0xFFFF9800);
    }
}