package com.group5.backend.service;

import com.group5.backend.model.PortfolioItem;
import com.group5.backend.model.PortfolioResponse;
import com.group5.backend.repository.PortfolioRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;

@Service
public class PortfolioService {

    private static final Set<String> ALLOWED_TYPES = Set.of("Equity", "Crypto", "ETF", "Bond", "Cash");

    @Autowired
    private PortfolioRepository repository;

    @Autowired
    private FinnhubService finnhubService;

    public List<PortfolioResponse> getAll() {
        return aggregateItems(repository.findAll()).stream()
                .map(group -> {
                    String ticker = group.canonicalItem().getTicker();
                    String type = resolveType(group.canonicalItem());

                    double averagePrice = group.items().stream()
                            .mapToDouble(item -> finnhubService.getPrice(item.getTicker()))
                            .average()
                            .orElse(0.0);

                    return new PortfolioResponse(
                            group.canonicalItem().getId(),
                            finnhubService.getName(ticker),
                            ticker,
                            type,
                            group.totalQuantity(),
                            averagePrice,
                            group.latestTime()
                    );
                })
                .toList();
    }

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

        String ticker = item.getTicker().trim().toUpperCase();
        String type = normalizeType(item.getType());
        LocalDateTime now = LocalDateTime.now();

        List<PortfolioItem> existingItems = findGroupedItems(ticker, type);

        if (existingItems.isEmpty()) {
            item.setTicker(ticker);
            item.setType(type);
            item.setTime(now);
            return repository.save(item);
        }

        PortfolioItem canonicalItem = existingItems.get(0);
        int mergedQuantity = existingItems.stream()
                .mapToInt(PortfolioItem::getQuantity)
                .sum() + item.getQuantity();

        canonicalItem.setTicker(ticker);
        canonicalItem.setType(type);
        canonicalItem.setQuantity(mergedQuantity);
        canonicalItem.setTime(now);

        PortfolioItem savedItem = repository.save(canonicalItem);
        deleteExtraItems(existingItems, savedItem.getId());
        return savedItem;
    }

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

        if (newQuantity == 0) {
            repository.deleteAll(groupedItems);
            return;
        }

        PortfolioItem canonicalItem = groupedItems.get(0);
        canonicalItem.setQuantity(newQuantity);
        canonicalItem.setTime(LocalDateTime.now());
        repository.save(canonicalItem);
        deleteExtraItems(groupedItems, canonicalItem.getId());
    }

    public double getTotalValue() {
        return repository.findAll().stream()
                .mapToDouble(item -> item.getQuantity() * finnhubService.getPrice(item.getTicker()))
                .sum();
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

    private record AggregatedPortfolioGroup(
            PortfolioItem canonicalItem,
            List<PortfolioItem> items,
            int totalQuantity,
            LocalDateTime latestTime
    ) {
    }
}
