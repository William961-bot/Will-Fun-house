package com.pornblocker;

import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.TextView;
import androidx.annotation.NonNull;
import androidx.recyclerview.widget.RecyclerView;
import java.util.List;

public class ActivityAdapter extends RecyclerView.Adapter<ActivityAdapter.ViewHolder> {

    private final List<BlockedRequest> requests;

    public ActivityAdapter(List<BlockedRequest> requests) {
        this.requests = requests;
    }

    @NonNull
    @Override
    public ViewHolder onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
        View view = LayoutInflater.from(parent.getContext())
                .inflate(R.layout.item_blocked_request, parent, false);
        return new ViewHolder(view);
    }

    @Override
    public void onBindViewHolder(@NonNull ViewHolder holder, int position) {
        BlockedRequest request = requests.get(position);
        holder.bind(request);
    }

    @Override
    public int getItemCount() {
        return requests.size();
    }

    static class ViewHolder extends RecyclerView.ViewHolder {
        TextView tvUrl;
        TextView tvTimestamp;
        TextView tvReason;

        ViewHolder(@NonNull View itemView) {
            super(itemView);
            tvUrl = itemView.findViewById(R.id.tvUrl);
            tvTimestamp = itemView.findViewById(R.id.tvTimestamp);
            tvReason = itemView.findViewById(R.id.tvReason);
        }

        void bind(BlockedRequest request) {
            tvUrl.setText(request.domain);
            tvTimestamp.setText(request.getFormattedTime());
            tvReason.setText(request.reason);
        }
    }
}