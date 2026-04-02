package com.group5.backend.model.dto;

import com.group5.backend.model.enums.AssetType;

public record MarketQuoteItemRequest(
        String symbol,
        AssetType type
) {
}
