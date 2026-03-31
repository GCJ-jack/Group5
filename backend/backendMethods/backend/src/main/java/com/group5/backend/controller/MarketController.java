package com.group5.backend.controller;

import com.group5.backend.model.dto.FinnhubNewsItem;
import com.group5.backend.model.dto.QuoteResponse;
import com.group5.backend.service.FinnhubService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RequestMapping("/api/market")
@RestController
@CrossOrigin(origins = "*")
public class MarketController {

    private final FinnhubService finnhubService;

    public MarketController(FinnhubService finnhubService) {
        this.finnhubService = finnhubService;
    }

    @GetMapping("/news")
    public ResponseEntity<List<FinnhubNewsItem>> getMarketNews(
            @RequestParam(defaultValue = "general") String category,
            @RequestParam(defaultValue = "0") long minId
    ) {
        if (!List.of("general", "forex", "crypto", "merger").contains(category)) {
            return ResponseEntity.badRequest().build();
        }

        List<FinnhubNewsItem> news = finnhubService.getMarketNews(category, minId);
        return ResponseEntity.ok(news);
    }

    @GetMapping("/trending")
    public ResponseEntity<List<QuoteResponse>> getMarketTrending(@RequestParam(defaultValue = "AAPL,TSLA,NVDA") List<String> symbols){

        List<QuoteResponse> result = symbols.stream()
                .map(finnhubService::getQuote)
                .toList();

        return ResponseEntity.ok(result);
    }

}
