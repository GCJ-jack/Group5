package com.group5.backend.service;

import com.group5.backend.model.PortfolioTrade;
import com.group5.backend.model.dto.CandlePointResponse;
import com.group5.backend.model.dto.MarketCandleResponse;
import com.group5.backend.model.dto.PortfolioPerformancePointResponse;
import com.group5.backend.model.dto.PortfolioPerformanceResponse;
import com.group5.backend.model.enums.TradeType;
import com.group5.backend.repository.PortfolioRepository;
import com.group5.backend.repository.PortfolioTradeRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.server.ResponseStatusException;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PortfolioServicePerformanceTest {

    @Mock
    private PortfolioRepository portfolioRepository;

    @Mock
    private PortfolioTradeRepository tradeRepository;

    @Mock
    private FinnhubService finnhubService;

    @Mock
    private TwelveDataService twelveDataService;

    @InjectMocks
    private PortfolioService portfolioService;

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(
                portfolioService,
                "performanceClock",
                Clock.fixed(Instant.parse("2026-04-05T00:00:00Z"), ZoneOffset.UTC)
        );
    }

    @Test
    void returnsEmptyPointsWhenTradeHistoryIsEmpty() {
        when(tradeRepository.findAllByOrderByTradeTimeAscIdAsc()).thenReturn(List.of());

        PortfolioPerformanceResponse response = portfolioService.getPerformance("5d", "DAILY");

        assertEquals(List.of(), response.points());
    }

    @Test
    void replaysBuysAndSellsIntoDailyPerformancePoints() {
        when(tradeRepository.findAllByOrderByTradeTimeAscIdAsc()).thenReturn(List.of(
                trade("AAPL", TradeType.BUY, 10, 100.0, LocalDateTime.of(2026, 4, 1, 9, 30)),
                trade("AAPL", TradeType.BUY, 5, 110.0, LocalDateTime.of(2026, 4, 2, 9, 30)),
                trade("AAPL", TradeType.SELL, 8, 120.0, LocalDateTime.of(2026, 4, 4, 9, 30))
        ));
        when(twelveDataService.getCandles("AAPL", "5d", "DAILY")).thenReturn(new MarketCandleResponse(
                "AAPL",
                "5d",
                "DAILY",
                List.of(
                        candle("2026-04-01T00:00:00Z", 101.0),
                        candle("2026-04-02T00:00:00Z", 111.0),
                        candle("2026-04-03T00:00:00Z", 115.0),
                        candle("2026-04-04T00:00:00Z", 118.0),
                        candle("2026-04-05T00:00:00Z", 119.0)
                )
        ));

        PortfolioPerformanceResponse response = portfolioService.getPerformance("5d", "DAILY");

        assertEquals(5, response.points().size());

        PortfolioPerformancePointResponse lastPoint = response.points().get(4);
        assertEquals("2026-04-05T00:00:00Z", lastPoint.timestamp());
        assertEquals(833.0, lastPoint.marketValue());
        assertEquals(-590.0, lastPoint.cash());
        assertEquals(243.0, lastPoint.portfolioValue());
        assertEquals(723.3333333333334, lastPoint.netCost());
        assertEquals(109.66666666666663, lastPoint.unrealizedPnl());
    }

    @Test
    void carriesForwardLastKnownPriceWhenBucketPriceIsMissing() {
        when(tradeRepository.findAllByOrderByTradeTimeAscIdAsc()).thenReturn(List.of(
                trade("AAPL", TradeType.BUY, 2, 100.0, LocalDateTime.of(2026, 4, 1, 9, 30))
        ));
        when(twelveDataService.getCandles("AAPL", "5d", "DAILY")).thenReturn(new MarketCandleResponse(
                "AAPL",
                "5d",
                "DAILY",
                List.of(
                        candle("2026-04-01T00:00:00Z", 100.0),
                        candle("2026-04-03T00:00:00Z", 105.0),
                        candle("2026-04-05T00:00:00Z", 110.0)
                )
        ));

        PortfolioPerformanceResponse response = portfolioService.getPerformance("5d", "DAILY");

        PortfolioPerformancePointResponse secondPoint = response.points().get(1);
        assertEquals("2026-04-02T00:00:00Z", secondPoint.timestamp());
        assertEquals(200.0, secondPoint.marketValue());
        assertEquals(0.0, secondPoint.portfolioValue());
    }

    @Test
    void keepsReturningPointsAfterFullSellWithZeroMarketValue() {
        when(tradeRepository.findAllByOrderByTradeTimeAscIdAsc()).thenReturn(List.of(
                trade("AAPL", TradeType.BUY, 2, 100.0, LocalDateTime.of(2026, 4, 1, 9, 30)),
                trade("AAPL", TradeType.SELL, 2, 120.0, LocalDateTime.of(2026, 4, 3, 9, 30))
        ));
        when(twelveDataService.getCandles("AAPL", "5d", "DAILY")).thenReturn(new MarketCandleResponse(
                "AAPL",
                "5d",
                "DAILY",
                List.of(
                        candle("2026-04-01T00:00:00Z", 100.0),
                        candle("2026-04-02T00:00:00Z", 101.0),
                        candle("2026-04-03T00:00:00Z", 102.0),
                        candle("2026-04-04T00:00:00Z", 103.0),
                        candle("2026-04-05T00:00:00Z", 104.0)
                )
        ));

        PortfolioPerformanceResponse response = portfolioService.getPerformance("5d", "DAILY");

        PortfolioPerformancePointResponse lastPoint = response.points().get(4);
        assertEquals(0.0, lastPoint.marketValue());
        assertEquals(40.0, lastPoint.cash());
        assertEquals(40.0, lastPoint.portfolioValue());
        assertEquals(0.0, lastPoint.netCost());
        assertEquals(0.0, lastPoint.unrealizedPnl());
    }

    @Test
    void throwsWhenTradeHistoryContainsSellWithoutSufficientHoldings() {
        when(tradeRepository.findAllByOrderByTradeTimeAscIdAsc()).thenReturn(List.of(
                trade("AAPL", TradeType.SELL, 1, 120.0, LocalDateTime.of(2026, 4, 2, 9, 30))
        ));
        when(twelveDataService.getCandles("AAPL", "5d", "DAILY")).thenReturn(new MarketCandleResponse(
                "AAPL",
                "5d",
                "DAILY",
                List.of(candle("2026-04-02T00:00:00Z", 120.0))
        ));

        assertThrows(ResponseStatusException.class, () -> portfolioService.getPerformance("5d", "DAILY"));
    }

    private PortfolioTrade trade(String symbol, TradeType tradeType, int quantity, double price, LocalDateTime tradeTime) {
        PortfolioTrade trade = new PortfolioTrade();
        trade.setSymbol(symbol);
        trade.setTradeType(tradeType);
        trade.setQuantity(quantity);
        trade.setPrice(price);
        trade.setTradeTime(tradeTime);
        trade.setAssetType("Equity");
        return trade;
    }

    private CandlePointResponse candle(String isoTimestamp, double close) {
        long timestamp = Instant.parse(isoTimestamp).toEpochMilli();
        return new CandlePointResponse(timestamp, close, close, close, close, close, 0L);
    }
}
