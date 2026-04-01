package com.group5.backend.model.dto;

import java.util.List;

public record MarketCandleResponse(
        String symbol,
        String range,
        String interval,
        List<CandlePointResponse> candles
) {
}
