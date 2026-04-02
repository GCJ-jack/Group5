package com.group5.backend.service;

import com.group5.backend.model.dto.CandlePointResponse;
import com.group5.backend.model.dto.MarketCandleResponse;
import org.json.JSONArray;
import org.json.JSONObject;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;
import org.springframework.web.server.ResponseStatusException;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

import static org.springframework.http.HttpStatus.BAD_GATEWAY;
import static org.springframework.http.HttpStatus.BAD_REQUEST;
import static org.springframework.http.HttpStatus.INTERNAL_SERVER_ERROR;

@Service
public class TwelveDataService {

    private final RestClient twelveDataRestClient;
    private final String apiKey;

    public TwelveDataService(
            @Value("${twelvedata.api.base-url}") String baseUrl,
            @Value("${twelvedata.api.key}") String apiKey
    ) {
        this.twelveDataRestClient = RestClient.builder()
                .baseUrl(baseUrl)
                .build();
        this.apiKey = apiKey;
    }

    public MarketCandleResponse getCandles(String symbol, String range, String interval) {
        validateApiKey();

        String normalizedSymbol = normalizeSymbol(symbol);
        String normalizedRange = normalizeRange(range);
        String normalizedInterval = normalizeInterval(interval);

        try {
            String response = twelveDataRestClient.get()
                    .uri(uriBuilder -> uriBuilder
                            .path("/time_series")
                            .queryParam("symbol", normalizedSymbol)
                            .queryParam("interval", toTwelveDataInterval(normalizedInterval))
                            .queryParam("outputsize", outputSizeFor(normalizedRange, normalizedInterval))
                            .queryParam("order", "asc")
                            .queryParam("format", "JSON")
                            .queryParam("apikey", apiKey)
                            .build())
                    .retrieve()
                    .body(String.class);

            JSONObject json = new JSONObject(response);
            throwIfTwelveDataError(json);

            return new MarketCandleResponse(
                    normalizedSymbol,
                    normalizedRange,
                    normalizedInterval,
                    parseCandles(json)
            );
        } catch (RestClientResponseException e) {
            throw new ResponseStatusException(e.getStatusCode(), extractErrorMessage(e.getResponseBodyAsString()), e);
        } catch (ResponseStatusException e) {
            throw e;
        } catch (Exception e) {
            throw new ResponseStatusException(
                    BAD_GATEWAY,
                    "Failed to load candle data from Twelve Data for symbol: " + normalizedSymbol,
                    e
            );
        }
    }

    private void validateApiKey() {
        if (!StringUtils.hasText(apiKey)) {
            throw new ResponseStatusException(
                    INTERNAL_SERVER_ERROR,
                    "TWELVE_DATA_API_KEY is not configured"
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

    private String toTwelveDataInterval(String interval) {
        return switch (interval) {
            case "DAILY" -> "1day";
            case "WEEKLY" -> "1week";
            case "MONTHLY" -> "1month";
            default -> throw new ResponseStatusException(BAD_REQUEST, "Unsupported interval: " + interval);
        };
    }

    private int outputSizeFor(String range, String interval) {
        return switch (interval) {
            case "DAILY" -> switch (range) {
                case "5d" -> 5;
                case "1mo" -> 30;
                case "3mo" -> 90;
                case "6mo" -> 180;
                case "1y" -> 365;
                case "2y" -> 730;
                case "5y" -> 1825;
                case "10y" -> 3650;
                case "max" -> 5000;
                default -> 30;
            };
            case "WEEKLY" -> switch (range) {
                case "5d", "1mo" -> 8;
                case "3mo" -> 16;
                case "6mo" -> 32;
                case "1y" -> 56;
                case "2y" -> 108;
                case "5y" -> 264;
                case "10y" -> 520;
                case "max" -> 1000;
                default -> 56;
            };
            case "MONTHLY" -> switch (range) {
                case "5d", "1mo" -> 3;
                case "3mo" -> 6;
                case "6mo" -> 9;
                case "1y" -> 14;
                case "2y" -> 26;
                case "5y" -> 62;
                case "10y" -> 122;
                case "max" -> 300;
                default -> 14;
            };
            default -> throw new ResponseStatusException(BAD_REQUEST, "Unsupported interval: " + interval);
        };
    }

    private void throwIfTwelveDataError(JSONObject json) {
        if ("error".equalsIgnoreCase(json.optString("status"))) {
            String message = json.optString("message");
            if (!StringUtils.hasText(message)) {
                message = json.optString("code", "Twelve Data request failed");
            }
            throw new ResponseStatusException(BAD_GATEWAY, message);
        }
    }

    private List<CandlePointResponse> parseCandles(JSONObject json) {
        JSONArray values = json.optJSONArray("values");
        if (values == null) {
            throw new ResponseStatusException(BAD_GATEWAY, "Twelve Data response is missing values");
        }

        List<CandlePointResponse> candles = new ArrayList<>(values.length());

        for (int i = 0; i < values.length(); i++) {
            JSONObject point = values.getJSONObject(i);
            String datetime = point.optString("datetime", null);

            if (!StringUtils.hasText(datetime)) {
                continue;
            }

            double open = parseDouble(point, "open");
            double high = parseDouble(point, "high");
            double low = parseDouble(point, "low");
            double close = parseDouble(point, "close");
            long volume = parseLong(point, "volume");

            candles.add(new CandlePointResponse(
                    java.time.LocalDateTime.parse(normalizeDateTime(datetime))
                            .toInstant(java.time.ZoneOffset.UTC)
                            .toEpochMilli(),
                    open,
                    high,
                    low,
                    close,
                    close,
                    volume
            ));
        }

        return candles;
    }

    private String normalizeDateTime(String datetime) {
        if (datetime.length() == 10) {
            return datetime + "T00:00:00";
        }
        return datetime.replace(" ", "T");
    }

    private double parseDouble(JSONObject json, String key) {
        String raw = json.optString(key, null);
        if (!StringUtils.hasText(raw)) {
            throw new ResponseStatusException(BAD_GATEWAY, "Twelve Data candle data is missing " + key);
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
            return "Twelve Data request failed";
        }

        try {
            JSONObject json = new JSONObject(responseBody);
            if ("error".equalsIgnoreCase(json.optString("status"))) {
                String message = json.optString("message");
                if (StringUtils.hasText(message)) {
                    return message;
                }
            }
        } catch (Exception ignored) {
            return responseBody;
        }

        return responseBody;
    }
}
