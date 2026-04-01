package com.group5.backend.model.dto;

public record CandlePointResponse(
        long timestamp,
        double open,
        double high,
        double low,
        double close,
        double adjustedClose,
        long volume
) {
}
