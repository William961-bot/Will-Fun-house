package com.pornblocker;

import android.content.Context;
import android.content.pm.PackageManager;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.Switch;
import android.widget.TextView;
import android.widget.ImageView;
import androidx.annotation.NonNull;
import androidx.recyclerview.widget.RecyclerView;
import java.util.List;
import java.util.Set;

public class AppAdapter extends RecyclerView.Adapter<AppAdapter.ViewHolder> {

    private final List<AppInfo> apps;
    private final Set<String> blockedApps;
    private final OnAppBlockedListener listener;

    public interface OnAppBlockedListener {
        void onAppBlockedChanged(String packageName, boolean isBlocked);
    }

    public AppAdapter(List<AppInfo> apps, Set<String> blockedApps, OnAppBlockedListener listener) {
        this.apps = apps;
        this.blockedApps = blockedApps;
        this.listener = listener;
    }

    @NonNull
    @Override
    public ViewHolder onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
        View view = LayoutInflater.from(parent.getContext())
                .inflate(R.layout.item_app_block, parent, false);
        return new ViewHolder(view);
    }

    @Override
    public void onBindViewHolder(@NonNull ViewHolder holder, int position) {
        AppInfo app = apps.get(position);
        holder.bind(app);
    }

    @Override
    public int getItemCount() {
        return apps.size();
    }

    class ViewHolder extends RecyclerView.ViewHolder {
        ImageView ivIcon;
        TextView tvAppName;
        Switch switchBlock;

        ViewHolder(@NonNull View itemView) {
            super(itemView);
            ivIcon = itemView.findViewById(R.id.ivIcon);
            tvAppName = itemView.findViewById(R.id.tvAppName);
            switchBlock = itemView.findViewById(R.id.switchBlock);
        }

        void bind(AppInfo app) {
            tvAppName.setText(app.name);
            ivIcon.setImageDrawable(app.icon);

            boolean isBlocked = blockedApps.contains(app.packageName);
            switchBlock.setChecked(isBlocked);

            switchBlock.setOnCheckedChangeListener((buttonView, isChecked) -> {
                listener.onAppBlockedChanged(app.packageName, isChecked);
            });
        }
    }
}