package com.group5.backend.model.dto;

import java.util.List;

public record PortfolioPerformanceResponse(
        List<PortfolioPerformancePointResponse> points
) {
}
