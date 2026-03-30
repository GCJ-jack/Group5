package com.group5.backend.service;

import org.springframework.stereotype.Service;

import java.util.Map;

@Service
public class MockPriceService implements PriceService {

    private static final Map<String, Double> prices = Map.of(
            "AAPL", 180.0,
            "TSLA", 250.0,
            "GOOG", 140.0
    );

    @Override
    public double getPrice(String ticker) {
        return prices.getOrDefault(ticker.toUpperCase(), 100.0);
    }
}