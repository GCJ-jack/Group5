package com.group5.backend.service;

import com.group5.backend.model.dto.CandlePointResponse;
import com.group5.backend.model.dto.FollowingResponse;
import com.group5.backend.model.dto.MarketQuoteItemRequest;
import com.group5.backend.model.dto.MarketQuoteResponse;
import com.group5.backend.model.dto.MarketCandleResponse;
import com.group5.backend.model.dto.QuoteResponse;
import com.group5.backend.model.enums.AssetType;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Locale;
import java.util.Objects;

@Service
public class MarketDataService {

    private final FinnhubService finnhubService;
    private final TwelveDataService twelveDataService;
    private final FollowingService followingService;

    public MarketDataService(
            FinnhubService finnhubService,
            TwelveDataService twelveDataService,
            FollowingService followingService
    ) {
        this.finnhubService = finnhubService;
        this.twelveDataService = twelveDataService;
        this.followingService = followingService;
    }

    public List<MarketQuoteResponse> getQuotes(List<MarketQuoteItemRequest> requests) {
        if (requests == null || requests.isEmpty()) {
            return List.of();
        }

        return requests.stream()
                .map(this::getQuoteSafely)
                .filter(Objects::nonNull)
                .toList();
    }

    public List<MarketQuoteResponse> getFollowingQuotes() {
        return followingService.getAll().stream()
                .map(item -> getQuoteSafely(new MarketQuoteItemRequest(item.symbol(), item.type())))
                .filter(Objects::nonNull)
                .toList();
    }

    private MarketQuoteResponse getQuote(MarketQuoteItemRequest request) {
        String normalizedSymbol = normalizeSymbol(request.symbol());
        AssetType type = normalizeType(request.type());

        return switch (type) {
            case STOCK -> toStockQuote(normalizedSymbol);
            case CRYPTO -> toCandleQuote(normalizedSymbol, type);
            case FOREX -> toCandleQuote(normalizedSymbol, type);
        };
    }

    private MarketQuoteResponse getQuoteSafely(MarketQuoteItemRequest request) {
        try {
            return getQuote(request);
        } catch (Exception exception) {
            System.err.println("Failed to load market quote for symbol: " + request.symbol());
            return null;
        }
    }

    private MarketQuoteResponse toStockQuote(String symbol) {
        QuoteResponse quote = finnhubService.getQuote(symbol);
        String name = finnhubService.getName(symbol);

        return new MarketQuoteResponse(
                symbol,
                symbol,
                StringUtils.hasText(name) ? name : symbol,
                AssetType.STOCK,
                quote.currentPrice(),
                quote.change(),
                quote.percentChange()
        );
    }

    private MarketQuoteResponse toCandleQuote(String symbol, AssetType type) {
        String providerSymbol = normalizeSymbolForTwelveData(symbol, type);
        MarketCandleResponse candleResponse = twelveDataService.getCandles(providerSymbol, "5d", "DAILY");
        List<CandlePointResponse> candles = candleResponse.candles();

        if (candles == null || candles.isEmpty()) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_GATEWAY,
                    "No market data available for symbol: " + symbol
            );
        }

        CandlePointResponse latest = candles.get(candles.size() - 1);
        CandlePointResponse previous = candles.size() > 1 ? candles.get(candles.size() - 2) : latest;
        double currentPrice = latest.close();
        double change = currentPrice - previous.close();
        double percentChange = previous.close() == 0.0 ? 0.0 : (change / previous.close()) * 100.0;

        return new MarketQuoteResponse(
                symbol,
                formatDisplaySymbol(symbol, type),
                formatDisplaySymbol(symbol, type),
                type,
                currentPrice,
                change,
                percentChange
        );
    }

    private String normalizeSymbol(String symbol) {
        if (!StringUtils.hasText(symbol)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "symbol is required");
        }

        return symbol.trim().toUpperCase(Locale.ROOT);
    }

    private AssetType normalizeType(AssetType type) {
        if (type == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "type is required");
        }

        return type;
    }

    private String normalizeSymbolForTwelveData(String symbol, AssetType type) {
        if (type == AssetType.CRYPTO) {
            return symbol.replace("-", "/");
        }

        if (type == AssetType.FOREX) {
            return symbol.replace("_", "/").replace("-", "/");
        }

        return symbol;
    }

    private String formatDisplaySymbol(String symbol, AssetType type) {
        if (type == AssetType.FOREX) {
            return symbol.replace("_", "/").replace("-", "/");
        }

        return symbol;
    }
}
