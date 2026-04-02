package com.group5.backend.model.dto;

import com.group5.backend.model.enums.AssetType;

import java.time.LocalDateTime;

public record FollowingResponse(
        Long id,
        String symbol,
        String name,
        AssetType type,
        LocalDateTime createdAt
) {
}
