package com.group5.backend.service;

import com.group5.backend.model.dto.CandlePointResponse;
import com.group5.backend.model.dto.MarketCandleResponse;
import org.json.JSONObject;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.time.ZoneOffset;
import java.time.ZonedDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;

import static org.springframework.http.HttpStatus.BAD_GATEWAY;
import static org.springframework.http.HttpStatus.BAD_REQUEST;
import static org.springframework.http.HttpStatus.INTERNAL_SERVER_ERROR;

@Service
public class AlphaVantageService {

    private final RestClient alphaVantageRestClient;
    private final String apiKey;

    public AlphaVantageService(
            @Value("${alphavantage.api.base-url}") String baseUrl,
            @Value("${alphavantage.api.key}") String apiKey
    ) {
        this.alphaVantageRestClient = RestClient.builder()
                .baseUrl(baseUrl)
                .build();
        this.apiKey = apiKey;
    }

    public MarketCandleResponse getCandles(String symbol, String range, String interval) {
        validateApiKey();

        String normalizedSymbol = normalizeSymbol(symbol);
        String normalizedRange = normalizeRange(range);
        String normalizedInterval = normalizeInterval(interval);
        LocalDate fromDate = calculateFromDate(normalizedRange);

        try {
            String response = alphaVantageRestClient.get()
                    .uri(uriBuilder -> uriBuilder
                            .queryParam("function", toFunction(normalizedInterval))
                            .queryParam("symbol", normalizedSymbol)
                            .queryParam("apikey", apiKey)
                            .queryParamIfPresent("outputsize", dailyOutputSize(normalizedInterval, normalizedRange))
                            .build())
                    .retrieve()
                    .body(String.class);

            JSONObject json = new JSONObject(response);
            throwIfAlphaVantageError(json);

            List<CandlePointResponse> candles = parseCandles(json, normalizedInterval, fromDate);

            return new MarketCandleResponse(
                    normalizedSymbol,
                    normalizedRange,
                    normalizedInterval,
                    candles
            );
        } catch (RestClientResponseException e) {
            throw new ResponseStatusException(e.getStatusCode(), extractErrorMessage(e.getResponseBodyAsString()), e);
        } catch (ResponseStatusException e) {
            throw e;
        } catch (Exception e) {
            throw new ResponseStatusException(
                    BAD_GATEWAY,
                    "Failed to load candle data from Alpha Vantage for symbol: " + normalizedSymbol,
                    e
            );
        }
    }

    private void validateApiKey() {
        if (!StringUtils.hasText(apiKey)) {
            throw new ResponseStatusException(
                    INTERNAL_SERVER_ERROR,
                    "ALPHAVANTAGE_API_KEY is not configured"
            );
        }
    }

    private String normalizeSymbol(String symbol) {
        if (!StringUtils.hasText(symbol)) {
            throw new ResponseStatusException(BAD_REQUEST, "symbol is required");
        }
        return symbol.trim().toUpperCase(Locale.ROOT);
    }

    private String normalizeRange(String range) {
        if (!StringUtils.hasText(range)) {
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

    private String normalizeInterval(String interval) {
        if (!StringUtils.hasText(interval)) {
            return "DAILY";
        }

        String normalized = interval.trim().toUpperCase(Locale.ROOT);
        return switch (normalized) {
            case "DAILY", "WEEKLY", "MONTHLY" -> normalized;
            default -> throw new ResponseStatusException(BAD_REQUEST, "interval must be DAILY, WEEKLY, or MONTHLY");
        };
    }

    private String toFunction(String interval) {
        return switch (interval) {
            case "DAILY" -> "TIME_SERIES_DAILY";
            case "WEEKLY" -> "TIME_SERIES_WEEKLY";
            case "MONTHLY" -> "TIME_SERIES_MONTHLY";
            default -> throw new ResponseStatusException(BAD_REQUEST, "Unsupported interval: " + interval);
        };
    }

    private String toSeriesKey(String interval) {
        return switch (interval) {
            case "DAILY" -> "Time Series (Daily)";
            case "WEEKLY" -> "Weekly Time Series";
            case "MONTHLY" -> "Monthly Time Series";
            default -> throw new ResponseStatusException(BAD_REQUEST, "Unsupported interval: " + interval);
        };
    }

    private java.util.Optional<String> dailyOutputSize(String interval, String range) {
        if (!"DAILY".equals(interval)) {
            return java.util.Optional.empty();
        }

        return java.util.Optional.of(needsFullDailyHistory(range) ? "full" : "compact");
    }

    private boolean needsFullDailyHistory(String range) {
        return switch (range) {
            case "6mo", "1y", "2y", "5y", "10y", "max" -> true;
            default -> false;
        };
    }

    private LocalDate calculateFromDate(String range) {
        LocalDate today = ZonedDateTime.now(ZoneOffset.UTC).toLocalDate();
        return switch (range) {
            case "5d" -> today.minusDays(5);
            case "1mo" -> today.minusMonths(1);
            case "3mo" -> today.minusMonths(3);
            case "6mo" -> today.minusMonths(6);
            case "1y" -> today.minusYears(1);
            case "2y" -> today.minusYears(2);
            case "5y" -> today.minusYears(5);
            case "10y" -> today.minusYears(10);
            case "max" -> LocalDate.of(1900, 1, 1);
            default -> throw new ResponseStatusException(BAD_REQUEST, "Unsupported range: " + range);
        };
    }

    private void throwIfAlphaVantageError(JSONObject json) {
        if (json.has("Error Message")) {
            throw new ResponseStatusException(BAD_GATEWAY, json.optString("Error Message"));
        }

        if (json.has("Information")) {
            throw new ResponseStatusException(BAD_GATEWAY, json.optString("Information"));
        }

        if (json.has("Note")) {
            throw new ResponseStatusException(BAD_GATEWAY, json.optString("Note"));
        }
    }

    private List<CandlePointResponse> parseCandles(JSONObject json, String interval, LocalDate fromDate) {
        String seriesKey = toSeriesKey(interval);
        JSONObject series = json.optJSONObject(seriesKey);

        if (series == null || series.isEmpty()) {
            throw new ResponseStatusException(BAD_GATEWAY, "Alpha Vantage response is missing time series data");
        }

        List<CandlePointResponse> candles = new ArrayList<>();

        for (String dateKey : series.keySet()) {
            LocalDate candleDate = LocalDate.parse(dateKey);
            if (candleDate.isBefore(fromDate)) {
                continue;
            }

            JSONObject point = series.getJSONObject(dateKey);
            double open = parseDouble(point, "1. open");
            double high = parseDouble(point, "2. high");
            double low = parseDouble(point, "3. low");
            double close = parseDouble(point, "4. close");
            long volume = parseLong(point, "5. volume");

            candles.add(new CandlePointResponse(
                    candleDate.atStartOfDay().toInstant(ZoneOffset.UTC).toEpochMilli(),
                    open,
                    high,
                    low,
                    close,
                    close,
                    volume
            ));
        }

        candles.sort(Comparator.comparingLong(CandlePointResponse::timestamp));
        return candles;
    }

    private double parseDouble(JSONObject json, String key) {
        String raw = json.optString(key, null);
        if (!StringUtils.hasText(raw)) {
            throw new ResponseStatusException(BAD_GATEWAY, "Alpha Vantage candle data is missing " + key);
        }
        return Double.parseDouble(raw);
    }

    private long parseLong(JSONObject json, String key) {
        String raw = json.optString(key, null);
        if (!StringUtils.hasText(raw)) {
            return 0L;
        }
        return Long.parseLong(raw);
    }

    private String extractErrorMessage(String responseBody) {
        if (!StringUtils.hasText(responseBody)) {
            return "Alpha Vantage request failed";
        }

        try {
            JSONObject json = new JSONObject(responseBody);
            if (json.has("Error Message")) {
                return json.optString("Error Message");
            }
            if (json.has("Information")) {
                return json.optString("Information");
            }
            if (json.has("Note")) {
                return json.optString("Note");
            }
        } catch (Exception ignored) {
            return responseBody;
        }

        return responseBody;
    }
}
