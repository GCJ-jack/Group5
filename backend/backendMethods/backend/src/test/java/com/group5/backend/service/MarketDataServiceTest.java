package com.group5.backend.service;

import com.group5.backend.model.dto.CandlePointResponse;
import com.group5.backend.model.dto.FollowingResponse;
import com.group5.backend.model.dto.MarketCandleResponse;
import com.group5.backend.model.dto.MarketQuoteItemRequest;
import com.group5.backend.model.dto.MarketQuoteResponse;
import com.group5.backend.model.dto.QuoteResponse;
import com.group5.backend.model.enums.AssetType;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.time.LocalDateTime;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class MarketDataServiceTest {

    @Mock
    private FinnhubService finnhubService;

    @Mock
    private TwelveDataService twelveDataService;

    @Mock
    private FollowingService followingService;

    @InjectMocks
    private MarketDataService marketDataService;

    @Test
    void returnsStockQuotesFromFinnhub() {
        when(finnhubService.getQuote("AAPL")).thenReturn(new QuoteResponse(
                "AAPL",
                245.25,
                -3.55,
                -1.43,
                247.0,
                243.0,
                246.0,
                248.8
        ));
        when(finnhubService.getName("AAPL")).thenReturn("Apple Inc.");

        List<MarketQuoteResponse> response = marketDataService.getQuotes(List.of(
                new MarketQuoteItemRequest("AAPL", AssetType.STOCK)
        ));

        assertEquals(1, response.size());
        assertEquals("AAPL", response.get(0).symbol());
        assertEquals("Apple Inc.", response.get(0).name());
        assertEquals(245.25, response.get(0).currentPrice());
        assertEquals(-3.55, response.get(0).change());
        assertEquals(-1.43, response.get(0).percentChange());
    }

    @Test
    void returnsForexQuotesFromLatestTwoCandles() {
        when(twelveDataService.getCandles("EUR/USD", "5d", "DAILY")).thenReturn(new MarketCandleResponse(
                "EUR/USD",
                "5d",
                "DAILY",
                List.of(
                        candle("2026-04-01T00:00:00Z", 1.1462),
                        candle("2026-04-02T00:00:00Z", 1.1479)
                )
        ));

        List<MarketQuoteResponse> response = marketDataService.getQuotes(List.of(
                new MarketQuoteItemRequest("EUR/USD", AssetType.FOREX)
        ));

        assertEquals("EUR/USD", response.get(0).displaySymbol());
        assertEquals(1.1479, response.get(0).currentPrice());
        assertEquals(0.0017, response.get(0).change(), 1e-9);
    }

    @Test
    void returnsCryptoQuotesUsingSlashProviderSymbolButKeepsDisplaySymbol() {
        when(twelveDataService.getCandles("BTC/USD", "5d", "DAILY")).thenReturn(new MarketCandleResponse(
                "BTC/USD",
                "5d",
                "DAILY",
                List.of(
                        candle("2026-04-01T00:00:00Z", 66737.18),
                        candle("2026-04-02T00:00:00Z", 67948.76)
                )
        ));

        List<MarketQuoteResponse> response = marketDataService.getQuotes(List.of(
                new MarketQuoteItemRequest("BTC-USD", AssetType.CRYPTO)
        ));

        assertEquals("BTC-USD", response.get(0).symbol());
        assertEquals("BTC-USD", response.get(0).displaySymbol());
        assertEquals(67948.76, response.get(0).currentPrice());
        assertEquals(1211.58, response.get(0).change(), 1e-9);
    }

    @Test
    void returnsFollowingQuotesForSavedWatchlist() {
        when(followingService.getAll()).thenReturn(List.of(
                new FollowingResponse(1L, "AAPL", "Apple Inc.", AssetType.STOCK, LocalDateTime.now())
        ));
        when(finnhubService.getQuote("AAPL")).thenReturn(new QuoteResponse(
                "AAPL",
                245.25,
                -3.55,
                -1.43,
                247.0,
                243.0,
                246.0,
                248.8
        ));
        when(finnhubService.getName("AAPL")).thenReturn("Apple Inc.");

        List<MarketQuoteResponse> response = marketDataService.getFollowingQuotes();

        assertEquals(1, response.size());
        assertEquals("AAPL", response.get(0).symbol());
        assertEquals(AssetType.STOCK, response.get(0).type());
    }

    private CandlePointResponse candle(String isoTimestamp, double close) {
        long timestamp = Instant.parse(isoTimestamp).toEpochMilli();
        return new CandlePointResponse(timestamp, close, close, close, close, close, 0L);
    }
}
