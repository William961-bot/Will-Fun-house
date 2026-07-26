package com.pornblocker;

import android.content.Context;
import android.os.Bundle;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.TextView;
import androidx.annotation.NonNull;
import androidx.fragment.app.Fragment;
import androidx.recyclerview.widget.LinearLayoutManager;
import androidx.recyclerview.widget.RecyclerView;
import java.util.ArrayList;
import java.util.List;

public class ActivityLogFragment extends Fragment {

    private RecyclerView recyclerView;
    private TextView tvEmpty;
    private ActivityAdapter adapter;
    private List<BlockedRequest> blockedRequests;

    @Override
    public View onCreateView(@NonNull LayoutInflater inflater, ViewGroup container, Bundle savedInstanceState) {
        return inflater.inflate(R.layout.fragment_activity_log, container, false);
    }

    @Override
    public void onViewCreated(@NonNull View view, Bundle savedInstanceState) {
        super.onViewCreated(view, savedInstanceState);

        recyclerView = view.findViewById(R.id.recyclerView);
        tvEmpty = view.findViewById(R.id.tvEmpty);

        blockedRequests = fetchBlockedRequests();

        adapter = new ActivityAdapter(blockedRequests);
        recyclerView.setLayoutManager(new LinearLayoutManager(getContext()));
        recyclerView.setAdapter(adapter);

        updateEmptyState();
    }

    private List<BlockedRequest> fetchBlockedRequests() {
        // TODO: Fetch from Supabase
        List<BlockedRequest> requests = new ArrayList<>();
        requests.add(new BlockedRequest("pornhub.com", "2024-01-15 10:30", "Adult Content"));
        requests.add(new BlockedRequest("xvideos.com", "2024-01-15 10:25", "Adult Content"));
        return requests;
    }

    private void updateEmptyState() {
        if (blockedRequests.isEmpty()) {
            tvEmpty.setVisibility(View.VISIBLE);
            recyclerView.setVisibility(View.GONE);
        } else {
            tvEmpty.setVisibility(View.GONE);
            recyclerView.setVisibility(View.VISIBLE);
        }
    }
}