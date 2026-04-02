package com.group5.backend.model.dto;

import com.group5.backend.model.enums.AssetType;

public record MarketQuoteResponse(
        String symbol,
        String displaySymbol,
        String name,
        AssetType type,
        double currentPrice,
        double change,
        double percentChange
) {
}
