package com.group5.backend.model.dto;

import com.group5.backend.model.enums.AssetType;

public record FollowingRequest(
        String symbol,
        AssetType type
) {
}
