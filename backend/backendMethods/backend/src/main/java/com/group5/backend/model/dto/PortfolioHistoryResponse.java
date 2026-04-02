package com.group5.backend.model.dto;

import java.time.LocalDateTime;

public record PortfolioHistoryResponse(
        Long id,
        String stockName,
        String symbol,
        String type,
        double price,
        int quantity,
        double totalAmount,
        LocalDateTime orderTime
) {
}
