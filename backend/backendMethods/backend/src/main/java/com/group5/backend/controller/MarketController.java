package com.group5.backend.controller;

import com.group5.backend.model.dto.FinnhubNewsItem;
import com.group5.backend.model.dto.MarketCandleResponse;
import com.group5.backend.model.dto.MarketQuoteItemRequest;
import com.group5.backend.model.dto.MarketQuoteResponse;
import com.group5.backend.model.dto.QuoteResponse;
import com.group5.backend.service.FinnhubService;
import com.group5.backend.service.MarketDataService;
import com.group5.backend.service.TwelveDataService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.format.DateTimeParseException;
import java.util.List;

@RequestMapping("/api/market")
@RestController
@CrossOrigin(origins = "*")
public class MarketController {

    private final FinnhubService finnhubService;
    private final TwelveDataService twelveDataService;
    private final MarketDataService marketDataService;

    public MarketController(
            FinnhubService finnhubService,
            TwelveDataService twelveDataService,
            MarketDataService marketDataService
    ) {
        this.finnhubService = finnhubService;
        this.twelveDataService = twelveDataService;
        this.marketDataService = marketDataService;
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

    @GetMapping("/company-news")
    public ResponseEntity<List<FinnhubNewsItem>> getCompanyNews(
            @RequestParam String symbol,
            @RequestParam String from,
            @RequestParam String to
    ) {
        try {
            LocalDate fromDate = LocalDate.parse(from);
            LocalDate toDate = LocalDate.parse(to);

            if (fromDate.isAfter(toDate)) {
                return ResponseEntity.badRequest().build();
            }

            return ResponseEntity.ok(finnhubService.getCompanyNews(symbol, fromDate, toDate));
        } catch (DateTimeParseException e) {
            return ResponseEntity.badRequest().build();
        }
    }

    @GetMapping("/trending")
    public ResponseEntity<List<QuoteResponse>> getMarketTrending(@RequestParam List<String> symbols) {
        if (symbols == null || symbols.isEmpty()) {
            return ResponseEntity.ok(List.of());
        }

        List<QuoteResponse> result = symbols.stream()
                .map(finnhubService::getQuote)
                .toList();

        return ResponseEntity.ok(result);
    }

    @PostMapping("/quotes")
    public ResponseEntity<List<MarketQuoteResponse>> getMarketQuotes(
            @RequestBody(required = false) List<MarketQuoteItemRequest> requests
    ) {
        return ResponseEntity.ok(marketDataService.getQuotes(requests));
    }

    @GetMapping("/following/quotes")
    public ResponseEntity<List<MarketQuoteResponse>> getFollowingQuotes() {
        return ResponseEntity.ok(marketDataService.getFollowingQuotes());
    }

    @GetMapping("/candles")
    public ResponseEntity<MarketCandleResponse> getCandles(
            @RequestParam String symbol,
            @RequestParam(defaultValue = "1mo") String range,
            @RequestParam(defaultValue = "DAILY") String interval
    ) {
        return ResponseEntity.ok(twelveDataService.getCandles(symbol, range, interval));
    }

}
