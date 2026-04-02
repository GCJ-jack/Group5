package com.group5.backend.service;

import com.group5.backend.model.PortfolioItem;
import com.group5.backend.model.PortfolioTrade;
import com.group5.backend.model.PortfolioResponse;
import com.group5.backend.model.dto.CandlePointResponse;
import com.group5.backend.model.dto.PortfolioHistoryResponse;
import com.group5.backend.model.dto.PortfolioGainerResponse;
import com.group5.backend.model.dto.PortfolioPerformancePointResponse;
import com.group5.backend.model.dto.PortfolioPerformanceResponse;
import com.group5.backend.model.dto.QuoteResponse;
import com.group5.backend.repository.PortfolioRepository;
import com.group5.backend.repository.PortfolioTradeRepository;
import com.group5.backend.model.enums.TradeType;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.NavigableMap;
import java.util.Objects;
import java.util.Set;
import java.util.TreeMap;

import static org.springframework.http.HttpStatus.BAD_REQUEST;

@Service
public class PortfolioService {

    private static final Set<String> ALLOWED_TYPES = Set.of("Equity", "Crypto", "ETF", "Bond", "Cash");

    @Autowired
    private PortfolioRepository repository;

    @Autowired
    private PortfolioTradeRepository tradeRepository;

    @Autowired
    private FinnhubService finnhubService;

    @Autowired
    private TwelveDataService twelveDataService;

    private Clock performanceClock = Clock.systemUTC();

    public List<PortfolioResponse> getAll() {
        return aggregateItems(repository.findAll()).stream()
                .map(group -> {
                    String ticker = group.canonicalItem().getTicker();
                    String type = resolveType(group.canonicalItem());

                    double averagePrice = group.items().stream()
                            .mapToDouble(item -> finnhubService.getPrice(item.getTicker()))
                            .average()
                            .orElse(0.0);
                    double averageBuyPrice = calculateAverageBuyPrice(group.items(), group.totalQuantity());

                    return new PortfolioResponse(
                            group.canonicalItem().getId(),
                            finnhubService.getName(ticker),
                            ticker,
                            type,
                            group.totalQuantity(),
                            averageBuyPrice,
                            averagePrice,
                            group.latestTime()
                    );
                })
                .toList();
    }

    @Transactional
    public PortfolioItem add(PortfolioItem item) {
        if (item.getTicker() == null || item.getTicker().trim().isEmpty()) {
            throw new IllegalArgumentException("Ticker cannot be empty.");
        }

        if (item.getType() == null || item.getType().trim().isEmpty()) {
            throw new IllegalArgumentException("Type cannot be empty.");
        }

        if (item.getQuantity() <= 0) {
            throw new IllegalArgumentException("Quantity must be a positive integer.");
        }

        if (item.getBuyPrice() < 0) {
            throw new IllegalArgumentException("Buy price cannot be negative.");
        }

        String ticker = item.getTicker().trim().toUpperCase();
        String type = normalizeType(item.getType());
        LocalDateTime now = LocalDateTime.now();
        int tradeQuantity = item.getQuantity();
        double tradePrice = item.getBuyPrice();

        List<PortfolioItem> existingItems = findGroupedItems(ticker, type);

        if (existingItems.isEmpty()) {
            item.setTicker(ticker);
            item.setType(type);
            item.setTime(now);
            PortfolioItem savedItem = repository.save(item);
            recordTrade(ticker, type, TradeType.BUY, tradePrice, tradeQuantity, now);
            return savedItem;
        }

        PortfolioItem canonicalItem = existingItems.get(0);
        int existingQuantity = existingItems.stream()
                .mapToInt(PortfolioItem::getQuantity)
                .sum();
        int mergedQuantity = existingItems.stream()
                .mapToInt(PortfolioItem::getQuantity)
                .sum() + item.getQuantity();
        double weightedBuyPrice = calculateWeightedBuyPrice(
                existingQuantity,
                calculateAverageBuyPrice(existingItems, existingQuantity),
                item.getQuantity(),
                item.getBuyPrice()
        );

        canonicalItem.setTicker(ticker);
        canonicalItem.setType(type);
        canonicalItem.setQuantity(mergedQuantity);
        canonicalItem.setBuyPrice(weightedBuyPrice);
        canonicalItem.setTime(now);

        PortfolioItem savedItem = repository.save(canonicalItem);
        deleteExtraItems(existingItems, savedItem.getId());
        recordTrade(ticker, type, TradeType.BUY, tradePrice, tradeQuantity, now);
        return savedItem;
    }

    @Transactional
    public void sell(Long id, int sellQty) {
        PortfolioItem item = repository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Asset not found."));

        if (sellQty <= 0) {
            throw new IllegalArgumentException("Sell quantity must be a positive integer.");
        }

        String type = resolveType(item);
        List<PortfolioItem> groupedItems = findGroupedItems(item.getTicker(), type);
        int currentQuantity = groupedItems.stream()
                .mapToInt(PortfolioItem::getQuantity)
                .sum();

        if (sellQty > currentQuantity) {
            throw new IllegalArgumentException("Sell quantity cannot be greater than current holdings.");
        }

        int newQuantity = currentQuantity - sellQty;
        LocalDateTime now = LocalDateTime.now();
        double sellPrice = finnhubService.getPrice(item.getTicker());

        if (newQuantity == 0) {
            repository.deleteAll(groupedItems);
            recordTrade(item.getTicker(), type, TradeType.SELL, sellPrice, sellQty, now);
            return;
        }

        PortfolioItem canonicalItem = groupedItems.get(0);
        canonicalItem.setQuantity(newQuantity);
        canonicalItem.setTime(now);
        repository.save(canonicalItem);
        deleteExtraItems(groupedItems, canonicalItem.getId());
        recordTrade(item.getTicker(), type, TradeType.SELL, sellPrice, sellQty, now);
    }

    public double getTotalValue() {
        return repository.findAll().stream()
                .mapToDouble(item -> item.getQuantity() * finnhubService.getPrice(item.getTicker()))
                .sum();
    }

    public List<PortfolioGainerResponse> getTopGainers(int limit) {
        return aggregateItems(repository.findAll()).stream()
                .map(group -> toPortfolioGainer(group, calculateAverageBuyPrice(group.items(), group.totalQuantity())))
                .sorted(Comparator
                        .comparingDouble(PortfolioGainerResponse::profitLossPercent)
                        .reversed()
                        .thenComparing(Comparator.comparingDouble(PortfolioGainerResponse::profitLossAmount).reversed()))
                .limit(Math.max(limit, 1))
                .toList();
    }

    public List<PortfolioHistoryResponse> getHistory() {
        return tradeRepository.findAllByOrderByTradeTimeDescIdDesc().stream()
                .map(trade -> new PortfolioHistoryResponse(
                        trade.getId(),
                        trade.getStockName(),
                        trade.getSymbol(),
                        trade.getAssetType(),
                        trade.getTradeType(),
                        trade.getPrice(),
                        trade.getQuantity(),
                        trade.getTotalAmount(),
                        trade.getTradeTime()
                ))
                .toList();
    }

    public PortfolioPerformanceResponse getPerformance(String range, String interval) {
        String normalizedRange = normalizePerformanceRange(range);
        String normalizedInterval = normalizePerformanceInterval(interval);
        List<PortfolioTrade> trades = tradeRepository.findAllByOrderByTradeTimeAscIdAsc();

        if (trades.isEmpty()) {
            return new PortfolioPerformanceResponse(List.of());
        }

        LocalDate endDate = LocalDate.now(performanceClock);
        LocalDate startDate = resolvePerformanceStartDate(normalizedRange, endDate, trades);
        List<LocalDate> bucketDates = buildBucketDates(startDate, endDate, normalizedInterval);
        Map<String, NavigableMap<LocalDate, Double>> priceHistoryBySymbol = loadPriceHistoryBySymbol(
                extractSymbols(trades),
                normalizedRange,
                normalizedInterval
        );
        Map<String, HoldingState> holdingsBySymbol = new LinkedHashMap<>();
        List<PortfolioPerformancePointResponse> points = new ArrayList<>(bucketDates.size());
        int tradeIndex = 0;
        double cash = 0.0;

        try {
            for (LocalDate bucketDate : bucketDates) {
                LocalDateTime bucketCutoff = bucketDate.atTime(LocalTime.MAX);

                while (tradeIndex < trades.size() && !trades.get(tradeIndex).getTradeTime().isAfter(bucketCutoff)) {
                    cash = applyTrade(trades.get(tradeIndex), holdingsBySymbol, cash);
                    tradeIndex++;
                }

                double marketValue = 0.0;
                double netCost = 0.0;

                for (Map.Entry<String, HoldingState> entry : holdingsBySymbol.entrySet()) {
                    HoldingState holding = entry.getValue();

                    if (holding.quantity() <= 0) {
                        continue;
                    }

                    double historicalPrice = resolveHistoricalPrice(
                            entry.getKey(),
                            bucketDate,
                            priceHistoryBySymbol.get(entry.getKey())
                    );

                    marketValue += holding.quantity() * historicalPrice;
                    netCost += holding.netCost();
                }

                points.add(new PortfolioPerformancePointResponse(
                        bucketDate.atStartOfDay(ZoneOffset.UTC).toInstant().toString(),
                        marketValue + cash,
                        marketValue,
                        cash,
                        netCost,
                        marketValue - netCost
                ));
            }
        } catch (IllegalStateException exception) {
            throw new ResponseStatusException(
                    BAD_REQUEST,
                    "Portfolio trade history is inconsistent and cannot be replayed: " + exception.getMessage(),
                    exception
            );
        }

        return new PortfolioPerformanceResponse(points);
    }

    private Set<String> extractSymbols(List<PortfolioTrade> trades) {
        return trades.stream()
                .map(PortfolioTrade::getSymbol)
                .filter(Objects::nonNull)
                .map(String::trim)
                .filter(symbol -> !symbol.isEmpty())
                .map(String::toUpperCase)
                .collect(java.util.stream.Collectors.toSet());
    }

    private double applyTrade(PortfolioTrade trade, Map<String, HoldingState> holdingsBySymbol, double cash) {
        String symbol = trade.getSymbol().trim().toUpperCase();
        double tradeAmount = trade.getPrice() * trade.getQuantity();

        if (trade.getTradeType() == TradeType.BUY) {
            HoldingState existing = holdingsBySymbol.getOrDefault(symbol, HoldingState.empty(trade.getAssetType()));
            holdingsBySymbol.put(symbol, new HoldingState(
                    existing.quantity() + trade.getQuantity(),
                    existing.netCost() + tradeAmount,
                    existing.assetType()
            ));
            return cash - tradeAmount;
        }

        if (trade.getTradeType() == TradeType.SELL) {
            HoldingState existing = holdingsBySymbol.get(symbol);

            if (existing == null || existing.quantity() < trade.getQuantity()) {
                throw new IllegalStateException("Trade history contains a sell before sufficient holdings for symbol: " + symbol);
            }

            double costReduction = existing.netCost() * ((double) trade.getQuantity() / existing.quantity());
            int remainingQuantity = existing.quantity() - trade.getQuantity();
            double remainingNetCost = Math.max(0.0, existing.netCost() - costReduction);

            if (remainingQuantity == 0) {
                holdingsBySymbol.remove(symbol);
            } else {
                holdingsBySymbol.put(symbol, new HoldingState(
                        remainingQuantity,
                        remainingNetCost,
                        existing.assetType()
                ));
            }

            return cash + tradeAmount;
        }

        throw new IllegalStateException("Unsupported trade type in history: " + trade.getTradeType());
    }

    private Map<String, NavigableMap<LocalDate, Double>> loadPriceHistoryBySymbol(
            Set<String> symbols,
            String range,
            String interval
    ) {
        Map<String, NavigableMap<LocalDate, Double>> priceHistoryBySymbol = new LinkedHashMap<>();

        for (String symbol : symbols) {
            NavigableMap<LocalDate, Double> prices = new TreeMap<>();

            try {
                List<CandlePointResponse> candles = twelveDataService.getCandles(symbol, range, interval).candles();

                for (CandlePointResponse candle : candles) {
                    LocalDate candleDate = Instant.ofEpochMilli(candle.timestamp())
                            .atZone(ZoneOffset.UTC)
                            .toLocalDate();
                    prices.put(candleDate, candle.close());
                }
            } catch (Exception e) {
                System.out.println("Failed to load historical prices for portfolio performance symbol: " + symbol);
            }

            priceHistoryBySymbol.put(symbol, prices);
        }

        return priceHistoryBySymbol;
    }

    private double resolveHistoricalPrice(String symbol, LocalDate bucketDate, NavigableMap<LocalDate, Double> prices) {
        if (prices == null || prices.isEmpty()) {
            throw new IllegalStateException("Missing historical prices for held symbol: " + symbol);
        }

        Map.Entry<LocalDate, Double> entry = prices.floorEntry(bucketDate);

        if (entry == null) {
            throw new IllegalStateException("No historical price on or before " + bucketDate + " for held symbol: " + symbol);
        }

        return entry.getValue();
    }

    private LocalDate resolvePerformanceStartDate(String range, LocalDate endDate, List<PortfolioTrade> trades) {
        return switch (range) {
            case "5d" -> endDate.minusDays(4);
            case "1mo" -> endDate.minusMonths(1).plusDays(1);
            case "3mo" -> endDate.minusMonths(3).plusDays(1);
            case "6mo" -> endDate.minusMonths(6).plusDays(1);
            case "1y" -> endDate.minusYears(1).plusDays(1);
            case "2y" -> endDate.minusYears(2).plusDays(1);
            case "5y" -> endDate.minusYears(5).plusDays(1);
            case "10y" -> endDate.minusYears(10).plusDays(1);
            case "max" -> trades.stream()
                    .map(PortfolioTrade::getTradeTime)
                    .filter(Objects::nonNull)
                    .map(LocalDateTime::toLocalDate)
                    .min(LocalDate::compareTo)
                    .orElse(endDate);
            default -> throw new IllegalArgumentException("Unsupported performance range: " + range);
        };
    }

    private List<LocalDate> buildBucketDates(LocalDate startDate, LocalDate endDate, String interval) {
        List<LocalDate> bucketDates = new ArrayList<>();
        LocalDate cursor = startDate;

        while (!cursor.isAfter(endDate)) {
            bucketDates.add(cursor);
            cursor = switch (interval) {
                case "DAILY" -> cursor.plusDays(1);
                case "WEEKLY" -> cursor.plusWeeks(1);
                case "MONTHLY" -> cursor.plusMonths(1);
                default -> throw new IllegalArgumentException("Unsupported performance interval: " + interval);
            };
        }

        if (bucketDates.isEmpty() || !bucketDates.get(bucketDates.size() - 1).equals(endDate)) {
            bucketDates.add(endDate);
        }

        return bucketDates;
    }

    private String normalizePerformanceRange(String range) {
        if (range == null || range.isBlank()) {
            return "1mo";
        }

        String normalized = range.trim().toLowerCase();
        return switch (normalized) {
            case "5d", "1mo", "3mo", "6mo", "1y", "2y", "5y", "10y", "max" -> normalized;
            default -> throw new IllegalArgumentException(
                    "range must be one of: 5d, 1mo, 3mo, 6mo, 1y, 2y, 5y, 10y, max"
            );
        };
    }

    private String normalizePerformanceInterval(String interval) {
        if (interval == null || interval.isBlank()) {
            return "DAILY";
        }

        String normalized = interval.trim().toUpperCase();
        return switch (normalized) {
            case "DAILY", "WEEKLY", "MONTHLY" -> normalized;
            default -> throw new IllegalArgumentException("interval must be DAILY, WEEKLY, or MONTHLY");
        };
    }

    private String normalizeType(String type) {
        String normalized = type.trim();

        if (normalized.isEmpty()) {
            throw new IllegalArgumentException("Type cannot be empty.");
        }

        String canonical = switch (normalized.toLowerCase()) {
            case "equity" -> "Equity";
            case "equities" -> "Equity";
            case "crypto" -> "Crypto";
            case "etf" -> "ETF";
            case "bond" -> "Bond";
            case "cash" -> "Cash";
            case "fixed income" -> "Bond";
            default -> throw new IllegalArgumentException("Type must be one of: Equity, Crypto, ETF, Bond, Cash.");
        };

        if (!ALLOWED_TYPES.contains(canonical)) {
            throw new IllegalArgumentException("Type must be one of: Equity, Crypto, ETF, Bond, Cash.");
        }

        return canonical;
    }

    private String resolveType(PortfolioItem item) {
        String type = item.getType();
        if (type == null || type.isBlank()) {
            return finnhubService.getType(item.getTicker());
        }
        return normalizeType(type);
    }

    private PortfolioGainerResponse toPortfolioGainer(AggregatedPortfolioGroup group, double averageBuyPrice) {
        String ticker = group.canonicalItem().getTicker();
        QuoteResponse quote = finnhubService.getQuote(ticker);
        double currentPrice = quote.currentPrice();
        double profitLossAmount = (currentPrice - averageBuyPrice) * group.totalQuantity();
        double profitLossPercent = averageBuyPrice > 0
                ? ((currentPrice - averageBuyPrice) / averageBuyPrice) * 100
                : 0.0;

        return new PortfolioGainerResponse(
                group.canonicalItem().getId(),
                finnhubService.getName(ticker),
                ticker,
                resolveType(group.canonicalItem()),
                group.totalQuantity(),
                averageBuyPrice,
                currentPrice,
                profitLossAmount,
                profitLossPercent,
                quote.percentChange()
        );
    }

    private double calculateAverageBuyPrice(List<PortfolioItem> items, int totalQuantity) {
        if (totalQuantity <= 0) {
            return 0.0;
        }

        return items.stream()
                .mapToDouble(item -> item.getBuyPrice() * item.getQuantity())
                .sum() / totalQuantity;
    }

    private double calculateWeightedBuyPrice(int existingQuantity, double existingBuyPrice, int addedQuantity, double addedBuyPrice) {
        int totalQuantity = existingQuantity + addedQuantity;
        if (totalQuantity <= 0) {
            return 0.0;
        }

        return ((existingQuantity * existingBuyPrice) + (addedQuantity * addedBuyPrice)) / totalQuantity;
    }

    private List<AggregatedPortfolioGroup> aggregateItems(List<PortfolioItem> items) {
        Map<String, List<PortfolioItem>> groupedItems = new LinkedHashMap<>();

        for (PortfolioItem item : items) {
            String key = buildGroupKey(item.getTicker(), resolveType(item));
            groupedItems.computeIfAbsent(key, ignored -> new ArrayList<>()).add(item);
        }

        return groupedItems.values().stream()
                .map(group -> {
                    List<PortfolioItem> sortedItems = sortById(group);
                    PortfolioItem canonicalItem = sortedItems.get(0);
                    int totalQuantity = sortedItems.stream()
                            .mapToInt(PortfolioItem::getQuantity)
                            .sum();
                    LocalDateTime latestTime = sortedItems.stream()
                            .map(PortfolioItem::getTime)
                            .filter(Objects::nonNull)
                            .max(LocalDateTime::compareTo)
                            .orElse(null);

                    return new AggregatedPortfolioGroup(canonicalItem, sortedItems, totalQuantity, latestTime);
                })
                .toList();
    }

    private List<PortfolioItem> sortById(List<PortfolioItem> items) {
        return items.stream()
                .sorted(Comparator.comparing(PortfolioItem::getId))
                .toList();
    }

    private List<PortfolioItem> findGroupedItems(String ticker, String type) {
        return sortById(repository.findAllByTicker(ticker).stream()
                .filter(item -> resolveType(item).equals(type))
                .toList());
    }

    private void deleteExtraItems(List<PortfolioItem> items, Long keepId) {
        List<PortfolioItem> extras = items.stream()
                .filter(item -> !item.getId().equals(keepId))
                .toList();

        if (!extras.isEmpty()) {
            repository.deleteAll(extras);
        }
    }

    private String buildGroupKey(String ticker, String type) {
        return ticker + "|" + type;
    }

    private void recordTrade(String ticker, String assetType, TradeType tradeType, double price, int quantity, LocalDateTime tradeTime) {
        PortfolioTrade trade = new PortfolioTrade();
        trade.setSymbol(ticker);
        trade.setStockName(finnhubService.getName(ticker));
        trade.setAssetType(assetType);
        trade.setTradeType(tradeType);
        trade.setPrice(price);
        trade.setQuantity(quantity);
        trade.setTotalAmount(price * quantity);
        trade.setTradeTime(tradeTime);
        tradeRepository.save(trade);
    }

    private record AggregatedPortfolioGroup(
            PortfolioItem canonicalItem,
            List<PortfolioItem> items,
            int totalQuantity,
            LocalDateTime latestTime
    ) {
    }

    private record HoldingState(
            int quantity,
            double netCost,
            String assetType
    ) {
        private static HoldingState empty(String assetType) {
            return new HoldingState(0, 0.0, assetType);
        }
    }
}
