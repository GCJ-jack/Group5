package com.group5.backend.service;

import com.group5.backend.model.dto.FinnhubNewsItem;
import com.group5.backend.model.dto.QuoteResponse;
import com.group5.backend.model.dto.SearchResultDto;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.client.RestClient;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.util.*;

import static org.springframework.http.HttpStatus.INTERNAL_SERVER_ERROR;
@Service
public class FinnhubService {

    private final RestClient finnhubRestClient;
    private final String apiToken;


    public FinnhubService(
            RestClient finnhubRestClient,
            @Value("${finnhub.api.token}") String apiToken
    ) {
        this.finnhubRestClient = finnhubRestClient;
        this.apiToken = apiToken;
    }

    public List<FinnhubNewsItem> getMarketNews(String category, Long minId) {
        validateToken();

        FinnhubNewsItem[] response = finnhubRestClient.get()
                .uri(uriBuilder -> uriBuilder
                        .path("/news")
                        .queryParam("category", category)
                        .queryParam("minId", minId)
                        .queryParam("token", apiToken)
                        .build())
                .retrieve()
                .body(FinnhubNewsItem[].class);

        if (response == null) {
            return List.of();
        }

        return Arrays.stream(response)
                .sorted(Comparator.comparingLong(FinnhubNewsItem::id).reversed())
                .toList();
    }

    public List<FinnhubNewsItem> getCompanyNews(String symbol, LocalDate from, LocalDate to) {
        validateToken();

        FinnhubNewsItem[] response = finnhubRestClient.get()
                .uri(uriBuilder -> uriBuilder
                        .path("/company-news")
                        .queryParam("symbol", symbol.toUpperCase(Locale.ROOT))
                        .queryParam("from", from)
                        .queryParam("to", to)
                        .queryParam("token", apiToken)
                        .build())
                .retrieve()
                .body(FinnhubNewsItem[].class);

        if (response == null) {
            return List.of();
        }

        return Arrays.stream(response)
                .sorted(Comparator.comparingLong(FinnhubNewsItem::datetime).reversed())
                .toList();
    }

    public double getPrice(String ticker) {
        validateToken();

        try {

            ticker = ticker.toUpperCase();

            String finalTicker = ticker;
            var response = finnhubRestClient.get()
                    .uri(uriBuilder -> uriBuilder
                            .path("/quote")
                            .queryParam("symbol", finalTicker)
                            .queryParam("token", apiToken)
                            .build())
                    .retrieve()
                    .body(String.class);

            org.json.JSONObject json = new org.json.JSONObject(response);

            double current = json.optDouble("c", 0.0);
            double prevClose = json.optDouble("pc", 0.0);

            // ⭐ 关键逻辑：如果 current=0，用昨收价
            if (current == 0.0) {
                if (prevClose > 0) {
                    return prevClose;
                } else {
                    System.out.println("Invalid ticker or no price: " + ticker);
                    return 0.0;
                }
            }

            return current;

        } catch (Exception e) {
            System.out.println("Finnhub price error: " + ticker);
            e.printStackTrace();
            return 0.0;
        }
    }

    public String getName(String ticker) {
        validateToken();

        try {
            ticker = ticker.toUpperCase();

            String finalTicker = ticker;
            var response = finnhubRestClient.get()
                    .uri(uriBuilder -> uriBuilder
                            .path("/stock/profile2")
                            .queryParam("symbol", finalTicker)
                            .queryParam("token", apiToken)
                            .build())
                    .retrieve()
                    .body(String.class);

            org.json.JSONObject json = new org.json.JSONObject(response);

            String name = json.optString("name", "");

            if (name == null || name.isEmpty()) {
                return ticker;
            }

            return name;

        } catch (Exception e) {
            return ticker;
        }
    }

    public String getType(String ticker) {
        if (ticker.endsWith("-USD")) return "Crypto";
        return "Equity";
    }
    public List<Map<String, String>> searchStocks(String query) {
        validateToken();

        List<Map<String, String>> list = new ArrayList<>();

        try {
            String response = finnhubRestClient.get()
                    .uri(uriBuilder -> uriBuilder
                            .path("/search")
                            .queryParam("q", query)
                            .queryParam("token", apiToken)
                            .build())
                    .retrieve()
                    .body(String.class);

            org.json.JSONObject json = new org.json.JSONObject(response);
            org.json.JSONArray resultArray = json.optJSONArray("result");

            if (resultArray == null) {
                return list;
            }

            for (int i = 0; i < resultArray.length(); i++) {
                org.json.JSONObject item = resultArray.getJSONObject(i);

                Map<String, String> stock = new HashMap<>();
                stock.put("symbol", item.optString("symbol", ""));
                stock.put("description", item.optString("description", ""));

                list.add(stock);
            }
        } catch (Exception e) {
            System.out.println("Search API error: " + query);
            e.printStackTrace();
        }

        return list;
    }

    private void validateToken() {
        if (!StringUtils.hasText(apiToken)) {
            throw new ResponseStatusException(
                    INTERNAL_SERVER_ERROR,
                    "FINNHUB_API_TOKEN is not configured"
            );
        }
    }

    public QuoteResponse getQuote(String symbol) {
        try {
            var response = finnhubRestClient.get()
                    .uri(uriBuilder -> uriBuilder
                            .path("/quote")
                            .queryParam("symbol", symbol)
                            .queryParam("token", apiToken)
                            .build())
                    .retrieve()
                    .body(String.class);

            org.json.JSONObject json = new org.json.JSONObject(response);

            return new QuoteResponse(
                    symbol, // 先用 symbol 当 name
                    json.getDouble("c"),
                    json.getDouble("d"),
                    json.getDouble("dp"),
                    json.getDouble("h"),
                    json.getDouble("l"),
                    json.getDouble("o"),
                    json.getDouble("pc")
            );

        } catch (Exception e) {
            e.printStackTrace();
            return new QuoteResponse(symbol, 0,0,0,0,0,0,0);
        }
    }

    public List<SearchResultDto> search(String symbol) {

        validateToken();

        try {
            var response = finnhubRestClient.get()
                    .uri(uriBuilder -> uriBuilder
                            .path("/search")
                            .queryParam("q", symbol)
                            .queryParam("token", apiToken)
                            .build())
                    .retrieve()
                    .body(String.class);

            org.json.JSONObject json = new org.json.JSONObject(response);
            org.json.JSONArray result = json.getJSONArray("result");

            return result.toList().stream()
                    .map(obj -> (java.util.Map<?, ?>) obj)
                    .map(map -> new SearchResultDto(
                            map.get("symbol").toString(),
                            map.get("description").toString()
                    ))
                    .limit(5) // 只返回前5个（很关键）
                    .toList();
        } catch (Exception e) {
            e.printStackTrace();
            return List.of();
        }
    }
}
