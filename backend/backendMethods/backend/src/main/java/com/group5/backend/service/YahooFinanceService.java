package com.group5.backend.service;

import com.group5.backend.model.dto.CandlePointResponse;
import com.group5.backend.model.dto.MarketCandleResponse;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
import yahoofinance.Stock;
import yahoofinance.YahooFinance;
import yahoofinance.histquotes.HistoricalQuote;
import yahoofinance.histquotes.Interval;

import java.io.IOException;
import java.math.BigDecimal;
import java.time.ZoneOffset;
import java.util.Calendar;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.TimeZone;

import static org.springframework.http.HttpStatus.BAD_REQUEST;
import static org.springframework.http.HttpStatus.BAD_GATEWAY;

@Service
public class YahooFinanceService {

    public MarketCandleResponse getCandles(String symbol, String range, String interval) {
        String normalizedSymbol = normalizeSymbol(symbol);
        String normalizedRange = normalizeRange(range);
        Interval yahooInterval = normalizeInterval(interval);

        Calendar from = calculateFrom(normalizedRange);
        Calendar to = Calendar.getInstance(TimeZone.getTimeZone("UTC"));

        try {
            Stock stock = YahooFinance.get(normalizedSymbol);
            if (stock == null) {
                throw new ResponseStatusException(BAD_GATEWAY, "No data returned for symbol: " + normalizedSymbol);
            }

            List<CandlePointResponse> candles = stock.getHistory(from, to, yahooInterval).stream()
                    .filter(quote -> quote.getDate() != null)
                    .sorted(Comparator.comparing(HistoricalQuote::getDate))
                    .map(this::toCandlePoint)
                    .toList();

            return new MarketCandleResponse(
                    normalizedSymbol,
                    normalizedRange,
                    yahooInterval.name(),
                    candles
            );
        } catch (IOException e) {
            throw new ResponseStatusException(BAD_GATEWAY, "Failed to load candle data from Yahoo Finance", e);
        }
    }

    private CandlePointResponse toCandlePoint(HistoricalQuote quote) {
        long timestamp = quote.getDate()
                .toInstant()
                .atZone(ZoneOffset.UTC)
                .toInstant()
                .toEpochMilli();

        return new CandlePointResponse(
                timestamp,
                toDouble(quote.getOpen()),
                toDouble(quote.getHigh()),
                toDouble(quote.getLow()),
                toDouble(quote.getClose()),
                toDouble(quote.getAdjClose()),
                quote.getVolume() == null ? 0L : quote.getVolume()
        );
    }

    private String normalizeSymbol(String symbol) {
        if (symbol == null || symbol.isBlank()) {
            throw new ResponseStatusException(BAD_REQUEST, "symbol is required");
        }
        return symbol.trim().toUpperCase(Locale.ROOT);
    }

    private String normalizeRange(String range) {
        if (range == null || range.isBlank()) {
            return "1mo";
        }

        String normalized = range.trim().toLowerCase(Locale.ROOT);
        return switch (normalized) {
            case "5d", "1mo", "3mo", "6mo", "1y", "2y", "5y", "10y", "max" -> normalized;
            default -> throw new ResponseStatusException(
                    BAD_REQUEST,
                    "range must be one of: 5d, 1mo, 3mo, 6mo, 1y, 2y, 5y, 10y, max"
            );
        };
    }

    private Interval normalizeInterval(String interval) {
        if (interval == null || interval.isBlank()) {
            return Interval.DAILY;
        }

        try {
            return Interval.valueOf(interval.trim().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException e) {
            throw new ResponseStatusException(BAD_REQUEST, "interval must be DAILY, WEEKLY, or MONTHLY");
        }
    }

    private Calendar calculateFrom(String range) {
        Calendar from = Calendar.getInstance(TimeZone.getTimeZone("UTC"));

        switch (range) {
            case "5d" -> from.add(Calendar.DAY_OF_YEAR, -5);
            case "1mo" -> from.add(Calendar.MONTH, -1);
            case "3mo" -> from.add(Calendar.MONTH, -3);
            case "6mo" -> from.add(Calendar.MONTH, -6);
            case "1y" -> from.add(Calendar.YEAR, -1);
            case "2y" -> from.add(Calendar.YEAR, -2);
            case "5y" -> from.add(Calendar.YEAR, -5);
            case "10y" -> from.add(Calendar.YEAR, -10);
            case "max" -> from.add(Calendar.YEAR, -50);
            default -> throw new ResponseStatusException(BAD_REQUEST, "Unsupported range: " + range);
        }

        return from;
    }

    private double toDouble(BigDecimal value) {
        return value == null ? 0.0 : value.doubleValue();
    }
}
