package com.group5.backend.model.dto;

public record PortfolioGainerResponse(
        Long id,
        String name,
        String ticker,
        String type,
        int quantity,
        double buyPrice,
        double currentPrice,
        double profitLossAmount,
        double profitLossPercent,
        double marketChangePercent
) {
}
