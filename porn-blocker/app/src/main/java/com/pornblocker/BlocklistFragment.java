package com.pornblocker;

import android.content.Context;
import android.content.Intent;
import android.content.pm.ApplicationInfo;
import android.content.pm.PackageManager;
import android.os.Bundle;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.TextView;
import android.widget.Toast;
import androidx.annotation.NonNull;
import androidx.fragment.app.Fragment;
import androidx.recyclerview.widget.LinearLayoutManager;
import androidx.recyclerview.widget.RecyclerView;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

public class BlocklistFragment extends Fragment {

    private static final String PREFS = "porn_blocker_prefs";
    private static final String KEY_BLOCKED_APPS = "blocked_apps";

    private RecyclerView recyclerView;
    private TextView tvNoBlockedApps;
    private AppAdapter adapter;
    private List<AppInfo> appList;
    private Set<String> blockedApps;

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
        return inflater.inflate(R.layout.fragment_blocklist, container, false);
    }

    @Override
    public void onViewCreated(@NonNull View view, Bundle savedInstanceState) {
        super.onViewCreated(view, savedInstanceState);

        recyclerView = view.findViewById(R.id.recyclerViewBlockedApps);
        tvNoBlockedApps = view.findViewById(R.id.tvNoBlockedApps);

        blockedApps = getBlockedApps();
        appList = getInstalledApps();

        adapter = new AppAdapter(appList, blockedApps, this::onAppBlockedChanged);
        recyclerView.setLayoutManager(new LinearLayoutManager(getContext()));
        recyclerView.setAdapter(adapter);

        updateEmptyState();
    }

    private List<AppInfo> getInstalledApps() {
        List<AppInfo> apps = new ArrayList<>();
        PackageManager pm = requireContext().getPackageManager();
        List<ApplicationInfo> appInfos = pm.getInstalledApplications(PackageManager.GET_META_DATA);

        for (ApplicationInfo info : appInfos) {
            // Skip system apps and this app itself
            if ((info.flags & ApplicationInfo.FLAG_SYSTEM) != 0) continue;
            if (info.packageName.equals(requireContext().getPackageName())) continue;

            String name = pm.getApplicationLabel(info).toString();
            apps.add(new AppInfo(info.packageName, name, info.icon));
        }

        return apps;
    }

    private Set<String> getBlockedApps() {
        return requireContext().getSharedPreferences(PREFS, Context.MODE_PRIVATE)
                .getStringSet(KEY_BLOCKED_APPS, new HashSet<>());
    }

    private void saveBlockedApps(Set<String> apps) {
        requireContext().getSharedPreferences(PREFS, Context.MODE_PRIVATE)
                .edit()
                .putStringSet(KEY_BLOCKED_APPS, apps)
                .apply();
    }

    private void onAppBlockedChanged(String packageName, boolean isBlocked) {
        Set<String> current = getBlockedApps();
        if (isBlocked) {
            current.add(packageName);
        } else {
            current.remove(packageName);
        }
        saveBlockedApps(current);
        blockedApps = current;
        updateEmptyState();
        Toast.makeText(getContext(), "App " + (isBlocked ? "blocked" : "unblocked"), Toast.LENGTH_SHORT).show();
    }

    private void updateEmptyState() {
        if (blockedApps.isEmpty()) {
            tvNoBlockedApps.setVisibility(View.VISIBLE);
            recyclerView.setVisibility(View.GONE);
        } else {
            tvNoBlockedApps.setVisibility(View.GONE);
            recyclerView.setVisibility(View.VISIBLE);
        }
    }

    public Set<String> getBlockedAppsSet() {
        return blockedApps;
    }

    public void launchBlockedScreen(String appName) {
        Intent intent = new Intent(getContext(), BlockedScreenActivity.class);
        intent.putExtra("app_name", appName);
        startActivity(intent);
    }
}