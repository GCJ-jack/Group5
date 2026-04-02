package com.group5.backend.model.dto;

import com.group5.backend.model.enums.TradeType;

import java.time.LocalDateTime;

public record PortfolioHistoryResponse(
        Long id,
        String stockName,
        String symbol,
        String assetType,
        TradeType tradeType,
        double price,
        int quantity,
        double totalAmount,
        LocalDateTime orderTime
) {
}
