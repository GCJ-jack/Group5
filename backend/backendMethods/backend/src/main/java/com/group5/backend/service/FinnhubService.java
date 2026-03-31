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

    private void validateToken() {
        if (!StringUtils.hasText(apiToken)) {
            throw new ResponseStatusException(
                    INTERNAL_SERVER_ERROR,
                    "FINNHUB_API_TOKEN is not configured"
            );
        }
    }





}
