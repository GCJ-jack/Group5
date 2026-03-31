package com.group5.backend.service;

import com.group5.backend.model.dto.FinnhubNewsItem;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.client.RestClient;
import org.springframework.web.server.ResponseStatusException;

import java.util.Arrays;
import java.util.Comparator;
import java.util.List;

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
    public double getPrice(String ticker) {
        validateToken();

        try {
            var response = finnhubRestClient.get()
                    .uri(uriBuilder -> uriBuilder
                            .path("/quote")
                            .queryParam("symbol", ticker)
                            .queryParam("token", apiToken)
                            .build())
                    .retrieve()
                    .body(String.class);

            org.json.JSONObject json = new org.json.JSONObject(response);

            return json.getDouble("c"); // current price

        } catch (Exception e) {
            System.out.println("Finnhub price error: " + ticker);
            e.printStackTrace();
            return 0.0;
        }
    }
    public String getName(String ticker) {
        validateToken();

        try {
            var response = finnhubRestClient.get()
                    .uri(uriBuilder -> uriBuilder
                            .path("/stock/profile2")
                            .queryParam("symbol", ticker)
                            .queryParam("token", apiToken)
                            .build())
                    .retrieve()
                    .body(String.class);

            org.json.JSONObject json = new org.json.JSONObject(response);

            return json.optString("name", ticker);

        } catch (Exception e) {
            return ticker;
        }
    }
    public String getType(String ticker) {
        if (ticker.endsWith("-USD")) return "Crypto";
        return "Equity";
    }

    private void validateToken() {
        if (!StringUtils.hasText(apiToken)) {
            throw new ResponseStatusException(
                    INTERNAL_SERVER_ERROR,
                    "FINNHUB_API_TOKEN is not configured"
            );
        }
    }





}
