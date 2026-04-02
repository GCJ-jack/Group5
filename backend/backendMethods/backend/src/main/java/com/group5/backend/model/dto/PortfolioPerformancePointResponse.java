package com.group5.backend.model.dto;

public record PortfolioPerformancePointResponse(
        String timestamp,
        double portfolioValue,
        double marketValue,
        double cash,
        double netCost,
        double unrealizedPnl
) {
}
