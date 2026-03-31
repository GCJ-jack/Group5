package com.group5.backend.service;

import org.springframework.stereotype.Service;

import java.util.Map;

@Service
public class AssetInfoService {

    private static final Map<String, String> nameMap = Map.of(
            "AAPL", "Apple Inc",
            "GOOG", "Google",
            "NVDA", "NVIDIA",
            "BTC", "Bitcoin"
    );

    private static final Map<String, String> typeMap = Map.of(
            "AAPL", "Equity",
            "GOOG", "Equity",
            "NVDA", "Equity",
            "BTC", "Crypto"
    );

    public String getName(String ticker) {
        return nameMap.getOrDefault(ticker.toUpperCase(), ticker);
    }

    public String getType(String ticker) {
        return typeMap.getOrDefault(ticker.toUpperCase(), "Unknown");
    }
}